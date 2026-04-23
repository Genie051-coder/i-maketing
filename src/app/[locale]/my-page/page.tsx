import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { MyPageContent } from '@/features/my-page'

export default async function MyPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/')
  }
  return <MyPageContent />
}
