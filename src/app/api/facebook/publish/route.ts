import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

const FB_API = 'https://graph.facebook.com/v19.0'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const { content, hashtags, articleUrl } = (await req.json()) as {
    content: string
    hashtags: string[]
    articleUrl: string
  }

  // ExternalToken 테이블에서 Facebook 토큰 조회 (OAuth 시 metadata에 pageId 저장됨)
  const tokenRow = await prisma.externalToken.findFirst({
    where: { userId: session.user.id, provider: 'FACEBOOK' },
    select: { accessToken: true, metadata: true },
  })

  if (!tokenRow) {
    return NextResponse.json(
      { error: '페이스북 토큰이 없습니다. 마이페이지에서 Meta 토큰을 등록해주세요.' },
      { status: 400 }
    )
  }

  const metadata = tokenRow.metadata as { pageId?: string } | null
  const pageId = metadata?.pageId ?? process.env.FB_PAGE_ID
  if (!pageId) {
    return NextResponse.json(
      {
        error:
          '페이스북 페이지 ID가 없습니다. Meta OAuth로 페이지를 연동하거나, .env에 FB_PAGE_ID를 설정해주세요.',
      },
      { status: 400 }
    )
  }

  // 본문 + 해시태그 + 링크 조합
  const message = [content, '', hashtags.join(' ')].join('\n')

  try {
    const fbRes = await fetch(`${FB_API}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, link: articleUrl, access_token: tokenRow.accessToken }),
    })

    const fbData = (await fbRes.json()) as {
      id?: string
      error?: { message: string; code: number }
    }

    if (!fbRes.ok || fbData.error) {
      const code = fbData.error?.code
      const errMsg = fbData.error?.message ?? 'Meta API 오류'
      console.error('Meta API 오류:', fbData.error)

      if (code === 190) {
        return NextResponse.json(
          { error: '페이스북 토큰이 만료됐습니다. 마이페이지에서 토큰을 갱신해주세요.' },
          { status: 401 }
        )
      }
      if (code === 200 || code === 10) {
        return NextResponse.json(
          { error: 'pages_manage_posts 권한이 없습니다. 토큰 권한을 확인해주세요.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    const postId = fbData.id!
    const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`

    // 배포 이력 저장 (실패해도 배포 결과에 영향 없음)
    prisma.facebookPost
      .create({
        data: {
          userId: session.user.id,
          postId,
          content,
          hashtags: hashtags.join(' '),
          articleUrl,
          postUrl,
          publishedAt: new Date(),
        },
      })
      .catch((dbErr) => console.error('[facebook/publish] 이력 저장 실패:', dbErr))

    return NextResponse.json({ success: true, postId, postUrl })
  } catch (err) {
    console.error('배포 오류:', err)
    return NextResponse.json({ error: '배포 중 오류 발생' }, { status: 500 })
  }
}
