export function canonicalFilters(filters: Record<string, unknown>) {
  return JSON.stringify(Object.entries(filters).map(([key, value]) => [key, typeof value === 'string' && (key === 'segmentos' || key === 'cnaes') ? [...new Set(value.split(','))].sort().join(',') : value]).sort(([left], [right]) => String(left).localeCompare(String(right))))
}
