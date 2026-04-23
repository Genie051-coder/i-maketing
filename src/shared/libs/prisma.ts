/**
 * Prisma 싱글턴 클라이언트
 *
 * Next.js 개발 환경에서 HMR(Hot Module Replacement)마다 PrismaClient가 중복 생성되는 것을 막기 위해
 * globalThis에 인스턴스를 캐싱합니다. 프로덕션에서는 캐싱하지 않습니다.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
