import { PERIOD_GROUPS, readPeriod, validatePeriod, type Period } from '../utils/cnpj-period'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { QueryError } from './query-state'
import { CnaeMultiselect } from './cnae-multiselect'
import { CnpjOtherQueries } from './cnpj-other-queries'
import type { CodeDescription } from '../api/receita-federal/cnpj/types'

export const B2B_FILTER_KEYS = ['segmentos', 'catalog_version', 'cnaes', 'atividade_escopo', 'inicio_atividade_de', 'inicio_atividade_ate', 'situacao_evento_de', 'situacao_evento_ate'] as const

export function repeatedB2BParams(search: URLSearchParams) {
  return B2B_FILTER_KEYS.some(key => search.getAll(key).length > 1)
}

export function useActivityCapability() {
  return useQuery({ queryKey: ['cnpj', 'activity-capability'], queryFn: ({ signal }) => cnpjApi.segments(signal).then(({ secondary_available }) => secondary_available), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 300000 })
}

export function applyB2BForm(data: FormData, next: URLSearchParams) {
  const legacy = String(data.get('cnae') ?? '')
  if (legacy) next.set('cnae', legacy); else next.delete('cnae')
  for (const key of B2B_FILTER_KEYS) next.delete(key)
  const segments = data.getAll('segmentos').map(String).sort()
  const codes = String(data.get('cnaes') ?? '')
  if (segments.length) {
    next.set('segmentos', segments.join(','))
    next.set('catalog_version', String(data.get('catalog_version') ?? ''))
  }
  if (codes) next.set('cnaes', codes)
  if (segments.length || codes) {
    next.set('atividade_escopo', String(data.get('atividade_escopo') ?? ''))
  }
  for (const key of B2B_FILTER_KEYS.filter(key => key.endsWith('_de') || key.endsWith('_ate'))) {
    const value = String(data.get(key) ?? '')
    if (value) next.set(key, value)
  }
}

export function CnpjB2BFilters({ search, onDraftChange, dirty = false, blocked = true, children }: { search: URLSearchParams; onDraftChange?: () => void; dirty?: boolean; blocked?: boolean; children?: ReactNode }) {
  const [period, setPeriod] = useState(() => readPeriod(search))
  const client = useQueryClient()
  const [legacy, setLegacy] = useState(search.get('cnae') ?? '')
  const [segments, setSegments] = useState(search.get('segmentos') ?? '')
  const [reviewError, setReviewError] = useState('')
  const [resolveSegments, setResolveSegments] = useState(false)
  const [scope, setScope] = useState(search.get('atividade_escopo') ?? 'principal')
  const [items, setItems] = useState<CodeDescription[]>((search.get('cnaes') ?? '').split(',').filter(Boolean).map(codigo => client.getQueryData<CodeDescription>(['cnpj', 'cnae-label', codigo]) ?? ({ codigo, descricao: 'Literal da URL; descrição ainda não consultada' })))
  const capability = useActivityCapability()
  const catalog = useQuery({ queryKey: ['cnpj', 'segments-review'], enabled: resolveSegments && Boolean(segments), queryFn: ({ signal }) => cnpjApi.segments(signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const selected = segments.split(',').filter(Boolean)
  const reviewed = catalog.data?.segments.filter(segment => selected.includes(segment.id)) ?? []
  const validReview = Boolean(catalog.data && search.get('catalog_version') === catalog.data.catalog_version && selected.every(id => catalog.data!.segments.some(segment => segment.id === id)) && !legacy)
  return <div className="cnpj-primary-filters">
    <CnaeMultiselect label="Tipo de estabelecimento" items={items} onChange={codes => {
      for (const item of codes) client.setQueryData(['cnpj', 'cnae-label', item.codigo], item)
      setItems(codes); onDraftChange?.()
    }} />
    {capability.isError ? <QueryError error={capability.error} retry={() => void capability.refetch()} /> : null}
    {catalog.isError ? <QueryError error={catalog.error} retry={() => void catalog.refetch()} /> : null}
    {reviewError ? <p role="alert">{reviewError}</p> : null}
    <input type="hidden" name="cnae" value={legacy} />
    {segments ? <><input type="hidden" name="segmentos" value={segments} /><input type="hidden" name="catalog_version" value={search.get('catalog_version') ?? ''} />
      <p role="alert">Revise segmentos: {segments}. Versão: {search.get('catalog_version') ?? 'ausente'}.</p>
      <button type="button" onClick={() => setResolveSegments(true)}>Resolver segmentos da URL</button>
      {resolveSegments && catalog.data ? <><ul>{reviewed.flatMap(segment => segment.activities.map(item => <li key={`${segment.id}-${item.codigo}`}>{item.codigo} · {item.descricao}</li>))}</ul>
      {!validReview ? <p role="alert">Segmento desconhecido, versão divergente ou conflito. Corrija a seleção.</p> : null}
      <button type="button" disabled={!validReview} onClick={() => { const codes = [...items, ...reviewed.flatMap(segment => segment.activities)]; if (codes.length > 100) { setReviewError('Limite de 100 CNAEs. Remova itens antes de confirmar.'); return } for (const item of codes) client.setQueryData(['cnpj', 'cnae-label', item.codigo], item); setItems(codes); setSegments(''); setReviewError(''); onDraftChange?.() }}>Confirmar revisão dos códigos</button></> : null}
      <button type="button" onClick={() => { setSegments(''); onDraftChange?.() }}>Remover segmentos para corrigir</button>
    </> : null}
    {legacy ? <><p role="alert">CNAE da URL antiga: {legacy}. Revise para usar escopo principal.</p>
      <button type="button" disabled={search.getAll('cnae').length !== 1 || !/^[0-9]{7}$/.test(legacy) || Boolean(segments) || B2B_FILTER_KEYS.slice(0, 4).some(key => search.has(key))} onClick={() => { setItems([{ codigo: legacy, descricao: 'Literal da URL antiga' }]); setScope('principal'); setLegacy(''); onDraftChange?.() }}>Normalizar CNAE para seleção geral</button>
      <button type="button" onClick={() => { setLegacy(''); onDraftChange?.() }}>Remover CNAE conflitante</button></> : null}
    <input type="hidden" name="cnaes" value={items.map(item => item.codigo).join(',')} />
    <input type="hidden" name="atividade_escopo" value={scope} />
    <fieldset className="cnpj-period-fields">
      <legend>Datas do estabelecimento</legend>
      {PERIOD_GROUPS.map(({ prefix, label }) => <fieldset key={prefix}>
        <legend>{label}</legend>
        <div className="cnpj-date-range">{(['de', 'ate'] as const).map(end => {
          const key = `${prefix}_${end}` as keyof Period
          return <label key={key}>{end === 'de' ? 'Início' : 'Fim'}<input aria-label={`${label}: ${end === 'de' ? 'de' : 'até'}`} type="date" name={key} value={period[key]} onChange={event => { setPeriod(previous => ({ ...previous, [key]: event.target.value })); onDraftChange?.() }} /></label>
        })}</div>
      </fieldset>)}
      {validatePeriod(period) ? <p role="alert">{validatePeriod(period)}</p> : null}
    </fieldset>
    <CnpjOtherQueries search={search} dirty={dirty} blocked={blocked}>
      <label>Atividades consideradas<select value={scope} onChange={event => { setScope(event.target.value); onDraftChange?.() }}><option value="principal">Somente principal</option><option value="principal_ou_secundaria" disabled={capability.data !== true}>Principal ou secundárias</option></select></label>
      {children}
    </CnpjOtherQueries>
  </div>
}
