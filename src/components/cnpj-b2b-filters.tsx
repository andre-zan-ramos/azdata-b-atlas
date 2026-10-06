import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { QueryError } from './query-state'
import { CnaeCatalogPicker } from './cnae-catalog-picker'

export const B2B_FILTER_KEYS = ['segmentos', 'catalog_version', 'cnaes', 'atividade_escopo', 'inicio_atividade_de', 'inicio_atividade_ate', 'situacao_evento_de', 'situacao_evento_ate'] as const

export function repeatedB2BParams(search: URLSearchParams) {
  return B2B_FILTER_KEYS.some(key => search.getAll(key).length > 1)
}

export function applyB2BForm(data: FormData, next: URLSearchParams) {
  for (const key of B2B_FILTER_KEYS) next.delete(key)
  const segments = data.getAll('segmentos').map(String).sort()
  const codes = String(data.get('cnaes') ?? '')
  if (segments.length) {
    next.set('segmentos', segments.join(','))
    next.set('catalog_version', String(data.get('catalog_version') ?? ''))
  }
  if (codes) next.set('cnaes', codes)
  if (segments.length || codes) {
    next.delete('cnae')
    next.set('atividade_escopo', String(data.get('atividade_escopo') ?? ''))
  }
  for (const key of B2B_FILTER_KEYS.filter(key => key.endsWith('_de') || key.endsWith('_ate'))) {
    const value = String(data.get(key) ?? '')
    if (value) next.set(key, value)
  }
}

export function CnpjB2BFilters({ search }: { search: URLSearchParams }) {
  const [chosenVersion, setChosenVersion] = useState(search.get('catalog_version'))
  const [codes, setCodes] = useState(search.get('cnaes') ?? '')
  const catalog = useQuery({ queryKey: ['cnpj', 'segments'], queryFn: ({ signal }) => cnpjApi.segments(signal), retry: false, staleTime: 300000 })
  const selected = search.get('segmentos')?.split(',') ?? []
  const version = chosenVersion ?? catalog.data?.catalog_version ?? ''
  const unknown = selected.filter(id => !catalog.data?.segments.some(segment => segment.id === id))
  return <fieldset>
    <legend>Segmentos comerciais e datas do estabelecimento</legend>
    <p>Os segmentos usam atividades declaradas no CNPJ. Selecione um ou vários; os resultados correspondem a qualquer código selecionado.</p>
    {catalog.isPending ? <p role="status">Carregando segmentos…</p> : null}
    {catalog.isError ? <QueryError error={catalog.error} retry={() => void catalog.refetch()} /> : null}
    <input type="hidden" name="catalog_version" value={version} />
    {catalog.data && version !== catalog.data.catalog_version ? <div role="alert"><p>A versão desta seleção difere do catálogo disponível. Revise antes de aplicar.</p><button type="button" onClick={() => setChosenVersion(catalog.data!.catalog_version)}>Usar catálogo {catalog.data.catalog_version}</button></div> : null}
    {catalog.data?.segments.map(segment => <div key={segment.id}>
      <label><input type="checkbox" name="segmentos" value={segment.id} defaultChecked={selected.includes(segment.id)} />{segment.label}</label>
      <details><summary>CNAEs de {segment.label}</summary><p>{segment.scope}</p><ul>{segment.activities.map(activity => <li key={activity.codigo}>{activity.codigo} · {activity.descricao}</li>)}</ul></details>
    </div>)}
    {unknown.map(id => <label key={id}><input type="checkbox" name="segmentos" value={id} defaultChecked />Segmento indisponível: {id}</label>)}
    <label>CNAEs adicionais (sete dígitos, separados por vírgula)<input name="cnaes" value={codes} onChange={event => setCodes(event.target.value)} /></label>
    <CnaeCatalogPicker codes={codes} onCodes={setCodes} />
    <label>Atividades consideradas<select name="atividade_escopo" defaultValue={search.get('atividade_escopo') ?? 'principal'}><option value="principal">Somente principal</option><option value="principal_ou_secundaria" disabled={!catalog.data?.secondary_available}>Principal ou secundárias</option></select></label>
    {!catalog.data?.secondary_available ? <p>Consulta de secundárias indisponível até confirmação da cobertura publicada.</p> : null}
    <label>Início de atividade: de<input type="date" name="inicio_atividade_de" defaultValue={search.get('inicio_atividade_de') ?? ''} /></label>
    <label>Início de atividade: até<input type="date" name="inicio_atividade_ate" defaultValue={search.get('inicio_atividade_ate') ?? ''} /></label>
    <label>Evento da situação cadastral: de<input type="date" name="situacao_evento_de" defaultValue={search.get('situacao_evento_de') ?? ''} /></label>
    <label>Evento da situação cadastral: até<input type="date" name="situacao_evento_ate" defaultValue={search.get('situacao_evento_ate') ?? ''} /></label>
    <p>Limites inclusivos. A data do evento cadastral não é a última atualização geral nem necessariamente a abertura. Datas ausentes não correspondem a um intervalo informado.</p>
  </fieldset>
}
