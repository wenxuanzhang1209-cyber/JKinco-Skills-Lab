#!/usr/bin/env python3
"""检查每个技能是不是完整的、引用的文件是不是真的在。

    python3 scripts/validate_skills.py

一个技能的价值全在它读的那些参考文件里：品牌视觉规范、角色设定、
质检清单。SKILL.md 里写着 [character-bible.md](references/character-bible.md)，
如果那个文件被改名或删掉了，**不会有任何报错** —— 智能体读不到就自己
编一个，输出看起来照样像模像样，只是不再是同一套品牌了。

这正是这个仓库要解决的问题（「输出不再每次都漂」）的反面。所以把它
变成一次检查：

  1. 每个技能目录都有 SKILL.md
  2. SKILL.md 开头有 name 和 description 两个字段
     —— 智能体是靠 description 来决定要不要用这个技能的，缺了就等于没上架
  3. SKILL.md 里引用的每个文件都存在
  4. references/ 和 assets/ 里没有谁都不引用的孤儿文件（只警告，不失败）
  5. README 徽章上的技能数量和实际数量一致

退出码 0 表示都对得上。
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

#: SKILL.md 里指向同目录下资源的写法。
REFERENCE = re.compile(r"(?:references|assets|agents)/[^\s\)\]\"'，。、]+\.\w+")

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
if not sys.stdout.isatty():
    GREEN = RED = YELLOW = DIM = RESET = ""


def tracked_files() -> list[str]:
    out = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT,
                         capture_output=True, check=True).stdout.decode()
    return [name for name in out.split("\0") if name]


def front_matter(text: str) -> dict[str, str]:
    """只取开头 --- 之间那一段，按 key: value 读。

    刻意不引 pyyaml：这个仓库没有任何 Python 依赖，为了读五行头信息
    去装一个包不划算，而且 description 里带冒号和中文标点，
    朴素的切分反而比 YAML 解析更不容易出意外。
    """
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fields: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if ":" in line and not line.startswith((" ", "\t", "#")):
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip()
    return fields


def main() -> int:
    files = tracked_files()
    skills = sorted(Path(name).parent for name in files if Path(name).name == "SKILL.md")

    if not skills:
        print(f"{RED}一个技能都没找到{RESET}——每个技能目录下要有 SKILL.md")
        return 1

    print(f"{DIM}检查 {len(skills)} 个技能{RESET}\n")
    problems = 0
    warnings = 0

    for skill in skills:
        print(f"  {skill}")
        text = (ROOT / skill / "SKILL.md").read_text(encoding="utf-8")

        fields = front_matter(text)
        for key in ("name", "description"):
            if fields.get(key):
                shown = fields[key][:52] + ("…" if len(fields[key]) > 52 else "")
                print(f"    {GREEN}✓{RESET} {key}: {shown}")
            else:
                # description 是智能体用来匹配任务的那句话，缺了等于没上架
                print(f"    {RED}✗{RESET} 缺少 front-matter 字段 {key}")
                problems += 1

        # 扫技能目录下所有 markdown，不只是 SKILL.md：参考图往往是在
        # references/ 里的某份规范里被指名的，那也算「用上了」。
        referenced = set()
        for document in sorted((ROOT / skill).rglob("*.md")):
            body = document.read_text(encoding="utf-8")
            for ref in REFERENCE.findall(body):
                referenced.add(ref)
            # references/ 内部互相引用时写的是 ../assets/xxx
            for ref in re.findall(r"\.\./((?:assets|references|agents)/[^\s\)\]\"'，。、]+\.\w+)", body):
                referenced.add(ref)
        referenced = sorted(referenced)
        missing = [ref for ref in referenced if not (ROOT / skill / ref).exists()]
        if missing:
            for ref in missing:
                print(f"    {RED}✗{RESET} 引用了不存在的文件: {ref}")
            problems += len(missing)
        else:
            print(f"    {GREEN}✓{RESET} {len(referenced)} 个引用全部存在")

        # 孤儿文件只是警告：可能是有意留着的素材，不该让构建失败
        on_disk = {
            str(path.relative_to(ROOT / skill))
            for folder in ("references", "assets")
            for path in (ROOT / skill / folder).glob("*")
            if path.is_file()
        }
        orphans = sorted(on_disk - set(referenced))
        for orphan in orphans:
            print(f"    {YELLOW}!{RESET} 没有任何地方引用: {orphan}")
            warnings += 1

    # README 上的数字
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    badge = re.search(r"badge/skills-(\d+)-", readme)
    if badge is None:
        print(f"\n  {YELLOW}!{RESET} README 里没有 skills 徽章，跳过核对")
        warnings += 1
    elif int(badge.group(1)) != len(skills):
        print(f"\n  {RED}✗{RESET} README 徽章写着 {badge.group(1)} 个技能，"
              f"实际 {len(skills)} 个")
        problems += 1
    else:
        print(f"\n  {GREEN}✓{RESET} README 徽章的技能数（{len(skills)}）与实际一致")

    print()
    if problems:
        print(f"{RED}{problems} 处有问题。{RESET}")
        return 1
    if warnings:
        print(f"{GREEN}检查通过{RESET}，另有 {warnings} 条提醒。")
        return 0
    print(f"{GREEN}全部通过。{RESET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
