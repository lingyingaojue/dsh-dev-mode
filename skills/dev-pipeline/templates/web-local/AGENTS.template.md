# AGENTS.md

## 项目

<应用名>：本地记账网页，无构建步骤、无外部依赖，数据在 localStorage。

## 技术栈

- 原生 HTML/CSS/JavaScript
- 数据：localStorage（key `jizhang.entries.v1`）
- 备份：导出/导入 JSON

## 运行与测试

```powershell
# 直接用浏览器打开
start index.html

# 语法检查
node --check app.js

# 无自动化浏览器时：手工走 README 的自验清单，并截图
```

## 数据与限制

- 数据在浏览器；清缓存会丢。重要数据必须导出备份。
- 不在页面里引外部 CDN/字体，保证离线可用。
- 不要用它存密码、支付信息等敏感数据。

## 完成标准

- 双击能打开；
- 记一笔、看列表、看结余；
- 刷新/重开浏览器数据还在；
- 导出/导入可用；
- 中文说明能照着做。
