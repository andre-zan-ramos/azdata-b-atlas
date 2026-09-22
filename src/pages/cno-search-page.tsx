import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { listMunicipalities, listStates } from '../api/ibge/territories'
import { tomByIbge } from '../api/ibge/tom-codes'
import { cnoApi, cnoQueryOptions, filterKeys } from '../api/receita-federal/cno/client'
import { adaptPage, readSearch } from '../api/receita-federal/cno/navigation'
import type { Page, WorkLink, WorkSummary } from '../api/receita-federal/cno/types'
import { fieldLabels, LinkResults, WorkTable } from '../components/cno-results'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { internalReturnTo } from '../utils/navigation'

const TerritoryMap = lazy(() => import('../components/cno-territory-map').then(module => ({ default: module.CnoTerritoryMap })))

export function CnoSearchPage({ kind = 'obras' }: { kind?: 'obras' | 'vinculos' }) {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const { filters, params, errors: urlErrors, active } = readSearch(search, kind)
  const [draft, setDraft] = useState<Record<string, string>>(filters)
  const [municipalitySearch, setMunicipalitySearch] = useState('')
  const [municipalityOpen, setMunicipalityOpen] = useState(false)
  const [activeMunicipality, setActiveMunicipality] = useState(0)
  const states = useQuery({ queryKey: ['ibge', 'states'], queryFn: ({ signal }) => listStates(signal), staleTime: 86400000, retry: false, enabled: kind === 'obras' })
  const municipalities = useQuery({ queryKey: ['ibge', 'municipalities', draft.uf], queryFn: ({ signal }) => listMunicipalities(draft.uf, signal), staleTime: 86400000, retry: false, enabled: kind === 'obras' && Boolean(draft.uf) })
  const names = useMemo(() => new Map((draft.uf ? municipalities.data ?? [] : states.data ?? []).map(item => [String(item.id), item.nome])), [draft.uf, municipalities.data, states.data])
  const selectedMunicipality = draft.codigo_municipio ? municipalities.data?.find(item => tomByIbge[String(item.id)] === draft.codigo_municipio) : undefined
  const municipalityOptions = (municipalities.data ?? []).filter(item => tomByIbge[String(item.id)] && item.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(municipalitySearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).slice(0, 30)
  const applied = JSON.stringify(filters)
  useEffect(() => { setDraft(JSON.parse(applied) as Record<string, string>) }, [applied])
  useEffect(() => { if (draft.codigo_municipio && selectedMunicipality) setMunicipalitySearch(selectedMunicipality.nome) }, [selectedMunicipality, draft.codigo_municipio])
  const invalid = Object.keys(urlErrors).length > 0
  const query = useQuery<Page<WorkSummary> | Page<WorkLink>>({
    ...cnoQueryOptions, queryKey: ['cno', kind, params], enabled: active && !invalid,
    queryFn: ({ signal }) => kind === 'obras' ? cnoApi.obras(params, signal) : cnoApi.vinculos(params, signal),
  })
  const errors = { ...(query.error instanceof ApiError ? query.error.fields : {}), ...urlErrors }
  const error = invalid ? new ApiError('Revise os parâmetros da URL.', 400, undefined, urlErrors) : query.error
  const view = query.data && !invalid && !query.isError ? adaptPage<WorkSummary | WorkLink>(query.data, params.page!, params.page_size!) : undefined
  const returnTo = location.pathname + location.search
  const apply = (listAll = false, overrides: Record<string, string> = {}) => {
    const next = new URLSearchParams()
    const values = { ...draft, ...overrides }
    for (const key of filterKeys[kind]) if (values[key] !== undefined && values[key] !== '') next.set(key, values[key])
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
  const changePage = (page: number) => { const next = new URLSearchParams(search); next.set('page', String(page)); setSearch(next) }
  const field = (key: string) => <label key={key} htmlFor={`cno-${key}`}>{fieldLabels[key]}<input id={`cno-${key}`} name={key} type="text" aria-label={fieldLabels[key]} value={draft[key] ?? ''} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `cno-${key}-error` : undefined} />{errors[key] && <span className="field-error" id={`cno-${key}-error`}>{errors[key].join(' ')}</span>}</label>
  const selectState = (code: string) => {
    const state = states.data?.find(item => String(item.id) === code || item.sigla === code)
    if (!state?.sigla) return
    setDraft(current => ({ ...current, uf: state.sigla!, codigo_municipio: '' }))
    setMunicipalitySearch('')
    apply(false, { uf: state.sigla, codigo_municipio: '' })
  }
  const selectMunicipality = (code: string, applyNow = false) => {
    const tom = tomByIbge[code]
    if (!tom) return
    setDraft(current => ({ ...current, codigo_municipio: tom }))
    setMunicipalitySearch(municipalities.data?.find(item => String(item.id) === code)?.nome ?? '')
    setMunicipalityOpen(false)
    if (applyNow) apply(false, { codigo_municipio: tom })
  }

  const resultContent = <>
    <div className="cno-page-controls"><label>Resultados por página<select aria-label="Resultados por página" aria-invalid={Boolean(errors.page_size)} aria-describedby={errors.page_size ? 'cno-size-error' : undefined} value={params.page_size} onChange={event => { const next = new URLSearchParams(search); next.set('page_size', event.target.value); next.set('page', '1'); setSearch(next) }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select>{errors.page_size && <span id="cno-size-error" className="field-error">{errors.page_size.join(' ')}</span>}</label></div>
    {!active && !invalid && <p className="inline-message">Informe um identificador ou use os filtros para pesquisar.</p>}
    {query.isFetching && active && !invalid && <p role="status">Buscando…</p>}
    {error && <QueryError error={error} retry={() => { if (!invalid) void query.refetch() }} />}
    {active && view && <>{view.results.length === 0 ? <Empty /> : kind === 'obras' ? <WorkTable items={view.results as WorkSummary[]} returnTo={returnTo} /> : <LinkResults items={view.results as WorkLink[]} returnTo={returnTo} />}<Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious && view.page > 1} next={view.hasNext && view.page < 999999999} onPage={changePage} /></>}
  </>

  return <section className="search-page cno-page">
    {search.has('return_to') && <Link className="back-link" to={internalReturnTo(search.get('return_to'), '/receita-federal/cno')}>Voltar à consulta anterior</Link>}
    <div className="page-heading"><h1>{kind === 'obras' ? 'Obras' : 'Vínculos de obras'}</h1><Link to={kind === 'obras' ? '/receita-federal/cno/vinculos' : '/receita-federal/cno'}>{kind === 'obras' ? 'Pesquisar vínculos' : 'Pesquisar obras'}</Link></div>
    <div className={kind === 'obras' ? 'cno-explorer' : undefined}>
    <form className="filter-card" onSubmit={submit} role="search" aria-label={kind === 'obras' ? 'Pesquisa de obras' : 'Pesquisa de vínculos'}>
      {kind === 'obras' ? <>
        <div className="cno-primary-grid">
          <label>UF<select aria-label="UF" value={draft.uf ?? ''} onChange={event => { setDraft(current => ({ ...current, uf: event.target.value, codigo_municipio: '' })); setMunicipalitySearch('') }}><option value="">Todo o Brasil</option>{[...(states.data ?? [])].sort((a, b) => (a.sigla ?? '').localeCompare(b.sigla ?? '')).map(state => <option key={state.id} value={state.sigla}>{state.sigla} · {state.nome}</option>)}</select></label>
          <div className="cno-municipality-field"><label htmlFor="cno-municipality">Município</label><input id="cno-municipality" role="combobox" aria-autocomplete="list" aria-expanded={municipalityOpen} aria-controls="cno-municipalities" aria-activedescendant={municipalityOpen && municipalityOptions[activeMunicipality] ? `cno-municipality-${municipalityOptions[activeMunicipality].id}` : undefined} disabled={!draft.uf || municipalities.isPending || municipalities.isError} placeholder={!draft.uf ? 'Selecione uma UF' : municipalities.isPending ? 'Carregando municípios…' : 'Buscar município…'} value={municipalitySearch} onFocus={() => setMunicipalityOpen(true)} onChange={event => { setMunicipalitySearch(event.target.value); setDraft(current => ({ ...current, codigo_municipio: '' })); setMunicipalityOpen(true); setActiveMunicipality(0) }} onKeyDown={event => { if (event.key === 'Escape') setMunicipalityOpen(false); else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setMunicipalityOpen(true); setActiveMunicipality(current => municipalityOptions.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + municipalityOptions.length) % municipalityOptions.length : 0) } else if (event.key === 'Enter' && municipalityOpen && municipalityOptions[activeMunicipality]) { event.preventDefault(); selectMunicipality(String(municipalityOptions[activeMunicipality].id)) } }} />{municipalityOpen && draft.uf && <div className="cno-municipality-options" id="cno-municipalities" role="listbox">{municipalityOptions.map((item, index) => <button id={`cno-municipality-${item.id}`} key={item.id} role="option" aria-selected={tomByIbge[String(item.id)] === draft.codigo_municipio} data-active={index === activeMunicipality} tabIndex={-1} type="button" onMouseEnter={() => setActiveMunicipality(index)} onClick={() => selectMunicipality(String(item.id))}>{item.nome}</button>)}{!municipalityOptions.length && <span>Nenhum município encontrado.</span>}</div>}{draft.codigo_municipio && <small>Código TOM {draft.codigo_municipio}</small>}</div>
        </div>
        {states.isError && <p role="alert" className="cno-filter-note">Não foi possível carregar as UFs. <button type="button" onClick={() => void states.refetch()}>Tentar novamente</button></p>}
        {municipalities.isError && <p role="alert" className="cno-filter-note">Não foi possível carregar os municípios de {draft.uf}. <button type="button" onClick={() => void municipalities.refetch()}>Tentar novamente</button></p>}
        <p className="cno-filter-note">Selecione uma localidade ou clique no mapa para explorar as obras.</p>
        <details className="cno-advanced" open={['cno', 'ni_responsavel', 'situacao', 'cnae', 'cno_vinculado'].some(key => Boolean(filters[key]) || Boolean(errors[key])) || undefined}><summary>Identificadores e outros filtros</summary><div className="cno-form-grid">{['cno', 'ni_responsavel', 'situacao', 'cnae', 'cno_vinculado'].map(field)}</div></details>
      </> : <div className="cno-form-grid">{field('cno')}{field('ni_responsavel')}</div>}
      <div className="form-actions"><button type="submit">Pesquisar</button>{!active && <button type="button" onClick={() => apply(true)}>Listar {kind === 'obras' ? 'obras' : 'vínculos'}</button>}</div>
    </form>
    {kind === 'obras' && <section className="cno-map-card" aria-label="Explorar localidades no mapa"><div className="cno-map-heading"><div><h2>{draft.uf ? `Municípios de ${draft.uf}` : 'Explore o Brasil'}</h2><p>Clique em {draft.uf ? 'um município' : 'uma UF'} para filtrar as obras.</p></div>{draft.uf && <button type="button" onClick={() => { setDraft(current => ({ ...current, uf: '', codigo_municipio: '' })); setMunicipalitySearch(''); apply(false, { uf: '', codigo_municipio: '' }) }}>Voltar ao Brasil</button>}</div><Suspense fallback={<p role="status" className="cno-map-state">Carregando mapa…</p>}><TerritoryMap uf={draft.uf ?? ''} names={names} onState={selectState} onMunicipality={code => selectMunicipality(code, true)} /></Suspense><p className="cno-map-caption">A seleção no mapa atualiza a pesquisa. Os demais filtros estão na coluna à esquerda.</p></section>}
    {kind === 'obras' ? <details className="cno-results-panel cno-results-disclosure"><summary>Resultados da pesquisa{view ? ` (${view.results.length} nesta página)` : ''}</summary>{resultContent}</details> : resultContent}
    </div>
  </section>
}
