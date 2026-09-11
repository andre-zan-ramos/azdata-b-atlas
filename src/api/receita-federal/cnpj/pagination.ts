import type { FastPage, Paginated } from './types'
export function adaptPage<T>(data: Paginated<T> | FastPage<T>, requestedPage: number, requestedSize: number) { return { results: data.results, count: data.count, page: 'page' in data ? data.page : requestedPage, pageSize: 'page_size' in data ? data.page_size : requestedSize, hasNext: 'has_next' in data ? data.has_next : Boolean(data.next), hasPrevious: 'has_previous' in data ? data.has_previous : Boolean(data.previous) } }
export function pageFromSearch(value: string | null) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}
