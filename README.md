# dsh-chatgpt-style

把 DSH Web 的对话流排成 ChatGPT 的样子，并且**给语义上色**：加强是绿的、警惕是红的、重点加粗、该有图标的地方都有图标。
纯样式 + 一层正文标注 + 发送框旁的**思考/快速**切换 + 左侧工作区高亮，不碰会话逻辑，关掉就回到原样。

## 安装

桌面应用的 profile 由应用独占，命令行改不动，走界面装：

1. 侧栏「插件」→「添加插件」
2. 填绝对路径：`E:\go_path\src\xiaotianzhushou\dsh-chatgpt-style`
3. 装完**重启一次桌面应用**（插件在应用启动时读进加载树），再刷新页面

它以 `link:` 依赖装在 profile 里，所以改完 `client.js` 只要刷新页面就生效，不用重装。
卸载：插件开关关掉即可；样式表、根属性、观察器都由 `ctx.effect` 的清理器收走。

## 语义色：怎么写，长什么样

正文里的标记会被渲染成带色带图标的节点。写进代码块或行内代码里的标记原样保留，不会被转换。

| 写法 | 渲染成 | 用在哪 |
|---|---|---|
| `==文字==` | **绿色**加粗 + ✓ 图标 | 加强、结论、已验证通过的点 |
| `!!文字!!` | **红色**加粗 + ⚠ 图标 | 警惕、风险、会出事的地方 |
| `++文字++` | **绿色**加粗 + 淡绿底，无图标 | 需要重点关注的词：错误码、关键数字、路径 |
| 裸的 `403` / `500` | 自动变成上面那种重点样式 | 不用手标，4xx/5xx 直接命中 |
| 行首 `✅ ` 或 `🟢 ` | 绿色横条卡片 + ✓，表情被摘掉 | 整行结论 |
| 行首 `⚠️ ` 或 `🔴 ` | 红色横条卡片 + ⚠ | 整行警告 |
| 行首 `💡 ` | 蓝色横条卡片 + 灯泡 | 整行提示 |
| `**文字**` | 700 字重（比正文更硬） | 重点加粗 |

例子的原文与效果：

```
✅ 依赖已经写进 profile，三个入口都能解析
⚠️ 重启会掐断当前这轮对话
💡 想微调就改 client.js 顶部那段 CSS
结论是 ==装好了==，但 !!重启前别关终端!!。
```

颜色跟着主题走：浅色用深一点的墨绿/砖红，深色自动换成亮绿/亮红，不用手动切。

## 兼容性（为什么可以放心用）

**正在流式输出的消息一个字都不改。** 宿主在助理消息的根节点上挂着 `data-streaming`，
标记摘掉才代表这条消息写完，插件此时才动手。原因是 React 记住的是它自己创建的那个文本节点，
把它替换掉之后，后续 token 会写进已脱离文档的节点，正文就会停在原地——这条约束由测试守着。

已完成的正文里，转换是**幂等**的：装饰过的文本里不再含标记，重复扫描不会二次包裹。

## 思考 / 快速 一键切换

发送框旁边多了一枚胶囊：**快速**（绿、闪电）或**思考**（紫、星标），点一下换档，不用每次展开模型菜单。

它读的是宿主的模型目录（`ctx.modelDirectories`），提交也走宿主唯一真源，插件自己**不缓存模型列表**：

- 当前档位：`directoryFor(sessionId).store.getSnapshot().current.reasoningEffort`
- 可选的档位：快照里那个模型的 `reasoning.efforts`
- 点一下：`directoryFor(sessionId).select({ provider, model, reasoningEffort })`

要让它有档位可切，**适配器必须先声明推理等级**——模型目录是配置驱动的，客户端插件造不出来。
provider 路由里加上这两处（本项目当前配置见 `~/.dsh/profiles/desktop/cordis.patch.yml`）：

```yaml
providers:
  kso-codeplan:
    compat:
      thinkingFormat: deepseek   # thinking: {type: enabled|disabled}
    reasoning: off               # 默认档 = 快速
    models:
      - id: deepseek/deepseek-v4.1-flash
        reasoningEfforts:        # 只声明真实有区别的档位
          off: "off"
          high: "high"
```

模型没声明档位时胶囊自己隐藏，宿主原生那套 UI 照常。

**已知限制**：provider 改完要重启桌面应用才生效（宿主半的配置在启动时读进加载树）。

## 其它排版改动

