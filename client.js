/* dsh-chatgpt-style —— 浏览器半。
 *
 * 三件事：
 *   1. 给 <html> 打作用域根属性；
 *   2. 往 <head> 注入样式表（style[data-plugin] 是宿主约定，卸载/热更新时按它收走）；
 *   3. 把正文里的语义标记渲染成带色带图标的内容（见下）。
 *
 * 类名策略：DSH 用 CSS Modules，实际类名形如 <哈希>_局部名（用户气泡是 cJsG2q_bubble）。
 * 哈希随宿主构建变，局部名稳定，所以一律用 [class*="_局部名"]，
 * 再用宿主导出的语义属性做锚点：data-chat-flow-kind / data-conversation-scroll /
 * data-chat-group-part / data-code-block-banner。
 *
 * 图标一律是内联 SVG 的 data URI。装饰性图标画在 ::before / ::after 上，不碰 DOM；
 * 只有语义标注（第 3 件事）会往正文插 <span>，且只插在自己生成的内容里。
 */
window.__ModuleLoader__.load({
  id: 'dsh-chatgpt-style',
  factory: function () {
    var PLUGIN_ID = 'dsh-chatgpt-style';
    var ROOT_ATTR = 'data-chatgpt-style';

    /* ---- 图标（URL 里的 # 必须写成 %23，尖括号写成 %3C / %3E） ---- */
    var svg = function (body, fill, rule) {
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='" + fill + "'" + (rule ? " fill-rule='" + rule + "'" : "") + "%3E" + body + "%3C/svg%3E\")";
    };
    var WHITE = '%23fff';
    var SOLID = '%23000';   /* 掩膜只取 alpha，颜色无所谓 */
    var ICON_USER = svg("%3Cpath d='M12 12.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2Zm0 2.1c-4.5 0-8.2 2.4-8.2 5.4V21h16.4v-1.3c0-3-3.7-5.4-8.2-5.4Z'/%3E", WHITE);
    var ICON_BOT = svg("%3Cpath d='M12 2.4l1.9 5.6 5.6 1.9-5.6 1.9L12 17.4l-1.9-5.6L4.5 9.9l5.6-1.9L12 2.4Z'/%3E%3Cpath d='M18.8 15.2l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z'/%3E", WHITE);
    var ICON_CODE = svg("%3Cpath d='M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4Zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4Z'/%3E", SOLID);
    var ICON_LINK = svg("%3Cpath d='M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3Z'/%3E%3Cpath d='M19 19H5V5h6V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2v6Z'/%3E", SOLID);
    var ICON_QUOTE = svg("%3Cpath d='M7.2 7h4.2v6.1a4.4 4.4 0 0 1-4.4 4.4v-2.1a2.3 2.3 0 0 0 2.3-2.3H7.2V7Zm8.1 0h4.2v6.1a4.4 4.4 0 0 1-4.4 4.4v-2.1a2.3 2.3 0 0 0 2.3-2.3h-2.1V7Z'/%3E", SOLID);
    var ICON_CHECK = svg("%3Cpath d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z'/%3E", SOLID);
    var ICON_WARN = svg("%3Cpath d='M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2v-4h2v4Z'/%3E", SOLID, 'evenodd');
    var ICON_BULB = svg("%3Cpath d='M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2Z'/%3E", SOLID);
    var ICON_BOLT = svg("%3Cpath d='M13.4 2 4.2 13.4h5.7L9.6 22 19 10.5h-5.8L13.4 2Z'/%3E", SOLID);
    var ICON_SPARK = svg("%3Cpath d='M12 2.4l2.1 6.5 6.5 2.1-6.5 2.1L12 19.6l-2.1-6.5L3.4 11l6.5-2.1L12 2.4Z'/%3E", SOLID);

    /* ------------------------------------------------------------------
     * 调参区：版心、字号、配色、头像、语义色。
     * 改完刷新页面即生效（本插件是 link: 依赖，不用重装）。
     * ------------------------------------------------------------------ */
    var CSS = [
      '/* ===== 1. 变量：版心 / 字号 / 角色配色 ===== */',
      'html[' + ROOT_ATTR + '] {',
      '  --dsh-chat-content-width: 768px;   /* 正文列宽（DSH 默认 748px） */',
      '  --gpt-body-size: 16px;',
      '  --gpt-body-line: 28px;',
      '  --gpt-avatar: 30px;',
      '  --gpt-avatar-gap: 14px;',
      '  --gpt-accent: #2f6feb;',
      '  --gpt-bot: #10a37f;',
      '  --gpt-bubble: #e7f0ff;',
      '  --gpt-bubble-line-color: #bcd2f7;',
      '  --gpt-ink: #0b0d10;',
      '  --gpt-code-bg: #f7f8fa;',
      '  --gpt-code-head: #e9edf2;',
      '  --gpt-code-line: #dfe4ea;',
      '  --gpt-inline-code: #eef1f5;',
      '  --gpt-table-head: #f2f4f7;',
      '  --gpt-rule: #d8dee6;',
      '  /* 语义色：加强=绿，警惕=红，提示=蓝 */',
      '  --gpt-ok: #1a7f4b;',
      '  --gpt-ok-bg: rgba(26, 127, 75, .10);',
      '  --gpt-warn: #c0392b;',
      '  --gpt-warn-bg: rgba(192, 57, 43, .10);',
      '  --gpt-tip: #1f6feb;',
      '  --gpt-tip-bg: rgba(31, 111, 235, .10);',
      '  /* 思考/快速胶囊：快速=绿（省），思考=紫（贵） */',
      '  --gpt-mode-fast-fg: #0a6b4d;',
      '  --gpt-mode-fast-bg: #e4f6ee;',
      '  --gpt-mode-fast-line: #b3e0cd;',
      '  --gpt-mode-think-fg: #6b3ec9;',
      '  --gpt-mode-think-bg: #f0eaff;',
      '  --gpt-mode-think-line: #d4c4f5;',
      '  /* 左侧工作区：选中的会话用蓝底蓝字，文件夹图标走琥珀色 */',
      '  --gpt-ws-folder: #e2a03c;',
      '  --gpt-ws-folder-open: #c8891f;',
      '  --gpt-ws-sel-bg: #dce8ff;',
      '  --gpt-ws-sel-fg: #10387e;',
      '  --gpt-ws-sel-bar: #2f6feb;',
      '  --gpt-ws-idle-fg: #5a6270;',
      '}',
      'html[' + ROOT_ATTR + '] body[data-ds-dark-theme] {',
      '  --gpt-accent: #7aa2ff;',
      '  --gpt-bot: #34d3a6;',
      '  --gpt-bubble: #1f2c42;',
      '  --gpt-bubble-line-color: #35507d;',
      '  --gpt-ink: #f0f2f5;',
      '  --gpt-code-bg: #0d0d0d;',
      '  --gpt-code-head: #23262b;',
      '  --gpt-code-line: #303338;',
      '  --gpt-inline-code: #2a2f36;',
      '  --gpt-table-head: #202327;',
      '  --gpt-rule: #3a3f46;',
      '  --gpt-ok: #4ade80;',
      '  --gpt-ok-bg: rgba(74, 222, 128, .14);',
      '  --gpt-warn: #ff6b6b;',
      '  --gpt-warn-bg: rgba(255, 107, 107, .14);',
      '  --gpt-tip: #7aa2ff;',
      '  --gpt-tip-bg: rgba(122, 162, 255, .14);',
      '  --gpt-mode-fast-fg: #5fd6a6;',
      '  --gpt-mode-fast-bg: #123027;',
      '  --gpt-mode-fast-line: #1d4a3a;',
      '  --gpt-mode-think-fg: #b79cf7;',
      '  --gpt-mode-think-bg: #241c3a;',
      '  --gpt-mode-think-line: #3b2f5e;',
      '  --gpt-ws-folder: #f0b956;',
      '  --gpt-ws-folder-open: #ffcd6b;',
      '  --gpt-ws-sel-bg: #1d2c46;',
      '  --gpt-ws-sel-fg: #cfe0ff;',
      '  --gpt-ws-sel-bar: #7aa2ff;',
      '  --gpt-ws-idle-fg: #9aa4b4;',
      '}',

      '/* ===== 2. 轮次间距：DSH 是 6/12/16px 三档，这里统一放 26px ===== */',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind],',
      'html[' + ROOT_ATTR + '] [data-chat-group-part] {',
      '  --dsh-chat-flow-gap: 26px !important;',
      '}',

      '/* ===== 3. 角色头像：用户靠右圆形人像，助手靠左星标 ===== */',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="user"],',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="steering"] {',
      '  position: relative;',
      '  padding-right: calc(var(--gpt-avatar) + var(--gpt-avatar-gap));',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="assistant-step"] {',
      '  position: relative;',
      '  padding-left: calc(var(--gpt-avatar) + var(--gpt-avatar-gap));',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="assistant-step"] + [data-chat-flow-kind="assistant-step"] {',
      '  padding-left: 0;',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="assistant-step"] + [data-chat-flow-kind="assistant-step"]::before {',
      '  display: none;',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="user"] [class*="_bubble"],',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="steering"] [class*="_bubble"] {',
      '  position: relative;',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="user"] [class*="_bubble"]::after,',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="steering"] [class*="_bubble"]::after {',
      '  content: "";',
      '  position: absolute;',
      '  top: 0;',
      '  right: calc(-1 * (var(--gpt-avatar) + var(--gpt-avatar-gap)));',
      '  width: var(--gpt-avatar);',
      '  height: var(--gpt-avatar);',
      '  border-radius: 50%;',
      '  background-color: var(--gpt-accent);',
      '  background-image: ' + ICON_USER + ';',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '  background-size: 17px 17px;',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="assistant-step"]::before {',
      '  content: "";',
      '  position: absolute;',
      '  top: 0;',
      '  left: 0;',
      '  width: var(--gpt-avatar);',
      '  height: var(--gpt-avatar);',
      '  border-radius: 50%;',
      '  background-color: var(--gpt-bot);',
      '  background-image: ' + ICON_BOT + ';',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '  background-size: 17px 17px;',
      '}',

      '/* ===== 4. 用户气泡：染色 + 描边，和助手的素面正文拉开 ===== */',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="user"] [class*="_userStack"],',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="steering"] [class*="_userStack"] {',
      '  max-width: min(calc(var(--dsh-chat-content-width) * .75), 75%);',
      '}',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="user"] [class*="_bubble"],',
      'html[' + ROOT_ATTR + '] [data-chat-flow-kind="steering"] [class*="_bubble"] {',
      '  background: var(--gpt-bubble);',
      '  border: 1px solid var(--gpt-bubble-line-color);',
      '  color: var(--gpt-ink);',
      '  border-radius: 20px;',
      '  padding: 10px 18px;',
      '  font-size: var(--gpt-body-size);',
      '  line-height: 26px;',
      '}',

      '/* ===== 5. 助手正文：16/28 的阅读节奏 ===== */',
      'html[' + ROOT_ATTR + '] [data-conversation-scroll] [class*="_markdown"] {',
      '  font-size: var(--gpt-body-size);',
      '  line-height: var(--gpt-body-line);',
      '  color: var(--gpt-ink);',
      '}',

      '/* ===== 6. 标题：加一条强调色竖条，层级一眼可见 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h1,',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h2 {',
      '  border-left: 3px solid var(--gpt-accent);',
      '  padding-left: 12px;',
      '  font-weight: 600;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h1 { font-size: 24px; line-height: 32px; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h2 { font-size: 20px; line-height: 28px; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h3 { font-size: 18px; line-height: 26px; font-weight: 600; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] h4 { font-size: 16px; line-height: 24px; font-weight: 600; }',
      '/* 重点加粗：比正文的 400 更硬，和两侧文字拉开 */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] strong { font-weight: 700; }',

      '/* ===== 7. 链接：强调色 + 下划线，外链补一个外跳图标 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] a[href^="http"] {',
      '  color: var(--gpt-accent);',
      '  text-decoration: underline;',
      '  text-underline-offset: 3px;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] a[href^="http"]::after {',
      '  content: "";',
      '  display: inline-block;',
      '  width: 12px;',
      '  height: 12px;',
      '  margin-left: 4px;',
      '  vertical-align: -1px;',
      '  background-color: currentColor;',
      '  -webkit-mask: ' + ICON_LINK + ' center / contain no-repeat;',
      '  mask: ' + ICON_LINK + ' center / contain no-repeat;',
      '}',

      '/* ===== 8. 列表与引用 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] :where(ul, ol) { padding-left: 22px; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] li:not(:first-child) { margin-top: 8px; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] li::marker { color: var(--gpt-accent); font-weight: 600; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] blockquote {',
      '  border-left: 3px solid var(--gpt-accent);',
      '  background: color-mix(in srgb, var(--gpt-accent) 7%, transparent);',
      '  border-radius: 0 8px 8px 0;',
      '  padding: 2px 14px;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] blockquote::before {',
      '  content: "";',
      '  display: block;',
      '  width: 16px;',
      '  height: 16px;',
      '  margin: 8px 0 -6px;',
      '  background-color: var(--gpt-accent);',
      '  -webkit-mask: ' + ICON_QUOTE + ' center / contain no-repeat;',
      '  mask: ' + ICON_QUOTE + ' center / contain no-repeat;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] hr { background: var(--gpt-rule); }',

      '/* ===== 9. 行内代码 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] :not(pre) > code {',
      '  background-color: var(--gpt-inline-code);',
      '  border: 1px solid var(--gpt-code-line);',
      '  border-radius: 6px;',
      '  padding: 2px 6px;',
      '}',

      '/* ===== 10. 代码块：外框 + 分色头栏 + 语言图标 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_block"] {',
      '  --dsl-code-block-border-radius: 12px;',
      '  --dsl-code-block-background: var(--gpt-code-bg);',
      '  --dsl-code-block-banner-background-color: var(--gpt-code-head);',
      '  border: 1px solid var(--gpt-code-line);',
      '  overflow: hidden;',
      '}',
      'html[' + ROOT_ATTR + '] [data-code-block-banner] { border-bottom: 1px solid var(--gpt-code-line); }',
      'html[' + ROOT_ATTR + '] [data-code-block-banner] [class*="_infostring"] {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  font-weight: 600;',
      '}',
      'html[' + ROOT_ATTR + '] [data-code-block-banner] [class*="_infostring"]::before {',
      '  content: "";',
      '  flex: none;',
      '  width: 13px;',
      '  height: 13px;',
      '  background-color: var(--gpt-accent);',
      '  -webkit-mask: ' + ICON_CODE + ' center / contain no-repeat;',
      '  mask: ' + ICON_CODE + ' center / contain no-repeat;',
      '}',

      '/* ===== 11. 表格 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_tableScroll"] table {',
      '  border: 1px solid var(--gpt-code-line);',
      '  border-radius: 10px;',
      '  overflow: hidden;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_tableScroll"] th {',
      '  background: var(--gpt-table-head);',
      '  border-bottom: 1px solid var(--gpt-rule);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_tableScroll"] th,',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_tableScroll"] td {',
      '  padding: 10px 14px;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] [class*="_tableScroll"] tr + tr td {',
      '  border-top: 1px solid var(--gpt-code-line);',
      '}',

      '/* ===== 12. 行内语义：==加强== 绿，!!警惕!! 红 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl {',
      '  font-weight: 600;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl::before {',
      '  content: "";',
      '  display: inline-block;',
      '  width: 13px;',
      '  height: 13px;',
      '  margin-right: 4px;',
      '  vertical-align: -2px;',
      '  background-color: currentColor;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-ok { color: var(--gpt-ok); }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-ok::before {',
      '  -webkit-mask: ' + ICON_CHECK + ' center / contain no-repeat;',
      '  mask: ' + ICON_CHECK + ' center / contain no-repeat;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-warn { color: var(--gpt-warn); }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-warn::before {',
      '  -webkit-mask: ' + ICON_WARN + ' center / contain no-repeat;',
      '  mask: ' + ICON_WARN + ' center / contain no-repeat;',
      '}',
      '/* ++重点词++（含裸 4xx/5xx 自动命中）：绿色加粗 + 淡绿底，不带图标 */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-key {',
      '  color: var(--gpt-ok);',
      '  font-weight: 700;',
      '  background: var(--gpt-ok-bg);',
      '  border-radius: 4px;',
      '  padding: 0 3px;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-hl-key::before { content: none; display: none; }',

      '/* ===== 13. 整行标注：✅ 一行为绿卡，⚠️ 一行为红卡，💡 一行为蓝卡 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout {',
      '  margin: 16px 0;',
      '  padding: 8px 14px;',
      '  border-left: 3px solid var(--gpt-callout-fg);',
      '  border-radius: 0 10px 10px 0;',
      '  background: var(--gpt-callout-bg);',
      '  color: var(--gpt-callout-fg);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] li.gpt-callout { list-style: none; margin-left: -22px; }',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout::before {',
      '  content: "";',
      '  display: inline-block;',
      '  width: 15px;',
      '  height: 15px;',
      '  margin-right: 7px;',
      '  vertical-align: -2px;',
      '  background-color: currentColor;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-ok {',
      '  --gpt-callout-fg: var(--gpt-ok);',
      '  --gpt-callout-bg: var(--gpt-ok-bg);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-ok::before {',
      '  -webkit-mask: ' + ICON_CHECK + ' center / contain no-repeat;',
      '  mask: ' + ICON_CHECK + ' center / contain no-repeat;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-warn {',
      '  --gpt-callout-fg: var(--gpt-warn);',
      '  --gpt-callout-bg: var(--gpt-warn-bg);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-warn::before {',
      '  -webkit-mask: ' + ICON_WARN + ' center / contain no-repeat;',
      '  mask: ' + ICON_WARN + ' center / contain no-repeat;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-tip {',
      '  --gpt-callout-fg: var(--gpt-tip);',
      '  --gpt-callout-bg: var(--gpt-tip-bg);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_markdown"] .gpt-callout-tip::before {',
      '  -webkit-mask: ' + ICON_BULB + ' center / contain no-repeat;',
      '  mask: ' + ICON_BULB + ' center / contain no-repeat;',
      '}',

      '/* ===== 13. 思考 / 快速胶囊：挂在发送框旁边，一键切推理强度 ===== */',
      'html[' + ROOT_ATTR + '] .gpt-mode {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '  flex: 0 0 auto;',
      '  align-self: center;',
      '  height: 26px;',
      '  margin-left: 6px;',
      '  padding: 0 10px;',
      '  border: 1px solid var(--gpt-mode-line);',
      '  border-radius: 999px;',
      '  background: var(--gpt-mode-bg);',
      '  color: var(--gpt-mode-fg);',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  line-height: 1;',
      '  white-space: nowrap;',
      '  cursor: pointer;',
      '  transition: filter .14s ease, opacity .14s ease;',
      '}',
      'html[' + ROOT_ATTR + '] .gpt-mode[hidden] { display: none; }',
      'html[' + ROOT_ATTR + '] .gpt-mode:hover { filter: brightness(.95); }',
      'html[' + ROOT_ATTR + '] .gpt-mode[data-busy="1"] { opacity: .55; pointer-events: none; }',
      'html[' + ROOT_ATTR + '] .gpt-mode::before {',
      '  content: "";',
      '  width: 13px;',
      '  height: 13px;',
      '  flex: 0 0 auto;',
      '  background-color: currentColor;',
      '}',
      'html[' + ROOT_ATTR + '] .gpt-mode[data-mode="fast"] { --gpt-mode-fg: var(--gpt-mode-fast-fg); --gpt-mode-bg: var(--gpt-mode-fast-bg); --gpt-mode-line: var(--gpt-mode-fast-line); }',
      'html[' + ROOT_ATTR + '] .gpt-mode[data-mode="fast"]::before {',
      '  -webkit-mask: ' + ICON_BOLT + ' center / contain no-repeat;',
      '  mask: ' + ICON_BOLT + ' center / contain no-repeat;',
      '}',
      'html[' + ROOT_ATTR + '] .gpt-mode[data-mode="think"] { --gpt-mode-fg: var(--gpt-mode-think-fg); --gpt-mode-bg: var(--gpt-mode-think-bg); --gpt-mode-line: var(--gpt-mode-think-line); }',
      'html[' + ROOT_ATTR + '] .gpt-mode[data-mode="think"]::before {',
      '  -webkit-mask: ' + ICON_SPARK + ' center / contain no-repeat;',
      '  mask: ' + ICON_SPARK + ' center / contain no-repeat;',
      '}',

      '/* ===== 14. 左侧工作区：选中的会话一眼看得见，文件夹图标上色 ===== */',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"] {',
      '  color: var(--gpt-ws-idle-fg);',
      '  font-weight: 400;',
      '  transition: background .14s ease, color .14s ease;',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"]:hover { color: var(--gpt-ink); }',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"][class*="_selected"] {',
      '  background: var(--gpt-ws-sel-bg);',
      '  color: var(--gpt-ws-sel-fg);',
      '  font-weight: 600;',
      '  box-shadow: inset 3px 0 0 var(--gpt-ws-sel-bar);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"][class*="_selected"]:hover {',
      '  background: var(--gpt-ws-sel-bg);',
      '}',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"][class*="_selected"] [class*="_title"] { font-weight: 700; }',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"][class*="_selected"] [class*="_time"],',
      'html[' + ROOT_ATTR + '] [class*="_sessionRow"][class*="_selected"] [class*="_meta"] {',
      '  color: inherit;',
      '  opacity: .78;',
      '}',
      '/* 工作区（文件夹）行：标题加重，图标换色 */',
      'html[' + ROOT_ATTR + '] [class*="_projectRow"] { font-weight: 600; }',
      'html[' + ROOT_ATTR + '] [data-row-key^="workspace:"] [class*="_folder"],',
      'html[' + ROOT_ATTR + '] [class*="_projectRow"] [class*="_folder"] { color: var(--gpt-ws-folder); }',
      'html[' + ROOT_ATTR + '] [data-row-key^="workspace:"] [class*="_folderActive"],',
      'html[' + ROOT_ATTR + '] [class*="_projectRow"] [class*="_folderActive"] { color: var(--gpt-ws-folder-open); }',
      'html[' + ROOT_ATTR + '] [class*="_folder"] svg { fill: currentColor; }',
      'html[' + ROOT_ATTR + '] [class*="_folder"] svg path { fill: currentColor; }',
    ].join('\n');

    /* ==================================================================
     * 语义标注：把 ^✅ / ^⚠️ / ^💡 的行首标记、==加强== / !!警惕!! 的行内标记
     * 渲染成带色带图标的节点。
     *
     * 只在 [data-conversation-scroll] 里的 [class*="_markdown"] 上动手，
     * 跳过 pre / code / a / katex —— 代码块和公式里的 == !! 原样保留。
     * 转换是幂等的：装饰完的文本里不再含标记，重复扫描不会二次包裹。
     * ================================================================== */
    var SCAN_SCOPE = '[data-conversation-scroll]';
    var MD_CLASS = /(^|\s)\S*_markdown(\s|$)/;
    var SKIP_TAGS = { PRE: 1, CODE: 1, A: 1, SVG: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, KBD: 1 };
    var HOST_TAGS = { P: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 };

    var INLINE = [
      { re: /==([^=\n]+?)==/g, cls: 'gpt-hl-ok' },
      { re: /!!([^!\n]+?)!!/g, cls: 'gpt-hl-warn' },
      { re: /\+\+([^+\n]+?)\+\+/g, cls: 'gpt-hl-key' }
    ];
    /* 裸的 HTTP 错误码自动算重点：403 / 500 这种一眼要看见的词不用手写标记 */
    var AUTO_KEY = /\b[45]\d\d\b/g;
    var BLOCK = [
      { re: /^(?:\u2705|\uD83D\uDFE2)\s*/, cls: 'gpt-callout-ok' },        /* ✅ 🟢 */
      { re: /^(?:\u26A0\uFE0F|\u26A0|\uD83D\uDD34)\s*/, cls: 'gpt-callout-warn' }, /* ⚠️ ⚠ 🔴 */
      { re: /^(?:\uD83D\uDCA1)\s*/, cls: 'gpt-callout-tip' }                /* 💡 */
    ];

    function addClass(el, cls) {
      if (el.classList && el.classList.add) { el.classList.add(cls); return; }
      var cur = typeof el.className === 'string' ? el.className : '';
      if ((' ' + cur + ' ').indexOf(' ' + cls + ' ') < 0) el.className = cur ? cur + ' ' + cls : cls;
    }

    /* 纯函数：文本里的全部行内标记，去掉重叠后按位置排序 */
    function findInline(text) {
      var hits = [];
      for (var i = 0; i < INLINE.length; i++) {
        var rule = INLINE[i];
        var m;
        rule.re.lastIndex = 0;
        while ((m = rule.re.exec(text)) !== null) {
          if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
          if (m[1].replace(/\s/g, '') === '') continue;
          hits.push({ start: m.index, end: m.index + m[0].length, cls: rule.cls, inner: m[1] });
        }
      }
      /* 自动命中排在标记之后：同一位置时先出现的标记赢（重叠过滤按 start 顺序） */
      AUTO_KEY.lastIndex = 0;
      var auto;
      while ((auto = AUTO_KEY.exec(text)) !== null) {
        if (auto.index === AUTO_KEY.lastIndex) AUTO_KEY.lastIndex++;
        hits.push({ start: auto.index, end: auto.index + auto[0].length, cls: 'gpt-hl-key', inner: auto[0] });
      }
      hits.sort(function (a, b) { return a.start - b.start; });
      var out = [];
      var last = -1;
      for (var j = 0; j < hits.length; j++) {
        if (hits[j].start >= last) { out.push(hits[j]); last = hits[j].end; }
      }
      return out;
    }

    /* 纯函数：行首标记 → { cls, rest } */
    function matchBlock(text) {
      for (var i = 0; i < BLOCK.length; i++) {
        var m = BLOCK[i].re.exec(text);
        if (m !== null) return { cls: BLOCK[i].cls, rest: text.slice(m[0].length) };
      }
      return null;
    }

    /* 块级宿主的第一个子节点必须是文本节点，标记才算在行首 */
    function leadingText(el) {
      if (el.childNodes.length === 0) return null;
      var c = el.childNodes[0];
      return c.nodeType === 3 ? c : null;
    }

    function decorateText(node) {
      var text = node.nodeValue;
      if (typeof text !== 'string' || text === '') return;
      var parent = node.parentNode;
      if (parent && parent.nodeType === 1 && HOST_TAGS[parent.tagName] && leadingText(parent) === node) {
        var b = matchBlock(text);
        if (b !== null) {
          addClass(parent, 'gpt-callout ' + b.cls);
          node.nodeValue = b.rest;
          text = b.rest;
          if (text === '') return;
        }
      }
      var hits = findInline(text);
      if (hits.length === 0) return;
      var frag = document.createDocumentFragment();
      var pos = 0;
      for (var i = 0; i < hits.length; i++) {
        var h = hits[i];
        if (h.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, h.start)));
        var span = document.createElement('span');
        span.className = 'gpt-hl ' + h.cls;
        span.textContent = h.inner;
        frag.appendChild(span);
        pos = h.end;
      }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      parent.replaceChild(frag, node);
    }

    function walk(node) {
      var kids = [];
      for (var i = 0; i < node.childNodes.length; i++) kids.push(node.childNodes[i]);
      for (var j = 0; j < kids.length; j++) {
        var c = kids[j];
        if (c.nodeType === 3) { decorateText(c); continue; }
        if (c.nodeType !== 1) continue;
        if (SKIP_TAGS[c.tagName]) continue;
        if (typeof c.className === 'string' && c.className.indexOf('katex') >= 0) continue;
        /* 已经装饰过的 span 不再进去：自动命中没有"消耗标记"这一步，重复扫描会越套越深 */
        if (typeof c.className === 'string' && c.className.indexOf('gpt-hl') >= 0) continue;
        walk(c);
      }
    }

    function isMarkdown(el) {
      return el.nodeType === 1 && typeof el.className === 'string' && MD_CLASS.test(el.className);
    }

    function closestMarkdown(el) {
      while (el && el.nodeType === 1) {
        if (isMarkdown(el)) return el;
        el = el.parentNode;
      }
      return null;
    }

    var pending = [];
    var scheduled = false;
    var raf = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : function (fn) { return setTimeout(fn, 16); };

    function queue(root) {
      if (root === null || pending.indexOf(root) >= 0) return;
      pending.push(root);
      if (scheduled) return;
      scheduled = true;
      raf(flush);
    }

    /* 正在流式输出的消息一律不碰。
       React 记住的是它自己建的那个文本节点；把它 replaceChild 掉之后，
       后续 token 会写到已经脱离文档的节点上，正文就停在原地不动了。
       宿主在流式期间给助理消息的根节点挂着 data-streaming，摘掉它才算写完。 */
    function isStreaming(el) {
      while (el && el.nodeType === 1) {
        if (typeof el.hasAttribute === 'function' && el.hasAttribute('data-streaming')) return true;
        el = el.parentNode;
      }
      return false;
    }

    function flush() {
      scheduled = false;
      var roots = pending;
      pending = [];
      for (var i = 0; i < roots.length; i++) {
        if (roots[i].isConnected === false) continue;
        if (isStreaming(roots[i])) continue;
        walk(roots[i]);
      }
    }

    function onChange(records) {
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var t = rec.target;
        /* 属性记录只来自 data-streaming：流式结束时它是被摘掉的那一刻，
           此刻把这条消息里的 markdown 重排一遍（流式期间 flush 会自己跳过）。 */
        if (rec.type === 'attributes' || rec.attributeName === 'data-streaming') {
          var inner = t.nodeType === 1 && typeof t.querySelectorAll === 'function'
            ? t.querySelectorAll('[class*="_markdown"]')
            : [];
          for (var k = 0; k < inner.length; k++) queue(inner[k]);
          continue;
        }
        var el = t.nodeType === 1 ? t : t.parentNode;
        var root = closestMarkdown(el);
        if (root !== null) queue(root);
      }
    }

    function scanAll() {
      var roots = document.querySelectorAll(SCAN_SCOPE + ' ' + '[class*="_markdown"]');
      for (var i = 0; i < roots.length; i++) {
        if (!isStreaming(roots[i])) walk(roots[i]);
      }
    }

    /* ==================================================================
     * 思考 / 快速 一键切换：贴在发送框旁边的胶囊。
     *
     * 为什么需要它：宿主只在「适配器发布了推理元数据」时才画推理强度那一行
     * （dsh-client-ui-model-selection：「适配器没有推理元数据时不显示 Effort 行」）。
     * kso-codeplan 路由声明了 reasoningEfforts（见 profile 的 cordis.patch.yml）之后，
     * 目录里每个模型才带 reasoning.efforts —— 这个胶囊读的就是那份数据。
     *
     * 数据与提交全部走宿主唯一真源 ctx.modelDirectories，本插件不缓存模型列表：
     *   directoryFor(sessionId).store.getSnapshot() -> { current, groups, ... }
     *   directoryFor(sessionId).select({ provider, model, reasoningEffort }) -> { ok }
     * 会话 id 取祖先上的 data-conversation-session，取不到退到 uiSession.current.value.key。
     * 模型没声明档位（少于两档）时胶囊自己隐藏，宿主那一套 UI 照常。
     * 任何一步不符合预期都只 warn，绝不抛。
     * ================================================================== */
    var MODE_CLASS = 'gpt-mode';
    var MODE_ANCHORS = [
      '[data-slot="conversation.composer.bar"]',    /* 发送框底栏：并排席位，最合适 */
      '[data-slot="conversation.input.dock"]',
      '[data-slot="conversation.input.model"]'      /* 模型席位：插在它后面，不碰席位内部 */
    ];

    function installModeToggle(ctx) {
      var service = null;        /* ctx.modelDirectories */
      var chip = null;
      var anchorEl = null;
      var dir = null;            /* 当前订阅的 ModelDirectory */
      var unsubscribe = null;
      var warned = false;
      var queued = false;

      function warn(msg, extra) {
        try {
          if (ctx && ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn(PLUGIN_ID + ': ' + msg, extra);
          else if (typeof console !== 'undefined' && console.warn) console.warn(PLUGIN_ID + ': ' + msg, extra === undefined ? '' : extra);
        } catch (e) {}
      }

      function sessionIdOf(el) {
        var node = el && el.closest ? el.closest('[data-conversation-session]') : null;
        var id = node && node.getAttribute ? node.getAttribute('data-conversation-session') : null;
        if (typeof id === 'string' && id !== '') return id;
        try {
          var ui = ctx && typeof ctx.reflect === 'function' ? ctx.reflect.get('uiSession') : null;
          var key = ui && ui.current && ui.current.value ? ui.current.value.key : null;
          return typeof key === 'string' && key !== '' ? key : null;
        } catch (e) { return null; }
      }

      function findAnchor() {
        if (typeof document.querySelector !== 'function') return null;
        for (var i = 0; i < MODE_ANCHORS.length; i++) {
          var el = document.querySelector(MODE_ANCHORS[i]);
          if (el && el.isConnected !== false) return { el: el, after: i === MODE_ANCHORS.length - 1 };
        }
        return null;
      }

      /* 目录快照 → 当前模型的可选档位；没声明 reasoning 就返回 null */
      function levelsOf(snapshot, current) {
        if (!snapshot || !current) return null;
        var groups = snapshot.groups || [];
        for (var i = 0; i < groups.length; i++) {
          var models = groups[i].models || [];
          for (var j = 0; j < models.length; j++) {
            var model = models[j];
            if (model.id !== current.model) continue;
            var reasoning = model.reasoning;
            var attempts = (reasoning && reasoning.efforts) || [];
            var ids = [];
            for (var k = 0; k < attempts.length; k++) {
              var id = typeof attempts[k] === 'string' ? attempts[k] : attempts[k] && attempts[k].id;
              if (typeof id === 'string' && id !== '' && ids.indexOf(id) < 0) ids.push(id);
            }
            if (ids.indexOf('off') < 0) ids.unshift('off');
            return { ids: ids, active: current.reasoningEffort || (reasoning && reasoning.defaultEffort) || 'off' };
          }
        }
        return null;
      }

      /* 快速 → 思考优先 high；思考 → 快速一律 off */
      function pickLevel(ids, active) {
        if (active !== 'off') return 'off';
        if (ids.indexOf('high') >= 0) return 'high';
        for (var i = ids.length - 1; i >= 0; i--) { if (ids[i] !== 'off') return ids[i]; }
        return 'off';
      }

      function bindDirectory() {
        if (!service || !chip) return null;
        var sid = sessionIdOf(chip);
        if (sid === null) return null;
        var next = null;
        try { next = service.directoryFor(sid); } catch (e) { return null; }   /* 会话作用域还没物化 */
        if (next === dir) return dir;
        if (unsubscribe !== null) { try { unsubscribe(); } catch (e) {} unsubscribe = null; }
        dir = next;
        try { unsubscribe = dir.store.subscribe(refresh); } catch (e) {}
        try {
          var loading = dir.load();
          if (loading && typeof loading.then === 'function') loading.then(refresh, function () {});
        } catch (e) {}
        return dir;
      }

      function refresh() {
        try {
          if (!chip || chip.isConnected === false) return;
          var d = bindDirectory();
          var snapshot = d === null ? null : d.store.getSnapshot();
          var info = levelsOf(snapshot, snapshot && snapshot.current);
          if (!info || info.ids.length < 2) {
            chip.hidden = true;
            if (chip.removeAttribute) chip.removeAttribute('data-mode');
            return;
          }
          var thinking = info.active !== 'off';
          chip.hidden = false;
          chip.dataset.mode = thinking ? 'think' : 'fast';
          chip.textContent = thinking ? '思考' : '快速';
          chip.title = thinking
            ? '当前：思考模式（' + info.active + '）—— 更慢、更贵\n点击切到快速模式'
            : '当前：快速模式\n点击切到思考模式';
        } catch (error) { warn('刷新思考/快速胶囊失败', error); }
      }

      function onToggle() {
        try {
          if (!chip) return;
          var d = dir !== null ? dir : bindDirectory();
          if (d === null) return;
          var snapshot = d.store.getSnapshot();
          var current = snapshot && snapshot.current;
          var info = levelsOf(snapshot, current);
          if (!current || !info || info.ids.length < 2) return;
          var next = pickLevel(info.ids, info.active);
          chip.dataset.busy = '1';
          var done = function (result) {
            if (chip) chip.dataset.busy = '';
            if (result && result.ok === false) {
              var failure = result.error || {};
              warn('切换推理强度失败：' + String(failure.message || failure.code || 'unknown'));
            }
            refresh();
          };
          var pending = d.select({ provider: current.provider, model: current.model, reasoningEffort: next });
          if (pending && typeof pending.then === 'function') {
            pending.then(done, function (error) { done(null); warn('切换推理强度异常', error); });
          } else { done(pending); }
        } catch (error) {
          if (chip) chip.dataset.busy = '';
          warn('切换推理强度异常', error);
        }
      }

      function ensureChip() {
        var found = findAnchor();
        if (found === null) {
          if (!warned) { warned = true; warn('没找到发送框锚点，思考/快速胶囊未挂载（宿主改版？）'); }
          return false;
        }
        if (chip !== null && chip.isConnected !== false && anchorEl === found.el) return true;
        if (chip === null) {
          chip = document.createElement('button');
          chip.type = 'button';
          chip.className = MODE_CLASS;
          chip.hidden = true;
          chip.setAttribute('aria-label', '推理强度：思考 / 快速');
          chip.addEventListener('click', onToggle);
        } else if (chip.parentNode) {
          chip.parentNode.removeChild(chip);
        }
        if (found.after && found.el.insertAdjacentElement) found.el.insertAdjacentElement('afterend', chip);
        else found.el.appendChild(chip);
        anchorEl = found.el;
        return true;
      }

      function maintain() {
        try { if (ensureChip()) refresh(); } catch (error) { warn('维护思考/快速胶囊失败', error); }
      }

      /* 一次动画帧内最多维护一次：DOM 变动很频繁，胶囊本身是幂等的 */
      function schedule() {
        if (queued) return;
        queued = true;
        var run = function () { queued = false; maintain(); };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else setTimeout(run, 16);
      }

      if (ctx && typeof ctx.inject === 'function') {
        ctx.inject(['modelDirectories'], function (scope) {
          service = scope.modelDirectories;
          maintain();
        });
      }

      return {
        schedule: schedule,
        maintain: maintain,
        dispose: function () {
          if (unsubscribe !== null) { try { unsubscribe(); } catch (e) {} unsubscribe = null; }
          if (chip !== null && chip.parentNode) { try { chip.parentNode.removeChild(chip); } catch (e) {} }
          chip = null; anchorEl = null; dir = null; service = null;
        }
      };
    }

    var inject = [];

    function apply(ctx) {
      var root = document.documentElement;
      root.setAttribute(ROOT_ATTR, '');

      var tag = document.createElement('style');
      tag.dataset.plugin = PLUGIN_ID;
      tag.dataset.pluginCss = PLUGIN_ID + '/chatgpt.css';
      tag.textContent = CSS;
      document.head.appendChild(tag);

      var modeToggle = null;
      try {
        modeToggle = installModeToggle(ctx);
      } catch (error) {
        if (ctx.logger && ctx.logger.warn) ctx.logger.warn(PLUGIN_ID + ': 思考/快速胶囊初始化失败', error);
      }

      var observer = null;
      try {
        scanAll();
        if (typeof MutationObserver === 'function' && document.body) {
          observer = new MutationObserver(function (records) {
            onChange(records);
            if (modeToggle !== null) modeToggle.schedule();
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['data-streaming']
          });
        }
      } catch (error) {
        if (ctx.logger && ctx.logger.warn) ctx.logger.warn(PLUGIN_ID + ': 语义标注初始化失败', error);
      }

      var dispose = function () {
        if (observer !== null) { try { observer.disconnect(); } catch (e) {} }
        if (modeToggle !== null) { try { modeToggle.dispose(); } catch (e) {} }
        tag.remove();
        root.removeAttribute(ROOT_ATTR);
      };
      /* 首屏也挂一次：观察器要等下一次变更，进入已有会话时可能很久没有变更 */
      if (modeToggle !== null) modeToggle.maintain();

      if (typeof ctx.effect === 'function') ctx.effect(function () { return dispose; }, PLUGIN_ID + ': stylesheet');
    }

    return { inject: inject, apply: apply };
  },
});
