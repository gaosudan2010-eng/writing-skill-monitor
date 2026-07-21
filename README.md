# Writing Skill Monitor

文本创作 Skill 全集监控，按 Claude 官方、Skills.sh、GitHub 和 ClawHub 分类展示。页面默认使用“原子 Skill”口径，平台记录与合集/项目可独立查看。

## 对象口径

- **平台记录**：同一 Skill 在某个平台的一条公开记录。
- **原子 Skill**：可独立安装或使用的能力，按“来源仓库 + Skill 路径”建立 Canonical ID。
- **合集 / 项目**：包含多个 Skill 的仓库或集合页，不计入原子 Skill 数量。
- 同名但来自不同仓库或作者的 Skill 不合并；同一仓库和 Skill 路径的跨平台记录合并展示。

## 更新规则

- 仅展示公开热度不低于 500 的条目。
- Skills.sh 与 Claude 官方使用安装量。
- ClawHub 使用站内下载量。
- 原子 Skill 的安装量和下载量标记为直接指标。
- 合集总量标记为合集指标。
- GitHub 子 Skill 使用所属仓库 Star，并标注为继承指标；单 Skill 项目的仓库 Star 标记为项目指标。
- 不同层级和平台的指标不相加。
- GitHub Actions 每天 02:00 UTC（北京时间 10:00）刷新指标并重新部署。

更新脚本在 `scripts/update-metrics.mjs`，也可以通过 Actions 手动运行。
