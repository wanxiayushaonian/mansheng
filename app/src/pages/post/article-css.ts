import { C } from '@/lib/ui'
/** 正文 + 代码块暖色系样式（作用域 .post-body，随主题 token 自适应） */
export const ARTICLE_CSS = `
.post-body { font-family: "Noto Serif SC","Source Serif 4",Georgia,serif; font-size: 1rem; line-height: 1.85; color: ${C.ink}; }
.post-body p { margin: 0 0 1.2em; }
.post-body h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.35; margin: 64px 0 24px; }
.post-body h2::before { content: "— "; color: ${C.lineStrong}; }
.post-body h3 { font-size: 1.125rem; font-weight: 600; line-height: 1.45; margin: 48px 0 16px; }
.post-body a { color: ${C.accent}; text-decoration: none; border-bottom: 1px solid ${C.accentSoft}; transition: border-color .18s; }
.post-body a:hover { border-bottom-color: ${C.accent}; }
.post-body a.wikilink--ghost { color: ${C.ink3}; border-bottom: 1px dashed ${C.ink3}; cursor: help; }
.post-body a[href^="http"]::after { content: " ↗"; font-size: .8em; }
.post-body code:not(pre code) { font-family: "JetBrains Mono",ui-monospace,monospace; font-size: .85em; background: ${C.paper2}; border-radius: 4px; padding: 2px 6px; }
.post-body pre { position: relative; background: ${C.paper2}; border: 1px solid ${C.line}; border-radius: 10px; padding: 16px 18px; overflow-x: auto; margin: 0 0 1.2em; }
.post-body pre code { font-family: "JetBrains Mono",ui-monospace,monospace; font-size: .85rem; line-height: 1.7; background: transparent; padding: 0; }
.post-body .hljs-keyword, .post-body .hljs-selector-tag { color: ${C.clay}; }
.post-body .hljs-string, .post-body .hljs-attr { color: ${C.moss}; }
.post-body .hljs-comment, .post-body .hljs-quote { color: ${C.ink3}; font-style: italic; }
.post-body .hljs-title, .post-body .hljs-title.function_ { color: ${C.accent}; }
.post-body .hljs-number, .post-body .hljs-literal { color: ${C.ochre}; }
.post-body .hljs-property, .post-body .hljs-variable { color: ${C.ink}; }
.post-body .hljs-built_in { color: ${C.plum}; }
.post-body blockquote { border-left: 3px solid ${C.ochre}; background: ${C.paper2}; color: ${C.ink2}; padding: 12px 18px; border-radius: 0 10px 10px 0; margin: 0 0 1.2em; }
.post-body blockquote p { margin: 0; }
.post-body img { border-radius: 10px; max-width: 100%; margin: 0 auto; display: block; }
.post-body ul, .post-body ol { margin: 0 0 1.2em; padding-left: 1.4em; }
.post-body li { margin-bottom: .4em; }
.post-body ul > li::marker { color: ${C.clay}; }
.post-body hr { border: none; border-top: 1px solid ${C.line}; margin: 48px 0; }
.post-body .code-copy { position: absolute; top: 8px; right: 8px; font-family: "Noto Sans SC",sans-serif; font-size: .7rem; color: ${C.ink3}; background: ${C.paper}; border: 1px solid ${C.line}; border-radius: 6px; padding: 2px 8px; opacity: 0; transition: opacity .15s; cursor: pointer; }
.post-body pre:hover .code-copy { opacity: 1; }
.post-body img.embed-img { border-radius: 10px; max-width: 100%; margin: .4em auto; display: block; border: 1px solid ${C.line}; }
.post-body .embed-note { background: ${C.paper2}; border: 1px solid ${C.line}; border-left: 3px solid ${C.ochre}; border-radius: 0 10px 10px 0; padding: 12px 16px; margin: 0 0 1.2em; }
.post-body .embed-note-title { font-family: "Noto Sans SC",sans-serif; font-size: .72rem; letter-spacing: .06em; color: ${C.ink3}; margin-bottom: 8px; }
.post-body .embed-seed { display: inline-block; font-size: .85em; color: ${C.ink3}; border: 1px dashed ${C.lineStrong}; border-radius: 6px; padding: 2px 10px; }
.post-body .mermaid-embed { display: flex; justify-content: center; background: ${C.paper2}; border: 1px solid ${C.line}; border-radius: 10px; padding: 16px; margin: 0 0 1.2em; overflow-x: auto; }
.post-body .mermaid-embed svg { max-width: 100%; height: auto; }
.post-body .katex-display { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
.post-body .katex { font-size: 1.05em; }
.post-body h2, .post-body h3 { scroll-margin-top: 84px; }
`
