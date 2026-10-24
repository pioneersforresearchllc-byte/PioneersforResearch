// A tiny, dependency-free Markdown renderer for article bodies. It escapes all
// HTML first (content is author-supplied), then applies a safe subset:
// ## / ### headings, - and 1. lists, **bold**, *italic*, [text](url) links,
// and blank-line paragraphs. Plain text with no markdown renders as paragraphs,
// so existing articles keep working.
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function inline(s: string): string {
  let out = esc(s)
  // [text](url) — only http(s) / mailto, rendered safe.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/[^\s)]*)\)/g, (_m, text, url) => {
    const internal = String(url).startsWith('/')
    const rel = internal ? '' : ' target="_blank" rel="noopener nofollow"'
    return `<a href="${url}" class="text-navy underline"${rel}>${text}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return out
}

function toHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      html.push(`<p class="mb-4 leading-[2]">${para.map(inline).join('<br/>')}</p>`)
      para = []
    }
  }
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const h = line.match(/^(#{2,3})\s+(.*)$/)
    const ul = line.match(/^[-*]\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (h) {
      flushPara(); closeList()
      const level = h[1].length // 2 or 3
      const cls = level === 2 ? 'font-heading mt-7 mb-3 text-[22px] font-bold text-navy' : 'font-heading mt-5 mb-2 text-[18px] font-bold text-navy'
      html.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`)
    } else if (ul) {
      flushPara()
      if (list !== 'ul') { closeList(); html.push('<ul class="mb-4 list-disc pr-6 space-y-1.5">'); list = 'ul' }
      html.push(`<li class="leading-[1.9]">${inline(ul[1])}</li>`)
    } else if (ol) {
      flushPara()
      if (list !== 'ol') { closeList(); html.push('<ol class="mb-4 list-decimal pr-6 space-y-1.5">'); list = 'ol' }
      html.push(`<li class="leading-[1.9]">${inline(ol[1])}</li>`)
    } else if (line === '') {
      flushPara(); closeList()
    } else {
      closeList()
      para.push(line)
    }
  }
  flushPara(); closeList()
  return html.join('\n')
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: toHtml(source) }} />
}
