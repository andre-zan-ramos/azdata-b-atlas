import { useQuery } from '@tanstack/react-query'
import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { listStates } from '../api/ibge/territories'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import { isInvalidTextMatchMode, textMatchModeFromSearch } from '../api/receita-federal/cnpj/match-mode'
import type { BusinessSearchFilters, EstablishmentFilters, EstablishmentMapFilters, PageSize, TextMatchMode } from '../api/receita-federal/cnpj/types'
import { LocationFacetFilter } from '../components/location-facet-filter'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { TextMatchModeSelect } from '../components/text-match-mode-select'
import { AreaModeSwitcher, useAreaMode } from '../components/area-mode-switcher'
import { formatCnpj } from '../utils/format'

const PAGE_SIZE: PageSize = 10
const FILTER_KEYS = ['uf', 'municipio', 'cnae', 'situacao_cadastral', 'matriz_filial', 'porte', 'natureza_juridica'] as const
const TerritoryMap = lazy(() => import('../components/establishment-territory-map').then(module => ({ default: module.EstablishmentTerritoryMap })))

function EstablishmentMapMode({ filters, page, onPage }: { filters: Pick<BusinessSearchFilters, typeof FILTER_KEYS[number]>; page: number; onPage: (page: number) => void }) {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const mapFilters = filters as EstablishmentMapFilters
  const listParams: EstablishmentFilters = { ...filters, page, page_size: PAGE_SIZE }
  const states = useQuery({ queryKey: ['ibge', 'establishment-states'], queryFn: ({ signal }) => listStates(signal), staleTime: 86400000, retry: false })
  const list = useQuery({ queryKey: ['cnpj', 'map-results', listParams], queryFn: ({ signal }) => cnpjApi.establishments(listParams, signal) })
  const map = useQuery({ queryKey: ['cnpj', 'establishment-map', mapFilters], queryFn: ({ signal }) => cnpjApi.establishmentMap(mapFilters, signal), retry: false })
  const view = list.data && adaptPage(list.data, page, PAGE_SIZE)
  const stateNames = useMemo(() => new Map((states.data ?? []).map(state => [String(state.id), state.nome])), [states.data])
  const territories = map.data?.territories ?? []
  const municipalityNames = useMemo(() => new Map(territories.flatMap(item => item.codigo_ibge ? [[item.codigo_ibge, item.descricao] as const] : [])), [territories])
  const selectedMunicipality = territories.find(item => item.codigo === filters.municipio)
  const applyTerritory = (uf: string, municipio = '') => {
    const next = new URLSearchParams(search); next.set('page', '1')
    if (uf) next.set('uf', uf); else next.delete('uf')
    if (municipio) next.set('municipio', municipio); else next.delete('municipio')
    setSearch(next)
  }
  const selectState = (ibgeCode: string) => {
    const state = states.data?.find(item => String(item.id) === ibgeCode)
    if (state?.sigla) applyTerritory(state.sigla)
  }
  const selectMunicipality = (ibgeCode: string) => {
    const municipality = territories.find(item => item.codigo_ibge === ibgeCode)
    if (filters.uf && municipality) applyTerritory(filters.uf, municipality.codigo)
  }
  const returnTo = location.pathname + location.search
  return <div className="cno-explorer">
    <aside className="cno-filters"><h1>Mapa de Empresas</h1><p>Explore estabelecimentos por território.</p><label>UF<select aria-label="UF" value={filters.uf ?? ''} onChange={event => applyTerritory(event.target.value)}><option value="">Brasil</option>{(states.data ?? []).map(state => <option key={state.id} value={state.sigla}>{state.sigla} · {state.nome}</option>)}</select></label><label>Município<select aria-label="Município" value={filters.municipio ?? ''} disabled={!filters.uf || map.isPending} onChange={event => applyTerritory(filters.uf ?? '', event.target.value)}><option value="">Todos</option>{territories.map(item => <option key={item.codigo} value={item.codigo}>{item.descricao}</option>)}</select></label></aside>
    <div>
      <section className="cno-map-card" aria-label="Explorar estabelecimentos no mapa"><div className="cno-map-heading"><div><h2>{selectedMunicipality?.descricao ?? (filters.uf ? `Municípios de ${filters.uf}` : 'Explore o Brasil')}</h2><p>Clique em {filters.uf ? 'um município' : 'uma UF'} para aplicar a consulta imediatamente.</p></div>{filters.uf ? <button type="button" onClick={() => applyTerritory('')}>Voltar ao Brasil</button> : null}</div>{map.isFetching ? <p role="status" className="cno-map-caption">Carregando cobertura cartográfica…</p> : null}{map.isError ? <QueryError error={map.error} retry={() => void map.refetch()} /> : null}<Suspense fallback={<p role="status" className="cno-map-state">Carregando mapa…</p>}><TerritoryMap uf={filters.uf ?? ''} names={filters.uf ? municipalityNames : stateNames} selectedMunicipalityIbge={selectedMunicipality?.codigo_ibge ?? null} points={map.data?.points ?? []} returnTo={returnTo} onState={selectState} onMunicipality={selectMunicipality} /></Suspense>{map.data ? <p className="cno-map-coverage">{map.data.coverage.points_total} pontos para {map.data.coverage.results_total} estabelecimentos · {map.data.coverage.without_coordinates_total} sem coordenadas · release {map.data.release ?? 'indisponível'}.{map.data.coverage.truncated ? ` Exibindo ${map.data.coverage.returned_points} de ${map.data.coverage.points_total} pontos (limite ${map.data.coverage.limit}).` : ' Cobertura cartográfica completa para o recorte.'}</p> : null}<p className="cno-map-caption">A seleção territorial atualiza mapa e resultados. Estabelecimentos sem coordenadas permanecem na lista.</p></section>
      <section className="cno-results-panel" aria-label="Resultados de estabelecimentos"><div className="results-heading"><h2>Estabelecimentos do recorte</h2></div>{list.isPending ? <p role="status">Carregando resultados…</p> : null}{list.isError ? <QueryError error={list.error} retry={() => void list.refetch()} /> : null}{view?.results.length === 0 ? <Empty /> : null}{view && view.results.length > 0 ? <><div className="table-wrap"><table><thead><tr><th>Nome</th><th>CNPJ</th><th>Município/UF</th></tr></thead><tbody>{view.results.map(item => <tr key={item.id}><td><Link to={`/receita-federal/cnpj/estabelecimentos/${item.cnpj}?return_to=${encodeURIComponent(returnTo)}`}>{item.nome_fantasia || item.razao_social}</Link></td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || 'Município não informado'} / {item.uf || 'UF não informada'}</td></tr>)}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={onPage} /></> : null}</section>
    </div>
  </div>
}

