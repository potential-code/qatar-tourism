/** Row helpers for the admin services. */

/** Removes, in place, every element matching `predicate` (the old `delete … where`). */
export function removeWhere<T>(rows: T[], predicate: (row: T) => boolean): number {
  let removed = 0
  for (let index = rows.length - 1; index >= 0; index--) {
    if (predicate(rows[index] as T)) {
      rows.splice(index, 1)
      removed += 1
    }
  }
  return removed
}
