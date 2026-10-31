'use client'

/**
 * Weekly opening-hours editor for Business → Details. Each day is Closed,
 * Open (up to 3 time ranges) or 24 hours; one day can be copied to the whole
 * week. A closing time earlier than the opening time means "after midnight".
 */

import { Icon } from '@/components/dash/icons'
import { Button, IconButton, Segmented, cx, fieldClass } from '@/components/dash/ui'
import {
  BUSINESS_PROFILE_LIMITS,
  WEEK_DAYS,
  WEEK_DAY_LONG,
  WEEK_DAY_SHORT,
  closesAfterMidnight,
  isValidClosesTime,
  isValidOpensTime,
  type OpeningInterval,
  type WeekDay,
} from '@/lib/business-profile'
import {
  DEFAULT_INTERVAL,
  copyDayToAll,
  setAllDays,
  type DayDraft,
  type DayMode,
  type WeekDraft,
} from '@/lib/business-form'

const MODE_OPTIONS: { value: DayMode; label: string }[] = [
  { value: 'closed', label: 'Closed' },
  { value: 'open', label: 'Open' },
  { value: 'all-day', label: '24 hours' },
]

const timeClass = cx(fieldClass, 'mt-0 w-[7.5rem] tabular-nums max-sm:w-auto max-sm:min-w-0 max-sm:flex-1')

export function OpeningHoursEditor({ value, onChange }: { value: WeekDraft; onChange: (next: WeekDraft) => void }) {
  const setDay = (day: WeekDay, next: DayDraft) => onChange({ ...value, [day]: next })
  const anyOpen = WEEK_DAYS.some(d => value[d].mode !== 'closed')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <Button size="sm" icon="clock" onClick={() => onChange(setAllDays(value, 'all-day'))}>
          Open 24/7
        </Button>
        {anyOpen ? (
          <Button size="sm" variant="ghost" onClick={() => onChange(setAllDays(value, 'closed'))}>
            Clear all
          </Button>
        ) : (
          <span className="text-[13px] text-n-subtle">No timetable yet — open at least one day to show it.</span>
        )}
      </div>
      <ul className="divide-y divide-n-line-soft border-t border-n-line-soft">
        {WEEK_DAYS.map(day => (
          <DayRow
            key={day}
            day={day}
            draft={value[day]}
            onChange={next => setDay(day, next)}
            onCopyToAll={() => onChange(copyDayToAll(value, day))}
          />
        ))}
      </ul>
    </div>
  )
}

function DayRow({
  day,
  draft,
  onChange,
  onCopyToAll,
}: {
  day: WeekDay
  draft: DayDraft
  onChange: (next: DayDraft) => void
  onCopyToAll: () => void
}) {
  const label = WEEK_DAY_LONG[day]
  const updateInterval = (index: number, patch: Partial<OpeningInterval>) =>
    onChange({
      ...draft,
      intervals: draft.intervals.map((iv, i) => (i === index ? { ...iv, ...patch } : iv)),
    })
  const intervals = draft.intervals.length ? draft.intervals : [{ ...DEFAULT_INTERVAL }]
  const canAdd = intervals.length < BUSINESS_PROFILE_LIMITS.INTERVALS_PER_DAY_MAX

  return (
    <li className="flex flex-col gap-2.5 py-3 lg:flex-row lg:items-start lg:gap-4">
      <div className="flex items-center justify-between gap-3 lg:w-[17rem] lg:shrink-0">
        <span className="text-sm font-medium text-n-ink">
          <span className="lg:hidden">{label}</span>
          <span className="max-lg:hidden">{WEEK_DAY_SHORT[day]}</span>
        </span>
        <Segmented
          size="sm"
          label={`${label} hours`}
          value={draft.mode}
          options={MODE_OPTIONS}
          onChange={mode =>
            onChange({ mode, intervals: mode === 'open' && !draft.intervals.length ? [{ ...DEFAULT_INTERVAL }] : draft.intervals })
          }
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {draft.mode === 'open' ? (
          <>
            {intervals.map((interval, index) => {
              const overnight =
                isValidOpensTime(interval.opens) &&
                isValidClosesTime(interval.closes) &&
                interval.opens !== interval.closes &&
                closesAfterMidnight(interval)
              return (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={interval.opens}
                    onChange={e => updateInterval(index, { opens: e.target.value })}
                    aria-label={`${label}, range ${index + 1}: opens`}
                    className={timeClass}
                  />
                  <span aria-hidden className="text-n-subtle">
                    –
                  </span>
                  <input
                    type="time"
                    value={interval.closes === '24:00' ? '00:00' : interval.closes}
                    onChange={e => updateInterval(index, { closes: e.target.value })}
                    aria-label={`${label}, range ${index + 1}: closes`}
                    className={timeClass}
                  />
                  {intervals.length > 1 ? (
                    <IconButton
                      icon="x"
                      label={`Remove ${label} range ${index + 1}`}
                      onClick={() => onChange({ ...draft, intervals: intervals.filter((_, i) => i !== index) })}
                    />
                  ) : null}
                  {overnight ? (
                    <span className="basis-full text-xs text-n-subtle">Closes after midnight (next day).</span>
                  ) : null}
                </div>
              )
            })}
            {canAdd ? (
              <Button
                size="sm"
                variant="ghost"
                icon="plus"
                onClick={() => {
                  const last = intervals[intervals.length - 1]
                  onChange({ ...draft, intervals: [...intervals, { opens: last?.closes && last.closes !== '24:00' ? last.closes : '18:00', closes: '22:00' }] })
                }}
              >
                Add hours
              </Button>
            ) : null}
          </>
        ) : (
          <p className="flex h-8 items-center gap-1.5 text-sm text-n-muted">
            {draft.mode === 'all-day' ? (
              <>
                <Icon name="clock" size={15} /> Open 24 hours
              </>
            ) : (
              'Closed'
            )}
          </p>
        )}
      </div>

      <Button size="sm" variant="ghost" icon="copy" onClick={onCopyToAll} className="self-start" title={`Copy ${label} to every day`}>
        Copy to all days
      </Button>
    </li>
  )
}
