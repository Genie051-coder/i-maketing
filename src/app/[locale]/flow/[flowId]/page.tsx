import { Flow } from '@/features/flow/Flow'

type Props = { params: Promise<{ locale: string; flowId: string }> }

export default async function FlowPage({ params }: Props) {
  const { flowId } = await params
  return <Flow flowId={flowId} />
}
