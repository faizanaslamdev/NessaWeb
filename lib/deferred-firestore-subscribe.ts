/**
 * Schedules `subscribe()` on the next macrotask so it runs after React’s commit /
 * Strict Mode effect unwind. Helps avoid Firestore WatchChangeAggregator races
 * (`INTERNAL ASSERTION FAILED … ca9 … ve:-1`) when listeners attach/unattach in the same tick.
 *
 * @see https://github.com/firebase/firebase-js-sdk/issues/9267
 */
export function deferredFirestoreSubscribe(subscribe: () => () => void): () => void {
  let innerUnsub: (() => void) | undefined
  const timer = globalThis.setTimeout(() => {
    innerUnsub = subscribe()
  }, 0)
  return () => {
    globalThis.clearTimeout(timer)
    innerUnsub?.()
    innerUnsub = undefined
  }
}
