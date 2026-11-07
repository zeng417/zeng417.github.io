#!/usr/bin/env python3
"""校验 zeng417.github.io 的博文草稿/成稿。

用法: python3 validate.py <file.md>
退出码 1 表示有 error。
"""
import re
import sys
from pathlib import Path

REQUIRED = ["layout", "title", "date", "categories", "description"]
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+0800$")
NAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})?-?([a-z0-9]+(?:-[a-z0-9]+)*)\.md$")

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text
    data: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        if line.startswith((" ", "\t")):
            continue  # 嵌套字段，忽略
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data, "\n".join(lines[end + 1:])


def main() -> int:
    if len(sys.argv) != 2:
        print("用法: validate.py <file.md>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1]).expanduser()
    if not path.is_file():
        print(f"error: 文件不存在 {path}", file=sys.stderr)
        return 2

    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        err("文件带 UTF-8 BOM，Jekyll 会解析不到 frontmatter；用 UTF-8 无 BOM 重写")
    text = raw.decode("utf-8", errors="replace")

    if not text.startswith("---"):
        err("文件必须以 frontmatter 的 --- 开头")

    fm, body = parse_frontmatter(text)
    if not fm:
        err("frontmatter 缺失或未闭合（需要开头 --- 和结尾 ---）")

    for key in REQUIRED:
        if key not in fm:
            err(f"frontmatter 缺少字段 {key}")

    if fm.get("layout") and fm["layout"] != "post":
        err(f'layout 应为 post，当前为 {fm["layout"]}')

    date = fm.get("date", "")
    if date and not DATE_RE.match(date):
        err(f'date 格式应为 "YYYY-MM-DD 10:00:00 +0800"，当前为 "{date}"')

    title = fm.get("title", "")
    if title:
        if len(title) > 60:
            warn(f"标题 {len(title)} 字，偏长（建议 ≤ 60）")
        if '"' in title or "'" in title:
            warn("标题里出现直引号，建议换「」以保持风格一致")
    else:
        err("标题为空")

    desc = fm.get("description", "")
    if desc:
        if not (20 <= len(desc) <= 120):
            warn(f"description {len(desc)} 字，建议 20~120 字")
        if desc.endswith(("。", "！")):
            warn("description 结尾带句号，与既有文章风格不符")
    else:
        err("description 为空")

    m = NAME_RE.match(path.name)
    if not m:
        err(f"文件名不合规：{path.name}，应为 YYYY-MM-DD-<slug>.md 或 <slug>.md（slug 为小写连字符）")
    else:
        draft_date, slug = m.group(1), m.group(2)
        if draft_date and date and not date.startswith(draft_date):
            err(f"文件名日期 {draft_date} 与 frontmatter date {date[:10]} 不一致")
        if path.parent.name == "_posts" and not draft_date:
            err("_posts 下的文件名必须带日期前缀")

    fences = sum(1 for line in body.split("\n") if line.lstrip().startswith("```"))
    if fences % 2:
        err(f"代码块未闭合：``` 出现 {fences} 次（应为偶数）")

    for i, line in enumerate(body.split("\n"), 1):
        if line.rstrip() != line:
            warn(f"正文第 {i} 行有行尾空白")
            break

    if "\t" in body:
        warn("正文含制表符，建议用空格")

    body_len = len(body.strip())
    if body_len < 600:
        err(f"正文仅 {body_len} 字，太短（参考：既有文章 1600~15000 字）")
    if body_len > 20000:
        warn(f"正文 {body_len} 字，偏长，考虑拆篇")

    h2 = [line for line in body.split("\n") if line.startswith("## ")]
    if len(h2) < 3:
        warn(f"二级标题只有 {len(h2)} 个，建议按 6~9 节组织")
    for h in h2:
        if "、" not in h:
            warn(f'章节标题建议用中文序号：「{h.strip()}」')
            break

    if not any(k in body for k in ("总结", "小结", "排查清单")):
        warn("结尾缺少总结/排查清单章节")

    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")

    if errors:
        print(f"\n未通过：{len(errors)} 个 error，{len(warnings)} 个 warning")
        return 1
    print(f"通过：0 error，{len(warnings)} 个 warning（正文 {body_len} 字，{len(h2)} 节）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
