'use client'

import { useSyncExternalStore } from 'react'

import {
  WEEK_DAY_LONG,
  formatDayRange,
  formatInterval,
  groupOpeningHours,
  weekDayFromJsDay,
  type OpeningHours,
  type WeekDay,
} from '@/lib/business-profile'

const noopSubscribe = () => () => {}

/**
 * Visitor's local weekday. null on the server (and in the first client
 * render), so the server HTML never guesses "today" and hydration matches.
 */
function useToday(): WeekDay | null {
  const jsDay = useSyncExternalStore(
    noopSubscribe,
    () => new Date().getDay(),
    () => -1,
  )
  return jsDay < 0 ? null : weekDayFromJsDay(jsDay)
}

/**
 * Weekly timetable: consecutive identical days collapse ("Mon–Fri"), the
 * group containing today is highlighted after hydration.
 */
export function PlaceOpeningHours({ hours }: { hours: OpeningHours }) {
  const today = useToday()
  const groups = groupOpeningHours(hours)
  return (
    <table className="w-full border-collapse text-[14px]">
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {groups.map(group => {
          const isToday = today !== null && group.days.includes(today)
          const label = formatDayRange(group.days)
          const fullLabel =
            group.days.length > 1
              ? `${WEEK_DAY_LONG[group.days[0]]} to ${WEEK_DAY_LONG[group.days[group.days.length - 1]]}`
              : WEEK_DAY_LONG[group.days[0]]
          return (
            <tr
              key={group.days.join('-')}
              className={isToday ? 'bg-n-accent-soft font-semibold text-n-ink' : 'text-n-ink'}
              aria-current={isToday ? 'date' : undefined}
            >
              <th
                scope="row"
                className={`w-[5.5rem] py-1 pr-3 pl-2 text-left align-top font-medium whitespace-nowrap ${isToday ? 'rounded-l-lg' : ''}`}
              >
                <abbr title={fullLabel} className="no-underline">
                  {label}
                </abbr>
                {isToday ? <span className="sr-only"> (today)</span> : null}
              </th>
              <td className={`py-1 pr-2 align-top tabular-nums ${isToday ? 'rounded-r-lg' : ''}`}>
                {group.intervals.length === 0 ? (
                  <span className={isToday ? '' : 'text-n-muted'}>Closed</span>
                ) : (
                  group.intervals.map(interval => (
                    <span key={`${interval.opens}-${interval.closes}`} className="block">
                      {formatInterval(interval)}
                    </span>
                  ))
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
