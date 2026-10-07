export const PERIOD_GROUPS = [
  { prefix: 'inicio_atividade', label: 'Início de atividade' },
  { prefix: 'situacao_evento', label: 'Evento da situação cadastral' },
] as const
export const PERIOD_KEYS = ['inicio_atividade_de', 'inicio_atividade_ate', 'situacao_evento_de', 'situacao_evento_ate'] as const
export type Period = Record<typeof PERIOD_KEYS[number], string>
export function readPeriod(search: URLSearchParams): Period {
  return Object.fromEntries(PERIOD_KEYS.map(key => [key, search.get(key) ?? ''])) as Period
}
export function validatePeriod(period: Period): string | null {
  for (const { prefix, label } of PERIOD_GROUPS) {
    for (const end of ['de', 'ate'] as const) {
      const value = period[`${prefix}_${end}`]
      if (!value) continue
      const date = new Date(`${value}T00:00:00Z`)
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value.startsWith('0000')) return `${label}: informe datas válidas no formato AAAA-MM-DD.`
    }
    if (period[`${prefix}_de`] && period[`${prefix}_ate`] && period[`${prefix}_de`] > period[`${prefix}_ate`]) return `${label}: o fim do período deve ser igual ou posterior ao início.`
  }
  return null
}
export function periodSummary(period: Period) {
  const display = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value
  return PERIOD_GROUPS.flatMap(({ prefix, label }) => {
    const start = period[`${prefix}_de`], end = period[`${prefix}_ate`]
    return start || end ? [`${label}: ${start && end ? `${display(start)} a ${display(end)}` : start ? `desde ${display(start)}` : `até ${display(end)}`}`] : []
  }).join('; ') || 'Nenhum limite temporal selecionado.'
}
