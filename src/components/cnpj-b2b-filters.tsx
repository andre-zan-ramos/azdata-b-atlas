import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { QueryError } from './query-state'
import { CnaeReceitaDialog } from './cnae-receita-dialog'
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

export function CnpjB2BFilters({ search, onDraftChange }: { search: URLSearchParams; onDraftChange?: () => void }) {
  const client = useQueryClient()
  const [legacy, setLegacy] = useState(search.get('cnae') ?? '')
  const [segments, setSegments] = useState(search.get('segmentos') ?? '')
  const [resolve, setResolve] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const [scope, setScope] = useState(search.get('atividade_escopo') ?? 'principal')
  const [items, setItems] = useState<CodeDescription[]>((search.get('cnaes') ?? '').split(',').filter(Boolean).map(codigo => client.getQueryData<CodeDescription>(['cnpj', 'cnae-label', codigo]) ?? ({ codigo, descricao: 'Literal da URL; descrição ainda não consultada' })))
  const capability = useActivityCapability()
  const catalog = useQuery({ queryKey: ['cnpj', 'segments-review'], enabled: resolve && Boolean(segments), queryFn: ({ signal }) => cnpjApi.segments(signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const selected = segments.split(',').filter(Boolean)
  const reviewed = catalog.data?.segments.filter(segment => selected.includes(segment.id)) ?? []
  const validReview = Boolean(catalog.data && search.get('catalog_version') === catalog.data.catalog_version && selected.every(id => catalog.data!.segments.some(segment => segment.id === id)) && !legacy)
  return <fieldset>
    <legend>CNAEs e datas do estabelecimento</legend>
    {capability.isError ? <QueryError error={capability.error} retry={() => void capability.refetch()} /> : null}
    {reviewError ? <p role="alert">{reviewError}</p> : null}
    <input type="hidden" name="cnae" value={legacy} />
    {segments ? <><input type="hidden" name="segmentos" value={segments} /><input type="hidden" name="catalog_version" value={search.get('catalog_version') ?? ''} />
      <p role="alert">Revise segmentos: {segments}. Versão: {search.get('catalog_version') ?? 'ausente'}.</p>
      <button type="button" onClick={() => setResolve(true)}>Resolver segmentos para revisão</button>
      {catalog.isError ? <QueryError error={catalog.error} retry={() => void catalog.refetch()} /> : null}
      {catalog.data ? <><ul>{reviewed.flatMap(segment => segment.activities.map(item => <li key={`${segment.id}-${item.codigo}`}>{item.codigo} · {item.descricao}</li>))}</ul>
      {!validReview ? <p role="alert">Segmento desconhecido, versão divergente ou conflito. Corrija a seleção.</p> : null}
      <button type="button" disabled={!validReview} onClick={() => { const codes = [...items, ...reviewed.flatMap(segment => segment.activities)]; if (codes.length > 100) { setReviewError('Limite de 100 CNAEs. Remova itens antes de confirmar.'); return } for (const item of codes) client.setQueryData(['cnpj', 'cnae-label', item.codigo], item); setItems(codes); setSegments(''); setReviewError(''); onDraftChange?.() }}>Confirmar revisão dos códigos</button></> : null}
      <button type="button" onClick={() => { setSegments(''); onDraftChange?.() }}>Remover segmentos para corrigir</button>
    </> : null}
    {legacy ? <><p role="alert">CNAE da URL antiga: {legacy}. Revise para usar escopo principal.</p>
      <button type="button" disabled={search.getAll('cnae').length !== 1 || !/^[0-9]{7}$/.test(legacy) || Boolean(segments) || B2B_FILTER_KEYS.slice(0, 4).some(key => search.has(key))} onClick={() => { setItems([{ codigo: legacy, descricao: 'Literal da URL antiga' }]); setScope('principal'); setLegacy(''); onDraftChange?.() }}>Normalizar CNAE para seleção geral</button>
      <button type="button" onClick={() => { setLegacy(''); onDraftChange?.() }}>Remover CNAE conflitante</button></> : null}
    <input type="hidden" name="cnaes" value={items.map(item => item.codigo).join(',')} />
    <input type="hidden" name="atividade_escopo" value={scope} />
    <button ref={trigger} type="button" onClick={() => setOpen(true)}>Selecionar CNAEs</button>
    <p>{items.length}/100 CNAEs · {scope === 'principal' ? 'Somente principal' : 'Principal ou secundárias'}</p>
    <ul>{items.map((item, index) => <li key={`${item.codigo}-${index}`}>{item.codigo} · {item.descricao}<button type="button" onClick={() => { setItems(previous => previous.filter((_, position) => position !== index)); onDraftChange?.() }}>Remover {item.codigo}</button></li>)}</ul>
    {open ? <CnaeReceitaDialog trigger={trigger.current} initial={items} scope={scope} secondary={capability.data === true} close={() => setOpen(false)} confirm={(codes, activityScope) => { for (const item of codes) client.setQueryData(['cnpj', 'cnae-label', item.codigo], item); setItems(codes); setScope(activityScope); setOpen(false); onDraftChange?.() }} /> : null}
    <label>Início de atividade: de<input type="date" name="inicio_atividade_de" defaultValue={search.get('inicio_atividade_de') ?? ''} /></label>
    <label>Início de atividade: até<input type="date" name="inicio_atividade_ate" defaultValue={search.get('inicio_atividade_ate') ?? ''} /></label>
    <label>Evento da situação cadastral: de<input type="date" name="situacao_evento_de" defaultValue={search.get('situacao_evento_de') ?? ''} /></label>
    <label>Evento da situação cadastral: até<input type="date" name="situacao_evento_ate" defaultValue={search.get('situacao_evento_ate') ?? ''} /></label>
    <p>Limites inclusivos. A data do evento cadastral não é a última atualização geral nem necessariamente a abertura. Datas ausentes não correspondem a um intervalo informado.</p>
  </fieldset>
}
