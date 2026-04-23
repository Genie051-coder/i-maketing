import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/shared/libs/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  const flows = await prisma.flow.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, createdAt: true, definition: true },
  })

  const result = flows.map((flow) => {
    const def = flow.definition as { type?: string; nodes?: { type: string }[] } | null
    // definition.type 우선, 없으면 노드 구성으로 추론 (구형 플로우 호환)
    const flowType =
      def?.type ??
      (def?.nodes?.some((n) => n.type === 'news-source' || n.type.startsWith('fb-'))
        ? 'facebook'
        : 'email')
    return {
      id: flow.id,
      title: flow.title,
      createdAt: flow.createdAt,
      type: flowType,
    }
  })

  return NextResponse.json(result)
}
