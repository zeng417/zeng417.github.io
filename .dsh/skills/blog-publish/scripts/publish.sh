#!/usr/bin/env bash
# 把 _drafts/<slug>.md 发布到 _posts/ 并推送到 GitHub Pages。
# 用法: publish.sh _drafts/<slug>.md
# 环境变量: BLOG_REPO(默认 /home/zeng/blog) DRY_RUN=1(只做本地步骤，不 commit/push)
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${BLOG_REPO:-/home/zeng/blog}"
SSH_CMD="ssh -p 443 -o ConnectTimeout=15"

die() { echo "error: $*" >&2; exit 1; }

net() {
  local i
  for i in 1 2 3 4; do
    if GIT_SSH_COMMAND="$SSH_CMD" "$@"; then return 0; fi
    echo "  (网络失败，第 $i 次重试…)" >&2
    sleep 3
  done
  return 1
}

[ $# -eq 1 ] || die "用法: publish.sh _drafts/<slug>.md"
DRAFT="$1"
[ -f "$DRAFT" ] || die "草稿不存在: $DRAFT"
[ -d "$REPO/.git" ] || die "仓库不存在: $REPO（先 clone）"
cd "$REPO"

case "$DRAFT" in
  _drafts/*.md) ;;
  *) die "草稿必须位于 _drafts/ 下，当前: $DRAFT" ;;
esac

SLUG="$(basename "$DRAFT" .md)"
TODAY="$(TZ=Asia/Shanghai date +%F)"

python3 "$SKILL_DIR/scripts/validate.py" "$DRAFT" || die "草稿校验未通过，先修问题"

TITLE="$(python3 - "$DRAFT" <<'PY'
import sys, re
for line in open(sys.argv[1], encoding='utf-8'):
    if line.startswith('title:'):
        print(line.split(':', 1)[1].strip().strip('"').strip("'"))
        break
PY
)"
[ -n "$TITLE" ] || die "读不到 title"

# 日期统一为发布日 10:00:00 +0800
python3 - "$DRAFT" "$TODAY" <<'PY'
import sys, re
p, today = sys.argv[1], sys.argv[2]
src = open(p, encoding='utf-8').read()
new = re.sub(r'(?m)^date:.*$', f'date: {today} 10:00:00 +0800', src, count=1)
if new == src and not re.search(r'(?m)^date:', new):
    new = new.replace('---\n', f'---\ndate: {today} 10:00:00 +0800\n', 1)
open(p, 'w', encoding='utf-8', newline='\n').write(new)
PY

TARGET="_posts/${TODAY}-${SLUG}.md"
[ ! -e "$TARGET" ] || die "目标已存在: $TARGET"
mv "$DRAFT" "$TARGET"
python3 "$SKILL_DIR/scripts/validate.py" "$TARGET" || die "成稿校验未通过（文件已移到 $TARGET）"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN: 已生成 $TARGET，未提交；回滚: mv $TARGET _drafts/${SLUG}.md"
  exit 0
fi

REMOTE="$(git remote get-url origin 2>/dev/null || echo '')"
case "$REMOTE" in
  git@ssh.github.com:*|git@github.com:*) ;;
  *) git remote set-url origin git@ssh.github.com:zeng417/zeng417.github.io.git ;;
esac

net git pull --rebase --autostash || die "拉取远端失败（网络）"

COUNT="$(ls _posts/*.md | wc -l | tr -d ' ')"
SHORT="$(printf '%s' "$TITLE" | sed 's/[：:].*//' | cut -c1-40)"
M="$(printf '%s' "$TODAY" | cut -c6-7 | sed 's/^0//')"
D="$(printf '%s' "$TODAY" | cut -c9-10 | sed 's/^0//')"
MSG="feat: 新增第${COUNT}篇文章：${SHORT}（${M}月${D}日）"

git add "$TARGET"
git commit -m "$MSG"

net git push origin HEAD:main || {
  echo "error: 推送失败。本地已提交，重新推送: cd $REPO && GIT_SSH_COMMAND=\"$SSH_CMD\" git push origin HEAD:main" >&2
  exit 1
}

echo "已发布: $TARGET"
echo "commit: $(git rev-parse --short HEAD)"
echo "url: https://zeng417.github.io/posts/${SLUG}/"

# 等页面 200 之后校验评论区（失败只警告，不算发布失败）
CHECK="$(dirname "$0")/check-comments.sh"
if [ -x "$CHECK" ] && [ "${SKIP_COMMENT_CHECK:-0}" != "1" ]; then
  for _ in $(seq 1 12); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://zeng417.github.io/posts/${SLUG}/")
    [ "$code" = "200" ] && break
    sleep 10
  done
  echo "--- 评论区自检"
  bash "$CHECK" "https://zeng417.github.io/posts/${SLUG}/" || echo "warning: 评论区自检未通过，见上面的 error 提示"
fi
