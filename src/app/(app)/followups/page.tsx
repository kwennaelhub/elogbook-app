import { getFollowups, getFollowupStats } from '@/lib/actions/followups'
import { FollowupPanel } from '@/components/followups/followup-panel'

export default async function FollowupsPage() {
  const [followups, stats] = await Promise.all([
    getFollowups(),
    getFollowupStats(),
  ])

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <FollowupPanel initialFollowups={followups} stats={stats} />
    </div>
  )
}
