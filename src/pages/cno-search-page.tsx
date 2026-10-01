import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { listStates } from '../api/ibge/territories'
import { cnoApi, cnoQueryOptions, filterKeys } from '../api/receita-federal/cno/client'
import { adaptPage, readSearch } from '../api/receita-federal/cno/navigation'
import type { CnoMunicipality, Page, WorkMapFilters, WorkSummary } from '../api/receita-federal/cno/types'
import { fieldLabels, WorkTable } from '../components/cno-results'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { internalReturnTo } from '../utils/navigation'
import { AreaModeSwitcher, useAreaMode } from '../components/area-mode-switcher'

const TerritoryMap = lazy(() => import('../components/cno-territory-map').then(module => ({ default: module.CnoTerritoryMap })))

async function listCnoMunicipalities(uf: string, signal?: AbortSignal) {
  const results: CnoMunicipality[] = []
  for (let page = 1; ; page += 1) {
    const response = await cnoApi.municipios({ uf, page, page_size: 50 }, signal)
    results.push(...response.results)
    const hasNext = 'has_next' in response ? response.has_next : Boolean(response.next)
    if (!hasNext) return results
  }
}

export function CnoSearchPage() {
  const [search, setSearch] = useSearchParams()
  const mode = useAreaMode()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { filters, params, errors: urlErrors, active } = readSearch(search, 'obras')
  const [draft, setDraft] = useState<Record<string, string>>(filters)
  const [searchInput, setSearchInput] = useState(filters.q ?? '')
  const [municipalitySearch, setMunicipalitySearch] = useState('')
  const [municipalityOpen, setMunicipalityOpen] = useState(false)
  const [activeMunicipality, setActiveMunicipality] = useState(0)
  const states = useQuery({ queryKey: ['ibge', 'states'], queryFn: ({ signal }) => listStates(signal), staleTime: 86400000, retry: false, enabled: mode === 'mapa' })
  const municipalities = useQuery({ queryKey: ['cno', 'municipalities', draft.uf], queryFn: ({ signal }) => listCnoMunicipalities(draft.uf, signal), staleTime: 86400000, retry: false, enabled: mode === 'mapa' && Boolean(draft.uf) })
  const names = useMemo(() => new Map((draft.uf ? municipalities.data ?? [] : states.data ?? []).flatMap(item => 'codigo_ibge' in item ? item.codigo_ibge === null ? [] : [[item.codigo_ibge, item.nome] as const] : [[String(item.id), item.nome] as const])), [draft.uf, municipalities.data, states.data])
  const selectedMunicipality = draft.codigo_municipio ? municipalities.data?.find(item => item.codigo_tom === draft.codigo_municipio) : undefined
  const municipalityOptions = (municipalities.data ?? []).filter(item => item.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(municipalitySearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).slice(0, 30)
  const applied = JSON.stringify(filters)
  useEffect(() => { setDraft(JSON.parse(applied) as Record<string, string>) }, [applied])
  useEffect(() => { setSearchInput(filters.q ?? '') }, [filters.q])
  useEffect(() => { if (draft.codigo_municipio && selectedMunicipality) setMunicipalitySearch(selectedMunicipality.nome) }, [selectedMunicipality, draft.codigo_municipio])
  const invalid = Object.keys(urlErrors).length > 0
  const queryActive = mode === 'mapa' ? active : Boolean(filters.q)
  const query = useQuery<Page<WorkSummary>>({
    ...cnoQueryOptions, queryKey: ['cno', 'obras', params], enabled: queryActive && !invalid,
    queryFn: ({ signal }) => cnoApi.obras(params, signal),
  })
  const mapFilters = useMemo(() => Object.fromEntries(
    filterKeys.obras.flatMap(key => key !== 'q' && filters[key] !== undefined ? [[key, filters[key]]] : []),
  ) as WorkMapFilters, [filters])
  const mapQuery = useQuery({
    ...cnoQueryOptions, queryKey: ['cno', 'obras-map', mapFilters], enabled: mode === 'mapa' && queryActive && !invalid,
    queryFn: ({ signal }) => cnoApi.mapa(mapFilters, signal),
  })
  const errors = { ...(query.error instanceof ApiError ? query.error.fields : {}), ...urlErrors }
  const error = invalid ? new ApiError('Revise os parâmetros da URL.', 400, undefined, urlErrors) : query.error
  const view = query.data && !invalid && !query.isError ? adaptPage(query.data, params.page!, params.page_size!) : undefined
  const visibleWorks = useMemo(() => mode === 'mapa' && query.data && !invalid && !query.isError ? query.data.results as WorkSummary[] : [], [invalid, mode, query.data, query.isError])
  const pendingTerritory = (draft.uf ?? '') !== (filters.uf ?? '') || (draft.codigo_municipio ?? '') !== (filters.codigo_municipio ?? '')
  const sameFilters = mapQuery.data && JSON.stringify(Object.entries(mapQuery.data.filters).sort()) === JSON.stringify(Object.entries(mapFilters).sort())
  const compatibleMap = Boolean(!invalid && !query.isError && mapQuery.data && query.data && !filters.q && sameFilters && visibleWorks.every(work => work.release === mapQuery.data?.release))
  const mapPoints = mode === 'mapa' && !pendingTerritory && compatibleMap && mapQuery.data && !mapQuery.isError ? mapQuery.data.points.filter(point => point.release === mapQuery.data?.release && point.source_file_id === mapQuery.data?.source_file_id) : []
  const geolocationMutation = useMutation({ mutationKey: ['cno', 'work-geolocation-request'], mutationFn: (ids: number[]) => cnoApi.requestWorkGeolocations(ids), retry: false })
  const requestWorkGeolocations = geolocationMutation.mutate
  const requestVisibleGeolocations = () => {
    const ids = visibleWorks.filter(work => work.geolocation?.status === 'not_requested' && !queryClient.getQueryData(['cno', 'work-geolocation-attempt', work.id])).map(work => work.id).slice(0, 50)
    if (!ids.length) return
    for (const id of ids) queryClient.setQueryData(['cno', 'work-geolocation-attempt', id], true)
    requestWorkGeolocations(ids, { onSettled: () => { void query.refetch(); void mapQuery.refetch() } })
  }
  const returnTo = location.pathname + location.search
  const apply = (listAll = false, overrides: Record<string, string> = {}) => {
    const next = new URLSearchParams()
    next.set('modo', 'mapa')
    const values = { ...draft, ...overrides }
    for (const key of filterKeys.obras) if (values[key] !== undefined && values[key] !== '') next.set(key, values[key])
    next.set('page', '1')
    next.set('page_size', String([10, 25, 50].includes(params.page_size!) ? params.page_size : 10))
    if (params.include_total !== undefined) next.set('include_total', String(params.include_total))
    if (listAll) next.set('listar', 'true')
    const back = search.get('return_to')
    if (back) next.set('return_to', internalReturnTo(back, '/receita-federal/cno'))
    if (next.toString() === search.toString() && active && !invalid) void query.refetch()
    else setSearch(next)
  }
  const submit = (event: FormEvent) => { event.preventDefault(); apply() }
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('modo', 'busca')
    const value = searchInput.trim()
    if (value) next.set('q', value)
    next.set('page', '1')
    next.set('page_size', String([10, 25, 50].includes(params.page_size!) ? params.page_size : 10))
    const back = search.get('return_to')
    if (back) next.set('return_to', internalReturnTo(back, '/receita-federal/cno'))
    setSearch(next)
  }
  const changePage = (page: number) => { const next = new URLSearchParams(search); next.set('page', String(page)); setSearch(next) }
  const field = (key: string, type = 'text') => <label key={key} htmlFor={`cno-${key}`}>{fieldLabels[key]}<input id={`cno-${key}`} name={key} type={type} aria-label={fieldLabels[key]} value={draft[key] ?? ''} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `cno-${key}-error` : undefined} />{errors[key] && <span className="field-error" id={`cno-${key}-error`}>{errors[key].join(' ')}</span>}</label>
  const selectState = (code: string) => {
    const state = states.data?.find(item => String(item.id) === code || item.sigla === code)
    if (!state?.sigla) return
    setDraft(current => ({ ...current, uf: state.sigla!, codigo_municipio: '' }))
    setMunicipalitySearch('')
    apply(false, { uf: state.sigla, codigo_municipio: '' })
  }
  const selectMunicipality = (code: string, applyNow = false) => {
    const municipality = municipalities.data?.find(item => item.codigo_ibge === code)
    if (!municipality) return
    setDraft(current => ({ ...current, codigo_municipio: municipality.codigo_tom }))
    setMunicipalitySearch(municipality.nome)
    setMunicipalityOpen(false)
    if (applyNow) apply(false, { codigo_municipio: municipality.codigo_tom })
  }

  const resultContent = <>
    {(mode === 'mapa' || queryActive) && <div className="cno-page-controls"><label>Resultados por página<select aria-label="Resultados por página" aria-invalid={Boolean(errors.page_size)} aria-describedby={errors.page_size ? 'cno-size-error' : undefined} value={params.page_size} onChange={event => { const next = new URLSearchParams(search); next.set('page_size', event.target.value); next.set('page', '1'); setSearch(next) }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select>{errors.page_size && <span id="cno-size-error" className="field-error">{errors.page_size.join(' ')}</span>}</label></div>}
    {!queryActive && !invalid && mode === 'mapa' && <p className="inline-message">Informe um identificador ou use os filtros para pesquisar.</p>}
    {query.isFetching && queryActive && !invalid && <p role="status">Buscando…</p>}
    {error && !(mode === 'busca' && errors.q) && <QueryError error={error} retry={() => { if (!invalid) void query.refetch() }} />}
    {queryActive && view && <>{view.results.length === 0 ? <Empty /> : <WorkTable items={view.results} returnTo={returnTo} />}<Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious && view.page > 1} next={view.hasNext && view.page < 999999999} onPage={changePage} /></>}
  </>

  return <section className="search-page cno-page">
    {search.has('return_to') && <Link className="back-link" to={internalReturnTo(search.get('return_to'), '/receita-federal/cno')}>Voltar à consulta anterior</Link>}
    <AreaModeSwitcher mode={mode} compatibleKeys={['return_to']} />
    {mode === 'busca' ? <>
      <form className={`unified-search${filters.q ? ' compact' : ''}`} onSubmit={submitSearch} role="search">
        <label htmlFor="work-search">Encontre uma obra</label>
        <div className="search-row"><input id="work-search" name="q" value={searchInput} onChange={event => setSearchInput(event.target.value)} autoFocus aria-invalid={Boolean(errors.q)} aria-describedby={errors.q ? 'work-search-error' : 'work-search-help'} placeholder="Digite o CNO ou o NI do responsável" /><button>Buscar</button></div>
        {errors.q ? <p className="field-error" id="work-search-error">{errors.q.join(' ')}</p> : <p id="work-search-help">A busca compara literalmente o valor com CNO e NI do responsável. Zeros à esquerda e pontuação são significativos.</p>}
      </form>
      {resultContent}
    </> : <>
    <div className="cno-explorer">
    <form className="filter-card" onSubmit={submit} role="search" aria-label="Pesquisa de obras">
        <div className="cno-primary-grid">
          <label>UF<select aria-label="UF" value={draft.uf ?? ''} onChange={event => { setDraft(current => ({ ...current, uf: event.target.value, codigo_municipio: '' })); setMunicipalitySearch('') }}><option value="">Todo o Brasil</option>{[...(states.data ?? [])].sort((a, b) => (a.sigla ?? '').localeCompare(b.sigla ?? '')).map(state => <option key={state.id} value={state.sigla}>{state.sigla} · {state.nome}</option>)}</select></label>
          <div className="cno-municipality-field"><label htmlFor="cno-municipality">Município</label><input id="cno-municipality" role="combobox" aria-autocomplete="list" aria-expanded={municipalityOpen} aria-controls="cno-municipalities" aria-activedescendant={municipalityOpen && municipalityOptions[activeMunicipality] ? `cno-municipality-${municipalityOptions[activeMunicipality].codigo_tom}` : undefined} disabled={!draft.uf || municipalities.isPending || municipalities.isError} placeholder={!draft.uf ? 'Selecione uma UF' : municipalities.isPending ? 'Carregando municípios…' : 'Buscar município…'} value={municipalitySearch} onFocus={() => setMunicipalityOpen(true)} onChange={event => { setMunicipalitySearch(event.target.value); setDraft(current => ({ ...current, codigo_municipio: '' })); setMunicipalityOpen(true); setActiveMunicipality(0) }} onKeyDown={event => { if (event.key === 'Escape') setMunicipalityOpen(false); else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setMunicipalityOpen(true); setActiveMunicipality(current => municipalityOptions.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + municipalityOptions.length) % municipalityOptions.length : 0) } else if (event.key === 'Enter' && municipalityOpen && municipalityOptions[activeMunicipality]) { event.preventDefault(); selectMunicipality(municipalityOptions[activeMunicipality].codigo_ibge ?? '') } }} />{municipalityOpen && draft.uf && <div className="cno-municipality-options" id="cno-municipalities" role="listbox">{municipalityOptions.map((item, index) => <button id={`cno-municipality-${item.codigo_tom}`} key={`${item.uf}:${item.codigo_tom}`} role="option" aria-selected={item.codigo_tom === draft.codigo_municipio} data-active={index === activeMunicipality} tabIndex={-1} type="button" onMouseEnter={() => setActiveMunicipality(index)} onClick={() => { setDraft(current => ({ ...current, codigo_municipio: item.codigo_tom })); setMunicipalitySearch(item.nome); setMunicipalityOpen(false) }}>{item.nome}</button>)}{!municipalityOptions.length && <span>Nenhum município encontrado.</span>}</div>}{draft.codigo_municipio && <small>Código TOM {draft.codigo_municipio}</small>}</div>
        </div>
        {states.isError && <p role="alert" className="cno-filter-note">Não foi possível carregar as UFs. <button type="button" onClick={() => void states.refetch()}>Tentar novamente</button></p>}
        {municipalities.isError && <p role="alert" className="cno-filter-note">Não foi possível carregar os municípios de {draft.uf}. <button type="button" onClick={() => void municipalities.refetch()}>Tentar novamente</button></p>}
        <p className="cno-filter-note">Selecione uma localidade ou clique no mapa para explorar as obras.</p>
        <div className="cno-form-grid">{field('data_inicio_obra_de', 'date')}{field('data_inicio_obra_ate', 'date')}</div>
        <details className="cno-advanced" open={['cno', 'ni_responsavel', 'situacao', 'cnae', 'cno_vinculado'].some(key => Boolean(filters[key]) || Boolean(errors[key])) || undefined}><summary>Identificadores e outros filtros</summary><div className="cno-form-grid">{['cno', 'ni_responsavel', 'situacao', 'cnae', 'cno_vinculado'].map(key => field(key))}</div></details>
      <div className="form-actions"><button type="submit">Pesquisar</button>{!active && <button type="button" onClick={() => apply(true)}>Listar obras</button>}</div>
    </form>
    <section className="cno-map-card" aria-label="Explorar localidades no mapa"><div className="cno-map-heading"><div><h2>{selectedMunicipality ? selectedMunicipality.nome : draft.uf ? `Municípios de ${draft.uf}` : 'Explore o Brasil'}</h2><p>{selectedMunicipality ? 'Município enquadrado no mapa; pontos disponíveis representam aproximações pelo CEP.' : `Clique em ${draft.uf ? 'um município' : 'uma UF'} para filtrar as obras.`}</p></div>{draft.uf && <button type="button" onClick={() => { setDraft(current => ({ ...current, uf: '', codigo_municipio: '' })); setMunicipalitySearch(''); apply(false, { uf: '', codigo_municipio: '' }) }}>Voltar ao Brasil</button>}</div>{mapQuery.isFetching && queryActive ? <p role="status" className="cno-map-caption">Carregando cobertura cartográfica…</p> : null}{mapQuery.isError ? <QueryError error={mapQuery.error} retry={() => void mapQuery.refetch()} /> : null}{pendingTerritory ? <p role="status">Seleção territorial ainda não aplicada. Use Pesquisar para atualizar o recorte da lista e dos pontos.</p> : null}{mapQuery.data && query.data && !compatibleMap ? <p role="alert">Mapa e resultados têm filtros ou publicações incompatíveis. Os pontos estão ocultos; revise os filtros ou atualize as consultas. <button type="button" onClick={() => { void query.refetch(); void mapQuery.refetch() }}>Atualizar mapa e resultados</button></p> : null}{mapQuery.data?.release === null ? <p role="status">Publicação CNO indisponível para o mapa.</p> : null}{mapQuery.data && compatibleMap && mapPoints.length === 0 ? <p role="status">Nenhuma ocorrência com coordenadas válidas neste recorte.</p> : null}<Suspense fallback={<p role="status" className="cno-map-state">Carregando mapa…</p>}><TerritoryMap uf={draft.uf ?? ''} names={names} selectedMunicipalityIbge={selectedMunicipality?.codigo_ibge ?? null} works={mapPoints} returnTo={returnTo} onState={selectState} onMunicipality={code => selectMunicipality(code, true)} /></Suspense>{mapQuery.data ? <p className="cno-map-coverage">{mapQuery.data.coverage.points_total} pontos para {mapQuery.data.coverage.results_total} ocorrências · {mapQuery.data.coverage.without_coordinates_total} sem coordenadas · release {mapQuery.data.release ?? 'indisponível'} · arquivo {mapQuery.data.source_file_id ?? 'indisponível'}.{mapQuery.data.coverage.truncated ? ` Exibindo ${mapQuery.data.coverage.returned_points} de ${mapQuery.data.coverage.points_total} pontos (limite ${mapQuery.data.coverage.limit}; máximo ${mapQuery.data.coverage.maximum_limit}).` : ' Cobertura cartográfica completa para os pontos válidos do recorte.'}</p> : null}<button type="button" disabled={geolocationMutation.isPending || !visibleWorks.some(work => work.geolocation?.status === 'not_requested' && !queryClient.getQueryData(['cno', 'work-geolocation-attempt', work.id]))} onClick={requestVisibleGeolocations}>Solicitar localizações da página (até 50)</button><p className="cno-map-caption">{geolocationMutation.isPending ? 'Solicitando localizações aproximadas ainda não registradas…' : geolocationMutation.isError ? 'Não foi possível solicitar novas localizações; as obras e os pontos já registrados continuam disponíveis.' : 'A seleção no mapa atualiza a pesquisa. Obras sem coordenadas continuam disponíveis nos resultados. A lista declara release por ocorrência; uma página vazia não confirma compatibilidade de publicação. Não há garantia de snapshot entre requisições.'}{visibleWorks.some(work => work.geolocation?.status === 'pending') && !geolocationMutation.isPending ? <> O enriquecimento de algumas obras está em andamento. <button className="cno-map-refresh" type="button" onClick={() => { void query.refetch(); void mapQuery.refetch() }}>Atualizar pontos</button></> : null}</p></section>
    <details className="cno-results-panel cno-results-disclosure"><summary>Resultados da pesquisa{view ? ` (${view.results.length} nesta página)` : ''}</summary>{resultContent}</details>
    </div>
    </>}
  </section>
}
