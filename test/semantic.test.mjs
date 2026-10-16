/* dsh-chatgpt-style 自测：用假 DOM 跑一遍真实的 client.js，验证语义标注。
 * 运行：node test/semantic.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

/* ---------- 极简假 DOM：只实现 client.js 用到的那些成员 ---------- */
class TextNode {
  constructor(v) { this.nodeType = 3; this.nodeValue = v; this.parentNode = null; this.childNodes = []; }
}
class Element {
  constructor(tag) {
    this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.className = '';
    this.childNodes = []; this.parentNode = null; this.isConnected = true;
    this.dataset = {}; this.attrs = {};
    const self = this;
    this.classList = { add(c) { if (!self.hasClass(c)) self.className = self.className ? self.className + ' ' + c : c; } };
  }
  hasClass(c) { return (' ' + this.className + ' ').includes(' ' + c + ' '); }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  closest(sel) {
    const m = /^\[data-([a-z-]+)\]$/.exec(sel);
    let n = this;
    while (n) { if (m && n.attrs && ('data-' + m[1]) in n.attrs) return n; n = n.parentNode; }
    return null;
  }
  addEventListener(type, fn) { this.handlers = this.handlers || {}; this.handlers[type] = (this.handlers[type] || []).concat(fn); }
  click() { const hs = (this.handlers && this.handlers.click) || []; for (const h of hs) h(); }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
  insertAdjacentElement(pos, node) {
    if (pos === 'afterend' && this.parentNode) { this.parentNode.appendChild(node); return node; }
    this.appendChild(node); return node;
  }
  querySelectorAll(sel) {
    const m = /class\*="_([A-Za-z0-9]+)"/.exec(sel);
    const out = [];
    const visit = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeType !== 1) continue;
        if (m && (' ' + c.className + ' ').includes('_' + m[1])) out.push(c);
        visit(c);
      }
    };
    visit(this);
    return out;
  }
  appendChild(n) {
    if (n.nodeType === 11) { for (const k of n.childNodes) { k.parentNode = this; this.childNodes.push(k); } n.childNodes = []; return n; }
    n.parentNode = this; this.childNodes.push(n); return n;
  }
  replaceChild(nw, old) {
    const i = this.childNodes.indexOf(old);
    if (i < 0) throw new Error('replaceChild: 不是子节点');
    const repl = nw.nodeType === 11 ? nw.childNodes.slice() : [nw];
    for (const k of repl) k.parentNode = this;
    this.childNodes.splice(i, 1, ...repl);
    if (nw.nodeType === 11) nw.childNodes = [];
    old.parentNode = null;
    return old;
  }
  remove() {
    const p = this.parentNode;
    if (!p) return;
    p.childNodes.splice(p.childNodes.indexOf(this), 1);
    this.parentNode = null;
  }
  get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join(''); }
  set textContent(v) { this.childNodes = []; if (v !== '') this.appendChild(new TextNode(v)); }
}
class Fragment {
  constructor() { this.nodeType = 11; this.childNodes = []; }
  appendChild(n) { this.childNodes.push(n); return n; }
}

const roots = [];
const doc = {
  documentElement: new Element('html'),
  head: new Element('head'),
  body: new Element('body'),
  createElement: (t) => new Element(t),
  createTextNode: (v) => new TextNode(v),
  createDocumentFragment: () => new Fragment(),
  querySelectorAll: () => roots,
  querySelector: (sel) => anchors.get(sel) || null,
};
/* document.querySelector 认的锚点：只登记发送框底栏那一个，其余返回 null */
const anchors = new Map();
const observers = [];
class FakeObserver {
  constructor(cb) { this.cb = cb; observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
}

/* ---------- 装载真实的 client.js ---------- */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'client.js'), 'utf8');
let loaded = null;
const sandbox = {
  window: { __ModuleLoader__: { load: (def) => { loaded = def; } } },
  document: doc,
  requestAnimationFrame: (fn) => { fn(); return 0; },
  MutationObserver: FakeObserver,
  console,
};
vm.createContext(sandbox);
new vm.Script(source, { filename: 'client.js' }).runInContext(sandbox);
if (loaded === null) throw new Error('__ModuleLoader__.load 未被调用');
if (loaded.id !== 'dsh-chatgpt-style') throw new Error('插件 id 不符: ' + loaded.id);

