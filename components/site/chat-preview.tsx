import { Icon } from '@/components/dash/icons'
import { cx } from '@/components/site/ui'

/**
 * Product illustration of a Place live chat (example content, decorative):
 * a translated message, a reply and a pinned note from a verified business.
 */
export function ChatPreview({ className }: { className?: string }) {
  return (
    <figure className={cx('relative', className)}>
      <div aria-hidden className="overflow-hidden rounded-[22px] border border-n-line bg-n-surface shadow-[0_2px_4px_rgb(27_26_23/0.04),0_24px_60px_-12px_rgb(27_26_23/0.18)]">
        <div className="flex items-center gap-3 border-b border-n-line-soft px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#e4f1f2] text-[#0f6f73]">
            <Icon name="pin" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-n-ink">Praia do Vento</p>
            <p className="flex items-center gap-1.5 text-[12px] text-n-muted">
              <span className="size-1.5 rounded-full bg-[#1f9d6b]" />
              Live chat · everyone at this beach
            </p>
          </div>
        </div>

        <div className="space-y-3 bg-n-surface-2 px-4 py-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-n-accent-line bg-n-accent-soft px-3 py-2.5">
            <Icon name="badge-check" size={16} className="mt-0.5 shrink-0 text-n-accent" strokeWidth={2} />
            <p className="text-[12.5px] leading-5 text-n-ink-2">
              <span className="font-semibold text-n-ink">Pousada Ventos · pinned</span> — Breakfast 7–10. Ask us
              anything here.
            </p>
          </div>

          <div className="flex items-end gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fbeee4] text-[11px] font-semibold text-[#a2531c]">
              A
            </span>
            <div className="n-bubble max-w-[78%] bg-n-surface px-3.5 py-2.5 shadow-n-card ring-1 ring-n-line-soft">
              <p className="text-[11px] font-semibold text-n-subtle">Ana</p>
              <p className="text-[14px] leading-5 text-n-ink">Does anyone know if the kite school is open tomorrow?</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-n-subtle">
                <Icon name="languages" size={12} /> Translated from Portuguese
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="n-bubble-me max-w-[78%] bg-n-accent px-3.5 py-2.5 text-white">
              <p className="text-[14px] leading-5">Yes — from 9. I’m going too, see you there!</p>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eaf1e4] text-[11px] font-semibold text-[#3f6b1f]">
              L
            </span>
            <div className="n-bubble max-w-[78%] bg-n-surface px-3.5 py-2.5 shadow-n-card ring-1 ring-n-line-soft">
              <p className="text-[11px] font-semibold text-n-subtle">Lukas</p>
              <p className="text-[14px] leading-5 text-n-ink">Wind looks great after 2pm 🌬️</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-n-subtle">
                <Icon name="languages" size={12} /> Translated from German
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-n-line-soft px-3 py-3">
          <div className="h-10 flex-1 rounded-full border border-n-line bg-n-surface px-4 text-[13px] leading-10 text-n-faint">
            Message everyone here…
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-n-accent text-white">
            <Icon name="send" size={17} />
          </span>
        </div>
      </div>
      <figcaption className="sr-only">
        Example of a NessaChat live chat: messages are translated automatically into each reader’s language.
      </figcaption>
    </figure>
  )
}
