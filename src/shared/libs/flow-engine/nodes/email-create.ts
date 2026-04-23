/**
 * 이메일 콘텐츠 생성 노드 (email-create)
 *
 * nodeData.blocks(EmailBlock 배열)를 HTML 이메일 문자열로 변환합니다.
 * 변환된 html·subject·fromName·fromEmail을 다음 노드(confirm-send 등)로 전달합니다.
 *
 * 블록 타입: Text | Button | Image | Hr | List
 */
type EmailBlock =
  | { id: string; type: 'Text'; content: string; level: string }
  | { id: string; type: 'Button'; content: string; url: string }
  | { id: string; type: 'Image'; url: string; alt: string }
  | { id: string; type: 'Hr' }
  | { id: string; type: 'List'; items: string[]; style: 'bullet' | 'numbered' }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function contentToHtml(content: string): string {
  return content
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br />')
}

function blocksToHtml(blocks: EmailBlock[]): string {
  const row = (html: string, padBottom = 24) =>
    `<tr><td style="font-family:sans-serif;padding:0 0 ${padBottom}px 0;" align="left">${html}</td></tr>`

  const parts = blocks.map((b) => {
    if (b.type === 'Text') {
      const tag = b.level === 'body' ? 'p' : b.level
      const inner = b.level === 'body' ? contentToHtml(b.content) : escapeHtml(b.content)
      const style =
        b.level === 'body'
          ? ' style="font-size:16px;color:#374151;padding:0;"'
          : ' style="padding:0;"'
      return row(`<${tag}${style}>${inner}</${tag}>`)
    }
    if (b.type === 'Button') {
      const url = escapeHtml(b.url)
      const text = escapeHtml(b.content)
      return row(
        `<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td bgcolor="#0f172a" style="padding:12px 24px;"><a href="${url}" style="color:#ffffff;font-weight:bold;font-size:14px;">${text}</a></td></tr></table>`,
        24
      )
    }
    if (b.type === 'Image') {
      const src = escapeHtml(b.url)
      const alt = escapeHtml(b.alt || '')
      return row(
        `<img src="${src}" alt="${alt}" width="560" style="width:100%;height:auto;padding:0;" />`,
        16
      )
    }
    if (b.type === 'Hr') {
      return `<tr><td style="padding:24px 0 0 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e5e7eb;"></td></tr></table></td></tr><tr><td style="padding:0 0 24px 0;"></td></tr>`
    }
    if (b.type === 'List') {
      const listItems = (b.items ?? []).filter((s) => String(s).trim())
      if (listItems.length === 0) return ''
      const tag = b.style === 'numbered' ? 'ol' : 'ul'
      const lis = listItems
        .map((item) => `<li style="padding:0 0 8px 0;">${contentToHtml(String(item))}</li>`)
        .join('')
      return row(`<${tag} style="padding:0 0 0 24px;">${lis}</${tag}>`, 16)
    }
    return ''
  })

  const inner = `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>${parts.join('')}</tbody></table>`
  return `<table width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="font-family:sans-serif;"><tr><td style="padding:24px 20px;">${inner}</td></tr></table>`
}

function parseLastOutput(lastOutput: unknown): Record<string, unknown> {
  if (lastOutput == null || typeof lastOutput !== 'object' || Array.isArray(lastOutput)) return {}
  return lastOutput as Record<string, unknown>
}

export async function runEmailCreateNode(
  nodeData: Record<string, unknown>,
  lastOutput: unknown
): Promise<Record<string, unknown>> {
  const prev = parseLastOutput(lastOutput)

  const fromName = String(nodeData.fromName ?? prev.fromName ?? 'Priosma Team')
  const fromEmail = String(nodeData.fromEmail ?? prev.fromEmail ?? 'hello@priosma.com')
  const subject = String(prev.subject ?? nodeData.subject ?? '(제목 없음)')
  const blocks = Array.isArray(nodeData.blocks) ? (nodeData.blocks as EmailBlock[]) : []

  const html =
    blocks.length > 0
      ? blocksToHtml(blocks)
      : `<table width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="font-family:sans-serif;"><tr><td style="padding:24px 20px;"><p style="padding:0;">${escapeHtml(subject)}</p></td></tr></table>`

  return {
    ...prev,
    subject,
    fromName,
    fromEmail,
    html,
    ...(blocks.length > 0 ? { blocks } : {}),
  }
}