/* ---------- 造一棵会话 DOM ---------- */
const md = new Element('div');
md.className = 'v5IAXa_markdown';
const para = (t) => { const p = new Element('p'); p.textContent = t; return p; };

const pOk = para('✅ 依赖已经写进 profile');
const pMixed = para('这是 ==重要结论== 和 !!风险点!! 混排');
const pTip = para('💡 刷新页面就行');
const pre = new Element('pre');
const code = new Element('code');
code.textContent = 'echo ==不要在代码里换== !!也不要!! 403';
pre.appendChild(code);
const li = new Element('li');
li.textContent = '⚠️ 重启前先存一下改动';
const ul = new Element('ul');
ul.appendChild(li);
const katex = new Element('span');
katex.className = 'katex-display';
katex.textContent = 'a!!b';
const plain = para('没有标记的一行');
const pKey = para('网关返回 ++403++，另一个口子是 500 直接挂');
for (const n of [pOk, pMixed, pTip, pre, ul, katex, plain, pKey]) md.appendChild(n);
roots.push(md);

/* ---------- 思考/快速胶囊的夹具 ---------- */
const composerBar = new Element('div');
composerBar.setAttribute('data-slot', 'conversation.composer.bar');
const sessionRoot = new Element('div');
sessionRoot.setAttribute('data-conversation-session', 'session-1');
sessionRoot.appendChild(composerBar);
anchors.set('[data-slot="conversation.composer.bar"]', composerBar);

const modeState = {
  sessionId: 'session-1',
  current: { provider: 'kso-codeplan', model: 'deepseek/deepseek-v4.1-flash', reasoningEffort: 'off' },
  efforts: [{ id: 'off', name: '快速' }, { id: 'high', name: '思考' }],
  listeners: [],
  selects: [],
};
const directory = {
  store: {
    getSnapshot: () => ({
      current: modeState.current,
      groups: [{ id: 'kso', models: [{ id: 'deepseek/deepseek-v4.1-flash', reasoning: modeState.efforts === null ? undefined : { efforts: modeState.efforts, defaultEffort: 'off' } }] }],
    }),
    subscribe: (fn) => { modeState.listeners.push(fn); return () => { const i = modeState.listeners.indexOf(fn); if (i >= 0) modeState.listeners.splice(i, 1); }; },
  },
  load: () => Promise.resolve(),
  select: (selection) => { modeState.selects.push(selection); return Promise.resolve({ ok: true }); },
};
const modelDirectories = { directoryFor: (sid) => { if (sid !== modeState.sessionId) throw new Error('会话未物化'); return directory; } };
const fireStore = () => modeState.listeners.slice().forEach((fn) => fn());

/* ---------- 激活 ---------- */
let dispose = null;
const mod = loaded.factory();
const warnings = [];
mod.apply({
  effect: (fn) => { dispose = fn(); },
  inject: (deps, cb) => { if (deps.indexOf('modelDirectories') >= 0) cb({ modelDirectories }); },
  reflect: { get: () => null },
  logger: { warn: (...args) => warnings.push(args.join(' ')) },
});

/* ---------- 断言 ---------- */
let failed = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  ok   ' + name);
  else { failed++; console.log('  FAIL ' + name + (extra ? '   ' + extra : '')); }
};
const spansOf = (el) => el.childNodes.filter((c) => c.nodeType === 1 && c.tagName === 'SPAN');

