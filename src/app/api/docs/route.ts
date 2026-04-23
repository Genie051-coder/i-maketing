import { NextResponse } from 'next/server'
import { getSwaggerSpec } from '../swagger'

export const dynamic = 'force-dynamic' // 캐싱 방지 — 항상 최신 스펙 반환

export async function GET() {
  const spec = getSwaggerSpec()
  return NextResponse.json(spec)
}
