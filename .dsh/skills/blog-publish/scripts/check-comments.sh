#!/usr/bin/env bash
# 校验某个页面上的 giscus 评论区是否真的可用。
# 用法: check-comments.sh https://zeng417.github.io/posts/<slug>/
# 退出码: 0 正常 / 1 页面没挂评论 / 2 页面配置与 giscus 服务端对不上
set -uo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "用法: $0 <页面URL>" >&2
  exit 64
fi

html="$(curl -sL --max-time 25 "$URL")" || { echo "error: 抓取页面失败 $URL" >&2; exit 1; }

if ! grep -q 'giscus.app/client.js' <<<"$html"; then
  echo "error: 页面里没有 giscus 脚本 —— 检查 _config.yml 的 comments.enabled / repo_id / category_id" >&2
  exit 1
fi

get_attr() { grep -o "data-$1=\"[^\"]*\"" <<<"$html" | head -1 | cut -d'"' -f2; }

repo="$(get_attr repo)"
repo_id="$(get_attr repo-id)"
category="$(get_attr category)"
category_id="$(get_attr category-id)"
mapping="$(get_attr mapping)"

[ -n "$repo" ] && [ -n "$repo_id" ] && [ -n "$category_id" ] || {
  echo "error: 页面里的 giscus 参数不全（repo/repo-id/category-id）" >&2
  exit 1
}

api="$(curl -s --max-time 25 "https://giscus.app/api/discussions/categories?repo=${repo}")" || {
  echo "error: 调用 giscus 接口失败" >&2
  exit 1
}

case "$api" in
  *'"error"'*)
    echo "error: giscus 接口返回错误 —— $api" >&2
    echo "        通常是 repo 名写错，或 giscus app 没装到这个仓库" >&2
    exit 2
    ;;
esac

api_repo_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("repositoryId",""))' <<<"$api" 2>/dev/null)"
[ "$api_repo_id" = "$repo_id" ] || {
  echo "error: repo_id 对不上（页面 $repo_id / 服务端 $api_repo_id），去 _config.yml 更新" >&2
  exit 2
}

if ! printf '%s' "$api" | python3 -c '
import json, sys
want = sys.argv[1]
data = json.load(sys.stdin)
ids = {c["id"] for c in data.get("categories", [])}
sys.exit(0 if want in ids else 1)
' "$category_id"
then
  echo "error: category_id $category_id 不在该仓库的讨论分类里（分类被删了或改过名）" >&2
  exit 2
fi

echo "OK: $URL"
echo "    repo=$repo repo_id=$repo_id category=$category mapping=${mapping:-pathname}"
echo "    评论区挂载正常，登录 GitHub 即可发言"
