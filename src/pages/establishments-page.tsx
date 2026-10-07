import { CnpjOtherQueries } from '../components/cnpj-other-queries'
import { mapEligibility, useMapDraft, useMunicipalities } from '../utils/cnpj-map-preparation'
import { B2B_FILTER_KEYS, CnpjB2BFilters, applyB2BForm, useActivityCapability } from '../components/cnpj-b2b-filters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { listStates } from '../api/ibge/territories'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import { isInvalidTextMatchMode, textMatchModeFromSearch } from '../api/receita-federal/cnpj/match-mode'
import type { B2BFilters, BusinessSearchFilters, EstablishmentFilters, EstablishmentMapFilters, PageSize, TextMatchMode } from '../api/receita-federal/cnpj/types'
import { LocationFacetFilter } from '../components/location-facet-filter'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { TextMatchModeSelect } from '../components/text-match-mode-select'
import { AreaModeSwitcher, useAreaMode } from '../components/area-mode-switcher'
import { formatCnpj } from '../utils/format'
import { canonicalFilters } from '../utils/cnpj-map-context'

const PAGE_SIZE: PageSize = 10
const FILTER_KEYS = ['uf', 'municipio', 'cnae', 'situacao_cadastral', 'matriz_filial', 'porte', 'natureza_juridica'] as const
const TerritoryMap = lazy(() => import('../components/establishment-territory-map').then(module => ({ default: module.EstablishmentTerritoryMap })))

