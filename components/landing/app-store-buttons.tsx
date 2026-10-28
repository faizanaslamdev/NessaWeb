import { StoreBadges } from '@/components/site/ui'

type AppStoreButtonsProps = { className?: string }

/** App Store / Google Play buttons (chat overlays and modals). */
export default function AppStoreButtons({ className }: AppStoreButtonsProps) {
  return <StoreBadges className={className} />
}