console.log('整行标注：');
check('✅ 一行拿到 gpt-callout-ok', pOk.hasClass('gpt-callout') && pOk.hasClass('gpt-callout-ok'), pOk.className);
check('✅ 表情被摘掉，剩正文', pOk.textContent === '依赖已经写进 profile', JSON.stringify(pOk.textContent));
check('⚠️ li 拿到 gpt-callout-warn', li.hasClass('gpt-callout') && li.hasClass('gpt-callout-warn'), li.className);
check('⚠️ li 正文去掉表情', li.textContent === '重启前先存一下改动', JSON.stringify(li.textContent));
check('💡 一行拿到 gpt-callout-tip', pTip.hasClass('gpt-callout-tip'), pTip.className);
check('普通段落没被染色', plain.className === '', JSON.stringify(plain.className));

console.log('行内标注：');
const s = spansOf(pMixed);
check('拆出两个 span', s.length === 2, '实际 ' + s.length);
check('第一个是绿色加强', !!s[0] && s[0].className === 'gpt-hl gpt-hl-ok' && s[0].textContent === '重要结论', s[0] ? s[0].className + ' | ' + s[0].textContent : '');
check('第二个是红色警惕', !!s[1] && s[1].className === 'gpt-hl gpt-hl-warn' && s[1].textContent === '风险点', s[1] ? s[1].className + ' | ' + s[1].textContent : '');
check('两侧普通文字保留', pMixed.textContent === '这是 重要结论 和 风险点 混排', JSON.stringify(pMixed.textContent));

console.log('重点词（绿色加粗、不带图标）：');
const keySpans = spansOf(pKey);
check('++…++ 渲染成重点 span', keySpans.length === 2 && keySpans[0].className === 'gpt-hl gpt-hl-key' && keySpans[0].textContent === '403', keySpans[0] ? keySpans[0].className + ' | ' + keySpans[0].textContent : '');
check('裸 4xx/5xx 自动命中', !!keySpans[1] && keySpans[1].className === 'gpt-hl gpt-hl-key' && keySpans[1].textContent === '500', keySpans[1] ? keySpans[1].className + ' | ' + keySpans[1].textContent : '');
check('标记被摘干净', pKey.textContent === '网关返回 403，另一个口子是 500 直接挂', JSON.stringify(pKey.textContent));

console.log('代码与公式不被动：');
check('pre/code 原样', code.textContent === 'echo ==不要在代码里换== !!也不要!! 403', JSON.stringify(code.textContent));
check('katex 原样', katex.textContent === 'a!!b', JSON.stringify(katex.textContent));

console.log('幂等：');
const before = pMixed.childNodes.length;
observers[0].cb([{ target: pMixed }]);
check('重复扫描不二次包裹', spansOf(pMixed).length === 2 && pMixed.childNodes.length === before, 'childNodes=' + pMixed.childNodes.length);

const keyChildBefore = pKey.childNodes.length;
observers[0].cb([{ target: pKey }]);
check('自动命中重复扫描不套娃', pKey.childNodes.length === keyChildBefore && spansOf(pKey).length === 2, 'childNodes=' + pKey.childNodes.length + ' spans=' + spansOf(pKey).length);

console.log('增量（模拟流式追加）：');
const fresh = para('🟢 新加的一行 ==也要变绿==');
md.appendChild(fresh);
observers[0].cb([{ target: fresh }]);
check('新增段落被整行标注', fresh.hasClass('gpt-callout-ok'), fresh.className);
check('新增段落行内也被标注', fresh.textContent === '新加的一行 也要变绿', JSON.stringify(fresh.textContent));

console.log('流式消息不碰（关键安全约束）：');
const streamRoot = new Element('div');
streamRoot.className = 'v5IAXa_root';
streamRoot.setAttribute('data-streaming', '');
const streamMd = new Element('div');
streamMd.className = 'v5IAXa_markdown';
const pStream = para('==流式里的字== 先别动，还有 !!风险!!');
streamMd.appendChild(pStream);
streamRoot.appendChild(streamMd);
roots.push(streamMd);
observers[0].cb([{ target: pStream }]);
check('流式中的正文一个字都没改', pStream.textContent === '==流式里的字== 先别动，还有 !!风险!!', JSON.stringify(pStream.textContent));
check('流式中的正文没有 span', spansOf(pStream).length === 0, '实际 ' + spansOf(pStream).length);
streamRoot.removeAttribute('data-streaming');
observers[0].cb([{ type: 'attributes', target: streamRoot }]);
check('流式结束后才标注', pStream.textContent === '流式里的字 先别动，还有 风险', '实际 ' + JSON.stringify(pStream.textContent));
check('流式结束后 span 到位', spansOf(pStream).length === 2, '实际 ' + spansOf(pStream).length);

