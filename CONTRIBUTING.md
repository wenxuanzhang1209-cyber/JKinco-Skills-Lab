# Contributing

*[中文版见下方](#贡献指南)*

Contributions of every kind are welcome: issues, documentation, translations, and code.

## Before you open a pull request

Requires 任意支持 SKILL.md 的 Agent 平台.

```bash
# 技能是 Markdown + 资源文件，没有构建步骤。
# 改动后请在你的 Agent 平台上实际触发一次，确认技能仍能被正确匹配。
```

## Workflow

1. Fork the repository.
2. Create a branch: `feat/xxx` or `fix/xxx`.
3. Write commit messages in English or Chinese — either is fine. Explain **why** the change is
   needed, not just what changed.
4. Open a pull request. It merges once CI is green.

## Hard boundaries

- No secrets, tokens, or certificates in the repository.
- Never commit `.env`.

## What makes a change easy to accept

This codebase favours comments that explain **why** a piece of code exists, especially where
the obvious implementation would be wrong. If your change fixes a subtle bug, a short note
about what went wrong is worth more than a long description of the fix.

---

# 贡献指南

欢迎任何形式的贡献：Issue、文档、翻译、代码。

## 提交前

需要 任意支持 SKILL.md 的 Agent 平台。

```bash
# 技能是 Markdown + 资源文件，没有构建步骤。
# 改动后请在你的 Agent 平台上实际触发一次，确认技能仍能被正确匹配。
```

## 开发流程

1. Fork 本仓库；
2. 新建分支：`feat/xxx` 或 `fix/xxx`；
3. 提交信息用中文或英文皆可，说明**「为什么改」**而不只是「改了什么」；
4. 发起 Pull Request，CI 全绿后合入。

## 红线

- 不提交任何密钥、Token、证书；
- 不把 `.env` 加入版本库。

## 什么样的改动容易被接受

这个代码库偏好解释**「为什么」**的注释，尤其是在「看起来显然的写法其实是错的」那些地方。
如果你的改动修了一个隐蔽的 bug，一句「原先错在哪」比长篇描述修法更有价值。

---

<sub>
<b>JKinco</b> — local-first tools for work whose data cannot leave the building ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-listen-open">Listen</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-slides">Slides</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/JKinco-Skills-Lab">Skills Lab</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/personal-life-hub">Life Hub</a> ·
<a href="https://github.com/wenxuanzhang1209-cyber/jkinco-tools">Tools</a>
</sub>
