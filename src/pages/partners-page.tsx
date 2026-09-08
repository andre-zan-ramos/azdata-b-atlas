import { useQuery } from '@tanstack/react-query'
import { FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage } from '../api/receita-federal/cnpj/pagination'
import type { PageSize } from '../api/receita-federal/cnpj/types'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'

const PAGE_SIZE: PageSize = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

export function PartnersPage() {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const term = search.get('q')?.trim() ?? ''
  const page = Number(search.get('page') || 1)
  const params = { q: term, page, page_size: PAGE_SIZE }
  const query = useQuery({ queryKey: ['cnpj', 'partners', params], enabled: Boolean(term), queryFn: ({ signal }) => cnpjApi.partners(params, signal) })
  const qError = query.error instanceof ApiError ? query.error.fields?.q?.join(' ') : undefined
  const view = query.data && adaptPage(query.data, page, PAGE_SIZE)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    const next = new URLSearchParams()
    if (value) { next.set('q', value); next.set('page', '1') }
    setSearch(next)
  }
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }

  return <section className="search-page">
    <form className={`unified-search${term ? ' compact' : ''}`} onSubmit={submit} role="search">
      <label htmlFor="partner-search">Encontre um sócio</label>
      <div className="search-row"><input id="partner-search" name="q" defaultValue={term} autoFocus aria-invalid={Boolean(qError)} aria-describedby={qError ? 'partner-search-error' : 'partner-search-help'} placeholder="Digite o nome da pessoa ou empresa sócia" /><button>Buscar</button></div>
      {qError ? <p className="field-error" id="partner-search-error">{qError}</p> : <p id="partner-search-help">A busca encontra participações societárias pelo nome informado. Documentos podem estar mascarados na fonte.</p>}
    </form>
    {query.isPending && term ? <div className="inline-message" role="status">Buscando…</div> : null}
    {query.isError && !qError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {view?.results.length === 0 ? <Empty /> : null}
    {view && view.results.length > 0 ? <>
      <div className="results-heading"><h1>Participações societárias</h1></div>
      <div className="table-wrap"><table><thead><tr><th>Sócio</th><th>Empresa</th><th>CNPJ básico</th><th>Qualificação</th><th>Entrada</th></tr></thead><tbody>{view.results.map(item => {
        const returnTo = `${location.pathname}${location.search}`
        const target = `/receita-federal/cnpj/empresas/${item.empresa.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`
        return <tr className="clickable-row" key={item.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${item.empresa.razao_social}`} /><span>{item.nome_socio_ou_razao_social}</span></td><td>{item.empresa.razao_social}</td><td>{item.empresa.cnpj_basico}</td><td>{item.qualificacao_socio?.descricao || '—'}</td><td>{item.data_entrada_sociedade ? DATE_FORMATTER.format(new Date(`${item.data_entrada_sociedade}T00:00:00Z`)) : '—'}</td></tr>
      })}</tbody></table></div>
      <Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} />
    </> : null}
  </section>
}
