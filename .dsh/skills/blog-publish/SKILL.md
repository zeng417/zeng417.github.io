---
name: blog-publish
description: 为 zeng417.github.io（Jekyll 博客）起草中文技术文章 → 在对话里让用户审阅 → 用户明确同意后才提交并推送到 GitHub Pages 发布
whenToUse: 用户说「写篇博客 / 发文章到博客 / 更新 zeng417.github.io / 帮我把这个整理成文章」，或给出一个主题要求产出可直接发布的博文时
---

# 博客发布：起草 → 审阅 → 发布

仓库：`https://github.com/zeng417/zeng417.github.io`（Jekyll + GitHub Actions 自动部署到 GitHub Pages）。

## 铁律（先读，违反即失败）

1. **未经用户在当前对话里明确同意，绝不 push。** 「先让我看」是流程的一部分，不是客套。
2. 草稿阶段只写本地文件，**不 commit、不 push、不改 `_config.yml`**。
3. 把草稿**全文**贴给用户看（不是摘要、不是"已生成，要我发吗"），并附上元信息：标题、分类、slug、预计 URL、行数/字数。
4. 用户说「改 / 再口语一点 / 换个标题」→ 改同一个草稿文件，重新贴出改动（或完整重贴），再等确认。
5. 只有明确的发布指令才算批准：`发吧` / `可以发` / `上传` / `push` / `没问题，发布`。含糊的「还行」「不错」**不算**，要追问一句「要现在发布吗？」。
6. 失败就如实报错并贴原始报错文本，绝不谎报已发布。

## 1. 准备工作副本

工作副本固定在 `/home/zeng/blog`（已建好，origin 指向 `git@ssh.github.com:zeng417/zeng417.github.io.git`）：

```bash
cd /home/zeng/blog
git status --short            # 有未提交改动先问用户怎么处理
GIT_SSH_COMMAND="ssh -p 443 -o ConnectTimeout=15" git pull --rebase --autostash
```

不存在时才 clone：先用 HTTPS 克隆（稳定），再把 remote 改成 SSH 的 443 地址：

```bash
git clone --depth 20 https://github.com/zeng417/zeng417.github.io.git /home/zeng/blog
cd /home/zeng/blog && git remote set-url origin git@ssh.github.com:zeng417/zeng417.github.io.git
```

这台机器上 **SSH 22 端口不通**，写操作必须走 `ssh.github.com:443`。该网络对 GitHub 抖动很大，**任何 git 网络命令都要带 `GIT_SSH_COMMAND="ssh -p 443 -o ConnectTimeout=15"` 并重试 3~4 次**；偶发 `Connection closed by ... port 443` / `无法读取远程仓库` 是常态，不是权限问题（实测第 3 次重试就成功）。

## 2. 写草稿到 `_drafts/`

草稿放 `_drafts/<slug>.md`（Jekyll 的 draft 不参与构建，天然挡住误发布）；批准后才移入 `_posts/`。这样即使误 commit 也不会出现在网站上。

- `<slug>`：英文小写连字符，取自标题语义，例如 `ros2-nav2-tuning`。
- frontmatter 固定五项，顺序也照这个来：

```yaml
---
layout: post
title: "中文标题：可以用冒号加副标题"
date: 2026-11-07 10:00:00 +0800
categories: ROS2
description: "一句话说清这篇讲什么、读者能得到什么，60~90 字。"
---
```

- 可选第六项 `image: "/assets/images/xxx.jpg"`：封面图，首页卡片和文章页头图会用（2026-11 改版新增）。没有合适图片就别加，比放一张凑数的强。
- `date` 用**今天**的日期，时间固定 `10:00:00 +0800`（全站既有文章都是这个写法），时区 Asia/Shanghai。
- `categories` 从既有分类里选：`ROS2`、`机器人`、`机器学习`、`深度学习`、`强化学习`、`物联网`。确实不合适再新起一个简短中文分类，并在给用户看草稿时说明「新增分类 X」。
- 中文正文里用中文引号；文件名严格 `YYYY-MM-DD-<slug>.md`。
- **绝对不要写 BOM**（仓库里 `2026-10-03` 那篇带 BOM，frontmatter 解析是坏的，别学）。

正文目标 1600~15000 字（既有文章区间），200~400 行；写法见 `references/style.md`（本 skill 目录下），动笔前读一遍。

## 3. 自检

```bash
cd /home/zeng/blog
python3 /home/zeng/blog/.dsh/skills/blog-publish/scripts/validate.py _drafts/<slug>.md
```

