/**
 * dsh-chatgpt-style —— 宿主半。
 *
 * 只声明一条可挂载的 entry。样式全部在浏览器半（client.js）完成。
 * 不导出 Config：没有配置卡就不会出现在插件的设置页上，也就不存在
 * 「改一个值要重启宿主」的问题 —— 想调参直接改 client.js 顶部的 CSS 变量。
 *
 * 硬约束（与 codex-ui 踩过的坑一致）：loader 用 import() 加载 entry，只认 ESM
 * 具名导出；写成 CommonJS 的 module.exports 会得到一个没有 apply 的模块，
 * 症状是插件看起来完全没生效。所以这里必须是具名 export。
 */

/** entry 名，与 package.json 的 name 一致。 */
export const name = 'dsh-chatgpt-style';

/** 宿主半不需要注册任何服务；保留空实现以满足 entry 契约。 */
export function apply() {}
