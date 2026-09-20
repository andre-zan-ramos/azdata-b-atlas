import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnoApi, cnoQueryOptions, filterKeys } from '../api/receita-federal/cno/client'
import { adaptPage, readSearch } from '../api/receita-federal/cno/navigation'
import type { Page, WorkLink, WorkSummary } from '../api/receita-federal/cno/types'
import { fieldLabels, LinkResults, WorkResults } from '../components/cno-results'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { internalReturnTo } from '../utils/navigation'

export function CnoSearchPage({ kind = 'obras' }: { kind?: 'obras' | 'vinculos' }) {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const { filters, params, errors: urlErrors, active } = readSearch(search, kind)
  const [draft, setDraft] = useState<Record<string, string>>(filters)
  const applied = JSON.stringify(filters)
  useEffect(() => { setDraft(JSON.parse(applied) as Record<string, string>) }, [applied])
  const invalid = Object.keys(urlErrors).length > 0
  const query = useQuery<Page<WorkSummary> | Page<WorkLink>>({
    ...cnoQueryOptions, queryKey: ['cno', kind, params], enabled: active && !invalid,
    queryFn: ({ signal }) => kind === 'obras' ? cnoApi.obras(params, signal) : cnoApi.vinculos(params, signal),
  })
  const errors = { ...(query.error instanceof ApiError ? query.error.fields : {}), ...urlErrors }
  const error = invalid ? new ApiError('Revise os parâmetros da URL.', 400, undefined, urlErrors) : query.error
  const view = query.data && !invalid && !query.isError ? adaptPage<WorkSummary | WorkLink>(query.data, params.page!, params.page_size!) : undefined
  const returnTo = location.pathname + location.search
  const apply = (listAll = false) => {
    const next = new URLSearchParams()
    for (const key of filterKeys[kind]) if (draft[key] !== undefined && draft[key] !== '') next.set(key, draft[key])
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

  return <section className="search-page cno-page">
    {search.has('return_to') && <Link className="back-link" to={internalReturnTo(search.get('return_to'), '/receita-federal/cno')}>Voltar à consulta anterior</Link>}
    <div className="page-heading"><h1>{kind === 'obras' ? 'Obras' : 'Vínculos de obras'}</h1><Link to={kind === 'obras' ? '/receita-federal/cno/vinculos' : '/receita-federal/cno'}>{kind === 'obras' ? 'Pesquisar vínculos' : 'Pesquisar obras'}</Link></div>
    <form className="filter-card" onSubmit={submit} role="search" aria-label={kind === 'obras' ? 'Pesquisa de obras' : 'Pesquisa de vínculos'}>
      <div className="cno-form-grid">{field('cno')}{field('ni_responsavel')}</div>
      {kind === 'obras' && <details className="cno-advanced" open={filterKeys.obras.slice(2).some(key => Boolean(filters[key]) || Boolean(errors[key])) || undefined}><summary>Mais filtros</summary><div className="cno-form-grid">{filterKeys.obras.slice(2).map(field)}</div></details>}
      <div className="form-actions"><button type="submit">Pesquisar</button>{!active && <button type="button" onClick={() => apply(true)}>Listar {kind === 'obras' ? 'obras' : 'vínculos'}</button>}</div>
    </form>
    <div className="cno-page-controls"><label>Resultados por página<select aria-invalid={Boolean(errors.page_size)} aria-describedby={errors.page_size ? 'cno-size-error' : undefined} value={params.page_size} onChange={event => { const next = new URLSearchParams(search); next.set('page_size', event.target.value); next.set('page', '1'); setSearch(next) }}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select>{errors.page_size && <span id="cno-size-error" className="field-error">{errors.page_size.join(' ')}</span>}</label></div>
    {!active && !invalid && <p className="inline-message">Informe um identificador ou use os filtros para pesquisar.</p>}
    {query.isFetching && active && !invalid && <p role="status">Buscando…</p>}
    {error && <QueryError error={error} retry={() => { if (!invalid) void query.refetch() }} />}
    {active && view && <>{view.results.length === 0 ? <Empty /> : kind === 'obras' ? <WorkResults items={view.results as WorkSummary[]} returnTo={returnTo} /> : <LinkResults items={view.results as WorkLink[]} returnTo={returnTo} />}<Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious && view.page > 1} next={view.hasNext && view.page < 999999999} onPage={changePage} /></>}
  </section>
}