有 error 必须改到通过；warning 可自行判断。检查项包括 BOM、frontmatter 完整性、日期格式、description 长度、代码块闭合、正文长度、标题层级。

## 4. 给用户审阅（关键卡点）

把文章全文贴进对话，然后给一行元信息，例如：

```
标题：ROS 2 Nav2 调参踩坑记录
分类：ROS2 ｜ slug：ros2-nav2-tuning ｜ 268 行 ｜ 预计 https://zeng417.github.io/posts/ros2-nav2-tuning/
```

然后**停下来等**。不要在同一条消息里顺手 push。也不要替用户做「已经够好了，直接发」的判断。

## 5. 发布（仅在明确批准后）

```bash
cd /home/zeng/blog
python3 /home/zeng/blog/.dsh/skills/blog-publish/scripts/validate.py _drafts/<slug>.md   # 再验一次
bash /home/zeng/blog/.dsh/skills/blog-publish/scripts/publish.sh _drafts/<slug>.md
```

`publish.sh` 会：补当天日期 → 移到 `_posts/` → 校验 → commit（消息格式 `feat: 新增第N篇文章：<标题>（M月D日）`，N = `_posts` 现有篇数 + 1）→ 带重试推送 → 打印远端 SHA。

> 本仓库（以及所有提交）严格遵循 Conventional Commits 中文版：`<type>: <描述>`，关联 issue 时末尾加 `(#编号)`。
> type 取值：`feat` 新功能 / `fix` 修 bug / `docs` 仅文档 / `style` 格式（不改逻辑）/ `refactor` 重构 / `perf` 性能 / `test` 测试 / `chore` 构建依赖工具 / `revert` 回滚。
> 例：`fix: 修复 2026-10-03 文章 BOM 导致 frontmatter 解析失败`、`perf: 优化首页卡片图片加载`。手写 commit 消息时也照这个来，别用「更新」「修改」这类空话。

## 6. 确认上线

push 成功后 Actions 约 1~2 分钟构建。轮询文章页直到 200：

```bash
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://zeng417.github.io/posts/<slug>/")
  echo "try $i: $code"; [ "$code" = "200" ] && break; sleep 15
done
```

### 6.1 顺便验评论区

文章页底部有 giscus 评论框（`_includes/comments.html`），配置在 `_config.yml` 的 `comments:` 段。文章 200 之后跑一次：

```bash
bash /home/zeng/blog/.dsh/skills/blog-publish/scripts/check-comments.sh "https://zeng417.github.io/posts/<slug>/"
```

它做三件事：确认页面里有 giscus 脚本 → 调 `https://giscus.app/api/discussions/categories?repo=<repo>` 校对 `repo_id` → 确认 `category_id` 还存在于该仓库的讨论分类里。
退出码：`0` 正常；`1` 页面没挂评论（多为 `comments.enabled: false`）；`2` 页面配置与服务端对不上（repo_id 过期、分类被改名或删除）。

出现 `2` 时不要自己猜新 id —— 用这条命令重新取，改 `_config.yml` 再提交：

```bash
curl -s "https://giscus.app/api/discussions/categories?repo=zeng417/zeng417.github.io" | python3 -m json.tool
```

（`repositoryId` 就是 `repo_id`，`categories[].id` 就是 `category_id`；当前用的是 `General`，对外开放讨论。）

成功后回报：文章 URL、commit SHA、评论区是否正常、Actions 页面 `https://github.com/zeng417/zeng417.github.io/actions`。超过 5 分钟仍 404，就把 Actions 链接给用户并说明可能在构建或构建失败，**不要编造原因**。

## 7. 回滚

用户要撤下文章时：`git revert <sha>`（或删掉 `_posts/` 里那篇）→ 同样带重试推送。不要 force push，不要擅自改写历史。

## 常见坑

- `_site/` 已在 `.gitignore`，不要提交构建产物。
- `permalinks` 是 `/posts/:title/`，`:title` 取文件名里的 slug（不含日期）。
- 仓库已有 7 篇文章，日期是连续的周更节奏；新文章日期用当天即可，不要为了排版去改历史文章的日期。
- push 报 `Connection closed`：重试；报 `Permission denied (publickey)`：停下来告诉用户 SSH key 需要重新配置，不要反复试。
- 评论区空白/一直转圈：先跑 `scripts/check-comments.sh <页面URL>`，别急着改模板。`publish.sh` 发布后会自动跑一次，可用 `SKIP_COMMENT_CHECK=1` 跳过。
