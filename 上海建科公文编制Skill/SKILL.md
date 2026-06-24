---
name: shanghai-jianke-official-doc
description: 依据上海建科工程咨询有限公司现行公文样本，起草、改写、排版和校核公司通知、项目申报通知、培训通知、制度及权限调整通知、党委红头通知、附件表单和评审表。严格复用样本中的发文结构、企业页眉、发文字号、标题、主送机关、正文层级、附件、落款、日期、页码、印章与印发版记，并输出可编辑 DOCX/PDF。用于用户提出“写通知、发文、公文、红头文件、制度通知、申报通知、培训通知、评选结果、附件表单、套用公司格式”等任务。
---

# 上海建科公文编制

## 核心原则

1. 先确定发文主体和文种，再写正文；不得把“上海建科工程咨询有限公司”“中共上海建科工程咨询有限公司委员会”等主体混用。
2. 先读取 [format-system.md](references/format-system.md)、[writing-system.md](references/writing-system.md) 和对应文种模板。
3. 样本只证明“公司当前用法”，不自动等同于国家机关公文强制标准。用户提供最新制度、模板或办公室口径时，以最新资料为准。
4. 不编造文号、日期、部门、联系人、邮箱、金额、名单、制度依据、审批权限或政策要求；缺失内容标记为 `【待确认】`。
5. 公文以准确、庄重、清晰为首要目标。不得加入海报式插画、渐变背景、装饰照片或无关图标。

## 文种选择

- 普通业务通知、申报、培训、工作安排：读取 [notice-templates.md](references/notice-templates.md)。
- 带内部文件编号、制度修订、授权权限：读取 [numbered-policy-template.md](references/numbered-policy-template.md)。
- 党委评选、表彰、党内事项：读取 [party-redhead-template.md](references/party-redhead-template.md)。
- 申请表、评审表、培训安排、权限矩阵：读取 [tables-attachments.md](references/tables-attachments.md)。

不确定文种时，优先输出“内容草案 + 待确认的版式类型”，不要擅自套红头。

## 标准工作流

### 1. 建立发文要素表

提取并核对：

- 发文主体、承办部门、主送对象
- 标题、发文目的、制度或计划依据
- 时间、地点、对象、条件、流程、截止日期
- 联系人、提交方式、附件
- 文号、签发日期、是否盖章、是否需要印发版记
- 是否含名单、表格、金额、权限或敏感信息

### 2. 选择结构

默认结构：

1. 标题
2. 主送机关
3. 导语：背景/依据 + 目的 + “现将有关事项通知如下”
4. 主体：按事项、流程或时间顺序分层
5. 结束语：视文种使用“特此通知”或后续说明
6. 附件
7. 发文主体、承办部门、日期
8. 党委文件需要印章和印发版记

### 3. 起草

执行 [writing-system.md](references/writing-system.md) 的用词、句法、数字、层级和禁忌。先保证事实和逻辑，再压缩冗语。

### 4. 排版

调用 [scripts/build_templates.py](scripts/build_templates.py) 生成或复用 `assets/templates/` 中的 DOCX 模板。按 [format-system.md](references/format-system.md) 设置 A4、页边距、企业页眉、标题、正文、页码、表格和落款。

### 5. 复核

逐项执行 [quality-checklist.md](references/quality-checklist.md)。含金额、名单、时间、权限、制度编号的文件必须做第二次事实核对。

### 6. 渲染交付

输出 DOCX 时，必须渲染为页面图片并逐页检查；修复溢出、孤行、表格断裂、页眉错位和字体替代后再交付。需要 PDF 时从通过检查的 DOCX 导出。

## 输出要求

默认交付：

- 可编辑 DOCX
- PDF 定稿版（用户需要时）
- “待确认事项”清单
- 文稿校核结果

用户只要求文字时，仍按公文结构输出，不展示无关创作过程。

## 参考资料

五份原始样本保存在 `assets/reference-documents/`，视觉裁切保存在 `assets/layout-references/`。需要核对真实版式时，优先查看原始 PDF，不只依赖文字摘要。