console.log('样式表：');
const tag = doc.head.childNodes.length ? doc.head.childNodes[0] : null;
check('注入了一个 style', tag !== null && tag.tagName === 'STYLE');
if (tag) {
  const css = tag.textContent;
  check('style 带 data-plugin', !!tag.dataset && tag.dataset.plugin === 'dsh-chatgpt-style', JSON.stringify(tag.dataset));
  check('css 里有 .gpt-callout-ok', css.includes('.gpt-callout-ok'));
  check('css 里有 .gpt-hl-warn', css.includes('.gpt-hl-warn'));
  check('css 花括号配平', (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length);
  check('css 圆括号配平', (css.match(/\(/g) || []).length === (css.match(/\)/g) || []).length);
  check('data URI 里没有未转义的 #', !/url\("data:[^"]*#[^"]*"\)/.test(css));
  check('图标 data URI 数量符合预期', (css.match(/data:image\/svg/g) || []).length === 22, '实际 ' + (css.match(/data:image\/svg/g) || []).length);
}

console.log('思考/快速胶囊：');
const chip = composerBar.childNodes.find((c) => c.nodeType === 1 && c.hasClass('gpt-mode')) || null;
check('胶囊挂进发送框底栏', chip !== null);
check('挂载没报错', warnings.length === 0, warnings.join(' / '));
check('默认快速：文字 + 状态', !!chip && chip.textContent === '快速' && chip.dataset.mode === 'fast', chip ? chip.textContent + ' | ' + chip.dataset.mode : '');
check('有档位时可见', !!chip && chip.hidden === false);
check('aria-label 到位', !!chip && chip.attrs['aria-label'] === '推理强度：思考 / 快速', chip ? JSON.stringify(chip.attrs) : '');

modeState.current = { provider: 'kso-codeplan', model: 'deepseek/deepseek-v4.1-flash', reasoningEffort: 'high' };
fireStore();
check('目录变思考后胶囊跟着变', !!chip && chip.dataset.mode === 'think' && chip.textContent === '思考', chip ? chip.textContent + ' | ' + chip.dataset.mode : '');

chip.click();
check('点击提交 off', modeState.selects.length === 1 && modeState.selects[0].reasoningEffort === 'off', JSON.stringify(modeState.selects[0]));
check('提交带 provider/model', !!modeState.selects[0] && modeState.selects[0].provider === 'kso-codeplan' && modeState.selects[0].model === 'deepseek/deepseek-v4.1-flash', JSON.stringify(modeState.selects[0]));

modeState.efforts = null;
fireStore();
check('模型没声明档位时隐藏', !!chip && chip.hidden === true);

modeState.efforts = [{ id: 'off', name: '快速' }, { id: 'high', name: '思考' }];
modeState.sessionId = 'session-2';
fireStore();
check('会话没物化时不抛、只隐藏', !!chip && chip.hidden === true && warnings.length === 0, warnings.join(' / '));
modeState.sessionId = 'session-1';
fireStore();
check('会话回来后重新出现', !!chip && chip.hidden === false);

console.log('卸载：');
if (typeof dispose === 'function') dispose();
check('卸载时摘掉胶囊', composerBar.childNodes.length === 0, '剩 ' + composerBar.childNodes.length);
check('style 被移除', doc.head.childNodes.length === 0);
check('根属性被摘掉', !('data-chatgpt-style' in doc.documentElement.attrs), JSON.stringify(doc.documentElement.attrs));
check('观察器断开', observers[0].disconnected === true);

console.log('');
console.log(failed === 0 ? '全部通过' : failed + ' 项失败');
process.exitCode = failed === 0 ? 0 : 1;
