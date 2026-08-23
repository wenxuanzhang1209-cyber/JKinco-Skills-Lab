<p align="center">
  <img src="https://img.shields.io/github/license/wenxuanzhang1209-cyber/JKinco-Skills-Lab?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/skills-2-58a6ff?style=flat-square" alt="Skills" />
  <img src="https://img.shields.io/badge/format-Agent%20Skills-3fb950?style=flat-square" alt="Agent Skills" />
</p>

# JKinco Skills Lab

**Brand design work, frozen into agent skills that produce the same result every time.**

<sub>把重复的品牌设计工作固化成可调用的技能：输入需求，输出结构稿、提示词、质检结果。</sub>

---

## Why this exists

A prompt that produced a great poster last month rarely produces the same poster today. The
brand colours drift, the character looks like a different person, the copy tone slides toward
generic marketing. So somebody re-explains the whole brand in every conversation — and gets a
slightly different brand back each time.

These skills carry the parts that must not drift: a **visual system**, a **character bible**,
a **copy and layout system**, and a **quality checklist** the output is graded against before
it is handed back.

The constraint that shaped them: **never invent brand facts.** The poster skill will not add a
logo, a URL, a phone number, or a slogan that the user did not supply — because a plausible
invented detail on a corporate poster is worse than a missing one.

<sub>上个月生成出好海报的提示词，今天很可能给不出同一张：品牌色会漂、人物换了个人、
文案滑向通用营销腔。于是每次对话都要把品牌从头解释一遍，而每次拿回来的品牌都不太一样。
这些技能把不能漂的部分固定下来——视觉系统、人物设定、文案与排版系统，
以及交付前据以打分的质检清单。</sub>

## What's here

### `shanghai-jianke-poster` — brand poster generation

Vertical Chinese posters for recruitment, youth events, project promotion, training, holidays,
and brand culture. Ships with:

| File | Role |
|---|---|
| `references/brand-visual-system.md` | Colour, typography, and the visual grammar |
| `references/character-bible.md` | The illustrated characters, locked so they stay the same person |
| `references/copy-layout-system.md` | Copy tone and information hierarchy |
| `references/quality-checklist.md` | What the output is graded against |
| `references/prompt-templates.md` · `coze-system-prompt.md` | Prompts for image platforms |
| `assets/` | Reference poster and character sheets — the highest-priority visual source |

A deliberate design choice: **two-stage rendering.** Generate the illustration without long
text first, then typeset Chinese in a design tool. Single-pass generation is only attempted
when the model's Chinese typography is actually reliable — because garbled Chinese on a
finished poster is not a fixable defect, it is a reshoot.

### `xiaozhi-product-video` — product video with a brand character

Storyboards and prompts for product videos featuring the brand mascot, with front / back /
turnaround reference sheets so the character stays consistent across shots.

### 小智入职大冒险 — a playable onboarding quiz

Not a skill — a self-contained web game (`index.html` + `game.js`, no build step) that turns
new-hire onboarding material into something a person will actually finish. Open the file in a
browser. Ships with a question bank and a note on where the questions came from.

## How to use a skill

Copy the skill directory into your agent's skills folder — Claude Code, Codex, or any platform
that reads the `SKILL.md` front-matter format — then trigger it by describing the task.

```
<skill-directory>/
  SKILL.md          name + description front-matter, then the operating rules
  agents/           platform-specific configuration
  references/       the material the skill reads before producing anything
  assets/           images the skill treats as authoritative
```

Each `SKILL.md` starts with `name` and `description`; the description is what the agent matches
against, so it is written to be specific about *when* the skill applies rather than what it is.

## Status

Two skills plus one onboarding game, used in production for real brand work. Directory names
are currently Chinese — usable, but international contributors may hit encoding friction on
some systems; renaming is on the list.

<sub>两个技能加一个入职小游戏，都用在真实的品牌工作里。目录名目前是中文，能用，
但国际贡献者在某些系统上可能遇到编码问题，改名在计划内。</sub>

## License

[MIT](LICENSE) © 2026 JKinco

---

<sub>
<b>JKinco</b> — local-first tools for work whose data cannot leave the building ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-listen-open">Listen</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-slides">Slides</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/JKinco-Skills-Lab">Skills Lab</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/personal-life-hub">Life Hub</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-tools">Tools</a>
</sub>
