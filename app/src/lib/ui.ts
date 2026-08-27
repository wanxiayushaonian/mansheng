/**
 * UI 语义色 token 引用（CSS 变量字符串）。
 * 引用变量而非硬编码色值：暗色模式只需切换 :root/[data-theme] 即可全站生效。
 * 仅用于 style 样式；画布/SVG 属性请用 lib/colors 的 hex 版函数。
 */
export const C = {
  paper: 'var(--paper)',
  paper2: 'var(--paper-2)',
  paper3: 'var(--paper-3)',
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',
  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',
  moss: 'var(--moss)',
  clay: 'var(--clay)',
  ochre: 'var(--ochre)',
  rose: 'var(--rose)',
  slate: 'var(--slate)',
  plum: 'var(--plum)',
  accent: 'var(--accent-color)',
  accentSoft: 'var(--accent-soft)',
}