export function EstablishmentsPage() {
  const [search, setSearch] = useSearchParams()
  const mode = useAreaMode()
  const location = useLocation()
  const term = search.get('q')?.trim() ?? ''
  const rawQMode = search.get('q_modo')
  const qMode = textMatchModeFromSearch(rawQMode)
  const [inputValue, setInputValue] = useState(term)
  useEffect(() => setInputValue(term), [term])
  useEffect(() => {
    if (!isInvalidTextMatchMode(rawQMode)) return
    const next = new URLSearchParams(search)
    next.set('q_modo', 'contendo')
    setSearch(next, { replace: true })
  }, [rawQMode, search, setSearch])
  const page = pageFromSearch(search.get('page'))
  const filters = Object.fromEntries(FILTER_KEYS.flatMap(key => { const value = search.get(key); return value ? [[key, value]] : [] })) as Pick<BusinessSearchFilters, typeof FILTER_KEYS[number]>
  const params: BusinessSearchFilters = { q: term, q_modo: qMode, ...filters, page, page_size: PAGE_SIZE }
  const query = useQuery({ queryKey: ['cnpj', 'search', params], enabled: mode === 'busca' && Boolean(term), queryFn: ({ signal }) => cnpjApi.search(params, signal) })
  const qError = query.error instanceof ApiError ? query.error.fields?.q?.join(' ') : undefined
  const view = query.data && adaptPage(query.data, page, PAGE_SIZE)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = inputValue.trim()
    const next = new URLSearchParams(search)
    next.delete('tipo')
    next.set('page', '1')
    if (value) next.set('q', value); else next.delete('q')
    setSearch(next)
  }
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }
  const changeMode = (value: TextMatchMode) => { const next = new URLSearchParams(search); next.set('q_modo', value); next.set('page', '1'); setSearch(next) }
  const changeLocation = (selection: { uf: string; municipio: string } | null) => {
    const next = new URLSearchParams(search)
    next.set('page', '1')
    if (selection) { next.set('uf', selection.uf); next.set('municipio', selection.municipio) } else { next.delete('uf'); next.delete('municipio') }
    setSearch(next)
  }
  const facetFilters = { cnae: filters.cnae, situacao_cadastral: filters.situacao_cadastral, matriz_filial: filters.matriz_filial, porte: filters.porte, natureza_juridica: filters.natureza_juridica }

  return <section className="search-page">
    <AreaModeSwitcher mode={mode} compatibleKeys={['q', 'q_modo', 'uf', 'municipio', 'cnae', 'situacao_cadastral', 'matriz_filial', 'porte', 'natureza_juridica', 'page', 'return_to']} />
    {mode === 'mapa' ? <EstablishmentMapMode filters={filters} page={page} onPage={changePage} /> : <>
    <form className={`unified-search${term ? ' compact' : ''}`} onSubmit={submit} role="search">
      <label htmlFor="business-search">Encontre uma empresa</label>
      <div className="search-row"><input id="business-search" name="q" value={inputValue} onChange={event => setInputValue(event.target.value)} autoFocus aria-invalid={Boolean(qError)} aria-describedby={qError ? 'business-search-error' : 'business-search-help'} placeholder="Digite razão social, nome fantasia ou CNPJ" /><TextMatchModeSelect value={qMode} onChange={changeMode} /><button>Buscar</button></div>
      {qError ? <p className="field-error" id="business-search-error">{qError}</p> : <p id="business-search-help">Você pode informar um nome ou um CNPJ com 8 ou 14 dígitos.</p>}
    </form>
    {query.isPending && term && <div className="inline-message" role="status">Buscando…</div>}
    {query.isError && !qError && <QueryError error={query.error} retry={() => query.refetch()} />}
    {view?.results.length === 0 && <Empty />}
    {view && view.results.length > 0 && <><div className="results-heading"><h1>Resultados</h1></div><div className="table-wrap"><table><thead><tr><th>Razão social</th><th>Nome fantasia</th><th>CNPJ</th><th><span className="column-filter-heading">Localidade <LocationFacetFilter q={term} qMode={qMode} filters={facetFilters} selected={filters.uf && filters.municipio ? { uf: filters.uf, municipio: filters.municipio } : null} onSelect={changeLocation} /></span></th><th>Atividade principal</th></tr></thead><tbody>{view.results.map(item => { const returnTo = `${location.pathname}${location.search}`; const target = `/receita-federal/cnpj/empresas/${item.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`; return <tr className="clickable-row" key={item.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${item.razao_social}`} /><span>{item.razao_social}</span></td><td>{item.nome_fantasia || '—'}</td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || 'Município não informado'} / {item.uf}</td><td>{item.cnae_principal ? `${item.cnae_principal.codigo} · ${item.cnae_principal.descricao}` : '—'}</td></tr>})}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></>}
    </>}
  </section>
}
