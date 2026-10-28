import Link from 'next/link'

import { Brand } from '@/components/site/site-header'
import { Container, StoreBadges } from '@/components/site/ui'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig, siteRoutes } from '@/lib/constants'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'All places', href: '/places' },
      { label: 'Instant chat', href: '/chat' },
      { label: 'About NessaChat', href: siteRoutes.about },
    ],
  },
  {
    title: 'For businesses',
    links: [
      { label: 'Why Nessa', href: siteRoutes.forBusinesses },
      { label: 'Claim your place', href: `${siteRoutes.forBusinesses}#find` },
      { label: 'Business sign in', href: accountRoutes.business },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: siteRoutes.privacyPolicy },
      { label: 'Terms', href: siteRoutes.termsOfService },
      { label: 'Acceptable use', href: siteRoutes.acceptableUse },
      { label: 'Cookies', href: siteRoutes.cookiePolicy },
      { label: 'Delete your data', href: siteRoutes.requestDeletion },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-n-line bg-n-surface">
      <Container className="py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div id="get-the-app" className="scroll-mt-24">
            <Brand />
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-n-muted">
              Discover places through the people who’ve been there, and talk live with everyone at the same spot — in
              your own language.
            </p>
            <p className="mt-6 mb-3 text-[13px] font-semibold text-n-ink">Get the app</p>
            <StoreBadges />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map(col => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-[13px] font-semibold text-n-ink">{col.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-[14px] text-n-muted no-underline hover:text-n-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-n-line-soft pt-6 text-[13px] text-n-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p>
            Questions?{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-n-muted no-underline hover:text-n-ink">
              {siteConfig.supportEmail}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  )
}
