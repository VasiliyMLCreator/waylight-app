import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DOMPurify from 'dompurify'

function formatReferences(text) {
  return text.split('\n').map((line) => {
    try {
      const value = JSON.parse(line.trim())
      if (!value || Object.keys(value).sort().join(',') !== 'reference,title' || typeof value.title !== 'string' || typeof value.reference !== 'string') return line
      const url = new URL(value.reference)
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return line
      return `[${value.title.replace(/[\[\]]/g, '')}](${url.href.replace(/[()\s]/g, encodeURIComponent)})`
    } catch { return line }
  }).join('\n')
}

function Diagram({ html }) {
  const frameRef = useRef(null)
  const observerRef = useRef(null)
  useEffect(() => () => observerRef.current?.disconnect(), [])
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['section','article','div','span','p','h1','h2','h3','h4','ul','ol','li','strong','em','b','i','small','br','hr','table','thead','tbody','tr','th','td','svg','path','circle','rect','line','polyline','polygon','text','style'], ALLOWED_ATTR: ['class','aria-label','role','viewBox','width','height','d','fill','stroke','stroke-width','cx','cy','r','x','y','x1','x2','y1','y2','points','style'], FORBID_ATTR: ['onload','onclick'] })
  const document = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; base-uri 'none'"><style>html{color-scheme:dark}body{background:#101010;color:#fff;font:14px/1.6 system-ui;margin:0;padding:18px}*{box-sizing:border-box;max-width:100%}section,article{border:1px solid #555;border-radius:20px;padding:16px}svg{height:auto}</style></head><body>${clean}</body></html>`
  const resize = () => {
    const frame = frameRef.current
    const body = frame?.contentDocument?.body
    if (!body) return
    observerRef.current?.disconnect()
    const update = () => { frame.style.height = `${Math.ceil(Math.max(body.scrollHeight, body.getBoundingClientRect().height))}px` }
    observerRef.current = new ResizeObserver(update)
    observerRef.current.observe(body)
    update()
  }
  return <iframe ref={frameRef} className="message-diagram" title="Схема в ответе" sandbox="allow-same-origin" srcDoc={document} onLoad={resize} scrolling="no" />
}

function SourceLink({ children, href }) {
  const label = typeof children?.[0] === 'string' ? children[0] : ''
  let display = children
  try {
    if (/^https?:\/\//i.test(label) || label === href) display = new URL(href).hostname.replace(/^www\./, '')
  } catch {}
  return <a className="message-source" href={href} target="_blank" rel="noopener noreferrer" title={label || 'Открыть источник'}>{display}</a>
}

export function MessageText({ text }) {
  const parts = text.split(/(<waylight-diagram\b[^>]*>[\s\S]*?<\/waylight-diagram>|```html\s*[\s\S]*?```)/gi)
  return <div className="message-markdown">{parts.map((part, index) => {
    const diagram = part.match(/^<waylight-diagram\b[^>]*>([\s\S]*?)<\/waylight-diagram>$/i) || part.match(/^```html\s*([\s\S]*?)```$/i)
    if (diagram) return <Diagram key={index} html={diagram[1]} />
    return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]} components={{ a: SourceLink, img: () => null }} skipHtml>{formatReferences(part)}</ReactMarkdown>
  })}</div>
}