function EstablishmentMapMode({ filters, page, onPage }: { filters: Pick<BusinessSearchFilters, typeof FILTER_KEYS[number]> & B2BFilters; page: number; onPage: (page: number) => void }) {
  const [search, setSearch] = useSearchParams()
  const queryClient = useQueryClient()
  const { draft, dirty, markDirty, territory, resetDraft } = useMapDraft(search)
  const municipalities = useMunicipalities(draft.get('uf') ?? '')
  const appliedMunicipalities = useMunicipalities(search.get('uf') ?? '')
  const capability = useActivityCapability()
  const secondaryError = search.get("atividade_escopo") === "principal_ou_secundaria" && capability.data !== true ? "Secundarias sem certificacao publicada para a release." : null
  const eligibilityError = secondaryError ?? mapEligibility(search, appliedMunicipalities.data, appliedMunicipalities.isSuccess)
  const blocked = Boolean(eligibilityError)
  const [formReset, setFormReset] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)
  useEffect(() => setValidationError(null), [search])
  const clearFilters = () => {
    void queryClient.cancelQueries({ predicate: query => ['establishment-map', 'map-results', 'partner-map', 'partner-map-results'].includes(String(query.queryKey[1])) })
    const next = new URLSearchParams(draft)
    for (const key of [...FILTER_KEYS, ...B2B_FILTER_KEYS]) next.delete(key)
    next.delete('page'); setValidationError(null); setFormReset(value => value + 1); resetDraft(next); setSearch(next)
  }
  const location = useLocation()
  const mapFilters = filters as EstablishmentMapFilters
  const listParams: EstablishmentFilters = { ...filters, page, page_size: PAGE_SIZE }
  const states = useQuery({ queryKey: ['ibge', 'establishment-states'], queryFn: ({ signal }) => listStates(signal), staleTime: 86400000, retry: false })
  const list = useQuery({ queryKey: ['cnpj', 'map-results', listParams], enabled: !blocked, queryFn: ({ signal }) => cnpjApi.establishmentMapResults(listParams, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const map = useQuery({ queryKey: ['cnpj', 'establishment-map', mapFilters], enabled: !blocked, queryFn: ({ signal }) => cnpjApi.establishmentMap(mapFilters, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const view = !blocked && list.data ? adaptPage(list.data, page, PAGE_SIZE) : undefined
  const stateNames = useMemo(() => new Map((states.data ?? []).map(state => [String(state.id), state.nome])), [states.data])
  const territories = municipalities.data ?? []
  const municipalityNames = useMemo(() => new Map(territories.flatMap(item => item.codigo_ibge ? [[item.codigo_ibge, item.descricao] as const] : [])), [territories])
  const selectedMunicipality = territories.find(item => item.codigo === draft.get('municipio'))
  const applyTerritory = (uf: string, municipio = '') => territory(uf, municipio)
  const selectState = (ibgeCode: string) => {
    const state = states.data?.find(item => String(item.id) === ibgeCode)
    if (state?.sigla) applyTerritory(state.sigla)
  }
  const selectMunicipality = (ibgeCode: string) => {
    const municipality = territories.find(item => item.codigo_ibge === ibgeCode)
    if (draft.get('uf') && municipality && territories.filter(item => item.codigo_ibge === ibgeCode).length === 1) applyTerritory(draft.get('uf')!, municipality.codigo)
  }
  const returnTo = location.pathname + location.search
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams(draft)
    for (const key of FILTER_KEYS.filter(key => key !== 'uf' && key !== 'municipio')) {
      const value = String(data.get(key) ?? '').trim()
      if (value) next.set(key, value); else next.delete(key)
    }
    applyB2BForm(data, next)
    next.set('page', '1')
    const error = next.get("atividade_escopo") === "principal_ou_secundaria" && capability.data !== true ? "Secundarias sem certificacao publicada para a release." : mapEligibility(next, municipalities.data, municipalities.isSuccess)
    setValidationError(error)
    if (!error) { resetDraft(next); setSearch(next) }
  }
  const matchingContext = map.data && list.data && map.data.release !== null && map.data.release === list.data.release && JSON.stringify(map.data.b2b_context) === JSON.stringify(list.data.b2b_context) && JSON.stringify(Object.entries(map.data.filters).sort()) === JSON.stringify(Object.entries(list.data.filters).sort())
  const matchingFilters = map.data && canonicalFilters(map.data.filters) === canonicalFilters(mapFilters)
  const points = !blocked && !map.isError && !list.isError && matchingFilters && matchingContext ? (map.data?.points ?? []).filter(point => point.release === map.data?.release) : []
  return <div className="cno-explorer">
    {eligibilityError ? <p role="status">{eligibilityError}</p> : null}{validationError ? <p role="alert">{validationError}</p> : null}
    <aside className="filter-card partner-map-filters"><h1>Mapa de Empresas</h1><p>Explore estabelecimentos por território.</p><label>UF<select aria-label="UF" value={draft.get('uf') ?? ''} onChange={event => applyTerritory(event.target.value)}><option value="">Brasil</option>{draft.get('uf') && states.isSuccess && !states.data.some(item => item.sigla === draft.get('uf')) ? <option value={draft.get('uf')!}>{draft.get('uf')} (UF inválida)</option> : null}{(states.data ?? []).map(state => <option key={state.id} value={state.sigla}>{state.sigla} · {state.nome}</option>)}</select></label><label>Município<select aria-label="Município" value={draft.get('municipio') ?? ''} disabled={!draft.get('uf') || municipalities.isFetching} onChange={event => applyTerritory(draft.get('uf') ?? '', event.target.value)}><option value="">Todos</option>{draft.get('municipio') && !territories.some(item => item.codigo === draft.get('municipio')) ? <option value={draft.get('municipio')!}>{draft.get('municipio')} (confirmar no domínio Receita)</option> : null}{territories.map(item => <option key={item.codigo} value={item.codigo}>{item.descricao}</option>)}</select></label>{municipalities.isError ? <QueryError error={municipalities.error} retry={() => void municipalities.refetch()} /> : null}{states.isError ? <QueryError error={states.error} retry={() => void states.refetch()} /> : null}<form key={formReset + [...FILTER_KEYS, ...B2B_FILTER_KEYS].map(key => search.get(key)).join('|')} onChange={markDirty} onSubmit={applyFilters}><CnpjOtherQueries search={search} dirty={dirty} blocked={blocked}><CnpjB2BFilters search={search} onDraftChange={markDirty} /><label>Situação cadastral (código; opcional)<input name="situacao_cadastral" defaultValue={filters.situacao_cadastral ?? ''} /></label><label>Matriz/filial (código)<input name="matriz_filial" defaultValue={filters.matriz_filial ?? ''} /></label><label>Porte (código)<input name="porte" defaultValue={filters.porte ?? ''} /></label><label>Natureza jurídica (código)<input name="natureza_juridica" defaultValue={filters.natureza_juridica ?? ''} /></label></CnpjOtherQueries><button>Aplicar filtros</button><button type="button" onClick={clearFilters}>Limpar filtros</button></form></aside>
    <div>
      <section className="cno-map-card" aria-label="Explorar estabelecimentos no mapa"><div className="cno-map-heading"><div><h2>{selectedMunicipality?.descricao ?? (draft.get('uf') ? `Municípios de ${draft.get('uf')}` : 'Explore o Brasil')}</h2><p>Clique em {draft.get('uf') ? 'um município' : 'uma UF'} para editar o rascunho; depois aplique os filtros.</p></div>{draft.get('uf') ? <button type="button" onClick={clearFilters}>Voltar ao Brasil</button> : null}</div>{!blocked && map.isFetching ? <p role="status" className="cno-map-caption">Carregando cobertura cartográfica…</p> : null}{!blocked && map.isError ? <QueryError error={map.error} retry={() => { if (!blocked) void map.refetch() }} /> : null}{!blocked && map.data?.release === null ? <p role="status">Publicação CNPJ indisponível para o mapa.</p> : null}{!blocked && map.data && map.data.points.length === 0 ? <p role="status">Nenhum estabelecimento com coordenadas válidas neste recorte.</p> : null}{!blocked && map.data && !matchingFilters ? <p role="alert">Os filtros publicados pelo mapa diferem do recorte solicitado. Os pontos estão ocultos.</p> : null}<Suspense fallback={<p role="status" className="cno-map-state">Carregando mapa…</p>}><TerritoryMap uf={draft.get('uf') ?? ''} names={draft.get('uf') ? municipalityNames : stateNames} selectedMunicipalityIbge={selectedMunicipality?.codigo_ibge ?? null} points={points} returnTo={returnTo} onState={selectState} onMunicipality={selectMunicipality} /></Suspense>{!blocked && map.data ? <p className="cno-map-coverage">{map.data.coverage.points_total} pontos para {map.data.coverage.results_total} estabelecimentos · {map.data.coverage.without_coordinates_total} sem coordenadas · release {map.data.release ?? 'indisponível'}.{map.data.coverage.truncated ? ` Exibindo ${map.data.coverage.returned_points} de ${map.data.coverage.points_total} pontos (limite ${map.data.coverage.limit}; máximo ${map.data.coverage.maximum_limit}).` : ' Cobertura cartográfica completa para os pontos válidos do recorte.'}</p> : null}<p className="cno-map-caption">A seleção territorial edita o rascunho; Aplicar filtros atualiza mapa e resultados. Estabelecimentos sem coordenadas permanecem na lista. Mapa e lista usam os mesmos filtros territoriais e empresariais; a busca textual pertence ao modo Busca. Mapa e lista contextual declaram release, filtros e contexto B2B; os pontos dependem da compatibilidade dessas respostas. Não há garantia de snapshot transacional entre requisições.</p></section>
      <section className="cno-results-panel" aria-label="Resultados de estabelecimentos"><div className="results-heading"><h2>Estabelecimentos do recorte</h2></div>{list.isPending && !blocked ? <p role="status">Carregando resultados…</p> : null}{!blocked && list.isError ? <QueryError error={list.error} retry={() => { if (!blocked) void list.refetch() }} /> : null}{view?.results.length === 0 ? <Empty /> : null}{view && view.results.length > 0 ? <><div className="table-wrap" tabIndex={0} role="region" aria-label="Resultados textuais"><table><thead><tr><th>Nome</th><th>CNPJ</th><th>Município/UF</th></tr></thead><tbody>{view.results.map(item => <tr key={item.id}><td><Link to={`/receita-federal/cnpj/estabelecimentos/${item.cnpj}?return_to=${encodeURIComponent(returnTo)}`}>{item.nome_fantasia || item.razao_social}</Link></td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || 'Município não informado'} / {item.uf || 'UF não informada'}</td></tr>)}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={onPage} /></> : null}</section>
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
    if (mode === 'mapa' || !isInvalidTextMatchMode(rawQMode)) return
    const next = new URLSearchParams(search)
    next.set('q_modo', 'contendo')
    setSearch(next, { replace: true })
  }, [mode, rawQMode, search, setSearch])
  const page = pageFromSearch(search.get('page'))
  const activeFilterKeys = mode === 'mapa' ? [...FILTER_KEYS, ...B2B_FILTER_KEYS] : FILTER_KEYS
  const filters = Object.fromEntries(activeFilterKeys.flatMap(key => { const value = search.get(key); return value !== null && (value !== '' || (B2B_FILTER_KEYS as readonly string[]).includes(key)) ? [[key, value]] : [] })) as Pick<BusinessSearchFilters, typeof FILTER_KEYS[number]> & B2BFilters
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
    {view && view.results.length > 0 && <><div className="results-heading"><h1>Resultados</h1></div><div className="table-wrap" tabIndex={0} role="region" aria-label="Resultados textuais"><table><thead><tr><th>Razão social</th><th>Nome fantasia</th><th>CNPJ</th><th><span className="column-filter-heading">Localidade <LocationFacetFilter q={term} qMode={qMode} filters={facetFilters} selected={filters.uf && filters.municipio ? { uf: filters.uf, municipio: filters.municipio } : null} onSelect={changeLocation} /></span></th><th>Atividade principal</th></tr></thead><tbody>{view.results.map(item => { const returnTo = `${location.pathname}${location.search}`; const target = `/receita-federal/cnpj/empresas/${item.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`; return <tr className="clickable-row" key={item.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${item.razao_social}`} /><span>{item.razao_social}</span></td><td>{item.nome_fantasia || '—'}</td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || 'Município não informado'} / {item.uf}</td><td>{item.cnae_principal ? `${item.cnae_principal.codigo} · ${item.cnae_principal.descricao}` : '—'}</td></tr>})}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></>}
    </>}
  </section>
}
