import { filterKeys, type Endpoint } from './client'
import type { Page, PageSize, WorkFilters } from './types'

export function readPagination(search: URLSearchParams, prefix = '') {
  const errors: Record<string, string[]> = {}
  const pageKey = `${prefix}page`, sizeKey = `${prefix}page_size`
  const rawPage = search.get(pageKey), rawSize = search.get(sizeKey)
  const page = rawPage === null ? 1 : Number(rawPage)
  const pageSize = rawSize === null ? 10 : Number(rawSize)
  if (rawPage !== null && (!/^\d+$/.test(rawPage) || page < 1 || page > 999999999)) errors[pageKey] = ['Use um inteiro de 1 a 999999999.']
  if (rawSize !== null && !['10', '25', '50'].includes(rawSize)) errors[sizeKey] = ['Use 10, 25 ou 50.']
  for (const key of [pageKey, sizeKey]) if (search.getAll(key).length > 1) errors[key] = ['Informe o parâmetro uma única vez.']
  return { page, pageSize: pageSize as PageSize, errors }
}
export function readSearch(search: URLSearchParams, endpoint: Endpoint) {
  const { page, pageSize, errors } = readPagination(search)
  const filters: Record<string, string> = {}
  for (const key of filterKeys[endpoint]) {
    const value = search.get(key)
    if (value !== null && value !== '') filters[key] = value
    if (search.getAll(key).length > 1) errors[key] = ['Informe o parâmetro uma única vez.']
  }
  const total = search.get('include_total')
  if (total !== null && !['true', 'false'].includes(total)) errors.include_total = ['Use true ou false.']
  if (search.getAll('include_total').length > 1) errors.include_total = ['Informe o parâmetro uma única vez.']
  const params: WorkFilters = { ...filters, page, page_size: pageSize, ...(total === 'true' || total === 'false' ? { include_total: total === 'true' } : {}) }
  return { filters, params, errors, active: Object.keys(filters).length > 0 || search.get('listar') === 'true' }
}
export function adaptPage<T>(data: Page<T>, page: number, pageSize: number) {
  return { ...data, page: 'page' in data ? data.page : page, pageSize: 'page_size' in data ? data.page_size : pageSize, hasNext: 'has_next' in data ? data.has_next : Boolean(data.next), hasPrevious: 'has_previous' in data ? data.has_previous : Boolean(data.previous) }
}