| 位置 | DSH 原来 | 现在 |
|---|---|---|
| 正文列宽 | 748px | **768px**（48rem） |
| 轮次间距 | 6 / 12 / 16px | **26px** |
| 用户消息 | 品牌浅蓝气泡 | 右侧圆形蓝头像 + 染色气泡（20px 圆角、描边），宽 75% |
| 助手消息 | 无角色标识 | 左侧圆形绿头像 + 星标 |
| 正文 | 跟设置、行高 24px | 16px / 28px |
| 标题 | 设计令牌 | h1/h2 左侧 3px 强调色竖条 |
| 链接 | 近黑无下划线 | 强调色 + 下划线；外链补外跳图标 |
| 代码块 | 令牌圆角 | 12px 圆角 + 外框，头栏分色并带代码图标 |
| 表格 | 无表头底色 | 表头浅底、外框、行分隔线 |
| 引用块 | 灰色左条 | 强调色左条 + 7% 底色 + 引号图标 |

连续两个助手步骤只画一个头像，第二条缩进同步回退。

## 左侧工作区（侧栏）

| 对象 | 原来 | 现在 |
|---|---|---|
| 选中的会话 | 只和 hover 一样的浅灰底 | **蓝底 + 蓝字 + 左侧 3px 蓝条 + 加粗**，hover 不再把它变回灰 |
| 未选中的会话 | 主文字色 | 灰一档（`--gpt-ws-idle-fg`），鼠标悬停时提回正文色 |
| 选中行的标题/时间 | 同色 | 标题 700，时间/元信息继承蓝色并降到 78% 透明度 |
| 工作区（文件夹）行 | 常规字重、灰图标 | 标题 600，文件夹图标**琥珀色**，展开态更亮 |

锚点用的是宿主的语义类名局部名：`_sessionRow` / `_selected` / `_projectRow` / `_folder` / `_folderActive`，
外加 `[data-row-key^="workspace:"]` 这个稳定属性。图标本身是宿主 primitives 的 SVG，
所以走 `color` + `svg{fill:currentColor}` 上色，不替换 DOM。

## 调参

数值集中在 `client.js` 顶部 `CSS` 数组第 1 节，改完刷新页面即生效：

```
--dsh-chat-content-width              版心宽度
--gpt-body-size / --gpt-body-line     正文字号 / 行高
--gpt-avatar / --gpt-avatar-gap       头像直径 / 间距
--gpt-accent / --gpt-bot              用户侧 / 助手侧强调色
--gpt-bubble / --gpt-bubble-line-color  用户气泡底色 / 描边
--gpt-mode-fast-* / --gpt-mode-think-*   胶囊的 文字色 / 底色 / 描边（快速 / 思考）
--gpt-ws-sel-bg / -fg / -bar           选中会话的底色 / 文字色 / 左条色
--gpt-ws-idle-fg                       未选中会话的文字色
--gpt-ws-folder / -open                文件夹图标的琥珀色 / 展开态
--gpt-ok / --gpt-warn / --gpt-tip     语义色的文字色
--gpt-ok-bg / --gpt-warn-bg / --gpt-tip-bg  语义色卡片的底色
```

不想要某项：语义标注整块删掉第 12、13 节 CSS 及 `INLINE` / `BLOCK` 两处定义；不想要头像删掉第 3 节。

## 自测

```
node test/semantic.test.mjs
```

用假 DOM 跑真实的 `client.js`，覆盖整行标注、行内标注、代码/公式不被动、幂等、增量追加、
**流式期间不动 DOM**、样式表注入与卸载，以及思考/快速胶囊（默认档、跟随目录变化、点击提交、
模型没声明档位时隐藏、会话未物化不抛错）、重点词标记与裸 4xx/5xx 自动命中，共 46 项断言。

## 为什么选择器长这样

DSH 用 CSS Modules，实际类名是 `<哈希>_局部名`（用户气泡是 `cJsG2q_bubble`）。哈希随宿主构建变，局部名稳定，
所以一律写 `[class*="_bubble"]`；行级结构挂在宿主导出的语义属性上：

- `[data-chat-flow-kind="user" | "assistant-step" | "turn-process" | "steering"]`
- `[data-chat-group-part]`、`[data-conversation-scroll]`、`[data-code-block-banner]`
- `[data-streaming]`（流式保护）、`body[data-ds-dark-theme]`（深色主题）

**已知限制**：宿主大版本升级若改了局部类名或这些属性名，对应样式/标注会静默失效（退化成默认外观，不报错）。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | 清单：`dsh.bundle.patch` 指向补丁，`dsh.client` 声明浏览器半 |
| `cordis.patch.yml` | 把 entry 插进 profile 的加载树 |
| `index.js` | 宿主半：具名导出 `name` 与空 `apply` |
| `client.js` | 浏览器半：图标 + 样式表 + 语义标注 + 思考/快速胶囊 |
| `test/semantic.test.mjs` | 假 DOM 自测，46 项断言 |
