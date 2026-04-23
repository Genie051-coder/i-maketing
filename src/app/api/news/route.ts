// ─────────────────────────────────────────
// app/api/news/route.ts
// ─────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { parse as parseHtml } from 'node-html-parser'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const date = searchParams.get('date')
  const daysParam = searchParams.get('days')
  const limitParam = searchParams.get('limit')

  if (!query) {
    return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })
  }

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`

  try {
    const response = await fetch(rssUrl, { next: { revalidate: 0 } })
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: response.status })
    }

    const xmlText = await response.text()
    let items = parseRSSItems(xmlText)

    // RSS는 최신순으로 오므로, date/days 필터 없으면 현재→과거 순 그대로 유지
    if (date) {
      items = items.filter((item) => {
        try {
          return new Date(item.pubDate).toISOString().slice(0, 10) === date
        } catch {
          return false
        }
      })
    } else if (daysParam) {
      const days = parseInt(daysParam, 10)
      if (!isNaN(days) && days > 0) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        items = items.filter((item) => {
          try {
            return new Date(item.pubDate) >= cutoff
          } catch {
            return false
          }
        })
      }
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    if (limit && !isNaN(limit) && limit > 0) {
      items = items.slice(0, limit)
    }

    // Google News 링크 → 실제 URL 병렬 변환 (실패 시 원본 link 사용)
    const decoded = await Promise.all(
      items.map(async (item) => {
        const resolved = await resolveGoogleNewsUrl(item.link)
        return { ...item, articleUrl: resolved || item.link }
      })
    )

    return NextResponse.json({ query, date: date || null, total: decoded.length, items: decoded })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Google News RSS URL → 실제 기사 URL
 *
 * 2024년 중반 이후 GET 리다이렉트 방식이 동작하지 않음.
 * 1) 페이지 GET (CONSENT 쿠키로 동의 우회) → c-wiz[data-p] 파싱
 * 2) batchexecute API로 실제 URL 조회
 * 참고: https://stackoverflow.com/a/79388987
 */
async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    if (!googleUrl.includes('news.google.com') || !googleUrl.includes('/articles/')) {
      return ''
    }

    const fetchOpts = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.ko-KR+FX+123',
      },
    } as const

    // 1) 구형 URL: GET 리다이렉트 시도
    const res = await fetch(googleUrl, { ...fetchOpts, redirect: 'manual' })
    const location = res.headers.get('location')
    if (
      location &&
      !location.includes('news.google.com') &&
      !location.includes('google.com/sorry')
    ) {
      return location
    }

    // 2) 신형 URL: 페이지에서 data-p 추출 후 batchexecute 호출
    const pageRes = await fetch(googleUrl, fetchOpts)
    const html = await pageRes.text()
    const root = parseHtml(html)
    const cwiz = root.querySelector('c-wiz[data-p]')
    const dataP = cwiz?.getAttribute('data-p')
    if (!dataP) return ''

    const jsonStr = dataP.replace(/^%\.@\./, '["garturlreq",')
    let obj: unknown
    try {
      obj = JSON.parse(jsonStr)
    } catch {
      return ''
    }
    if (!Array.isArray(obj)) return ''

    const payloadArr = obj.slice(0, -6).concat(obj.slice(-2))
    const payload = JSON.stringify([[['Fbv4je', JSON.stringify(payloadArr), 'null', 'generic']]])

    const batchexecuteRes = await fetch(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Referer: 'https://news.google.com/',
          ...fetchOpts.headers,
        },
        body: 'f.req=' + encodeURIComponent(payload),
      }
    )

    const text = await batchexecuteRes.text()
    const cleaned = text.replace(/^\)\]\}'[\r\n]*/, '')
    let parsed: unknown[]
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return ''
    }
    const first = parsed[0]
    if (Array.isArray(first) && first[2] != null) {
      const inner = JSON.parse(String(first[2]))
      if (Array.isArray(inner) && inner[1]) {
        const url = String(inner[1])
        if (url && !url.includes('news.google.com')) return url
      }
    }

    return ''
  } catch {
    return ''
  }
}

// ─── 이하 파싱 유틸 동일 ───────────────────

interface RSSItem {
  title: string
  link: string
  articleUrl: string
  pubDate: string
  description: string
  source: string
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const x = match[1]
    items.push({
      title: cleanCDATA(extractTag(x, 'title')),
      link: cleanCDATA(extractTag(x, 'link')),
      articleUrl: '',
      pubDate: cleanCDATA(extractTag(x, 'pubDate')),
      description: cleanCDATA(extractTag(x, 'description')),
      source: cleanCDATA(extractTag(x, 'source')),
    })
  }
  return items
}

function extractTag(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)
  return m ? m[1].trim() : ''
}

function cleanCDATA(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}
