import { useQuery } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import type { PageSize } from '../api/receita-federal/cnpj/types'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'

const PAGE_SIZE: PageSize = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

export function PartnersPage() {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const term = search.get('q')?.trim() ?? ''
  const [inputValue, setInputValue] = useState(term)
  useEffect(() => setInputValue(term), [term])
  const page = pageFromSearch(search.get('page'))
  const params = { q: term, page, page_size: PAGE_SIZE }
  const searchable = term.length >= 3
  const query = useQuery({ queryKey: ['cnpj', 'partners', params], enabled: searchable, queryFn: ({ signal }) => cnpjApi.partners(params, signal) })
  const localQError = term && !searchable ? 'Informe ao menos 3 caracteres.' : undefined
  const qError = localQError || (query.error instanceof ApiError ? query.error.fields?.q?.join(' ') : undefined)
  const view = query.data && adaptPage(query.data, page, PAGE_SIZE)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = inputValue.trim()
    const next = new URLSearchParams()
    if (value) { next.set('q', value); next.set('page', '1') }
    setSearch(next)
  }
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }

  return <section className="search-page">
    <form className={`unified-search${term ? ' compact' : ''}`} onSubmit={submit} role="search">
      <label htmlFor="partner-search">Encontre um sócio</label>
      <div className="search-row"><input id="partner-search" name="q" value={inputValue} onChange={event => setInputValue(event.target.value)} autoFocus aria-invalid={Boolean(qError)} aria-describedby={qError ? 'partner-search-error' : 'partner-search-help'} placeholder="Digite o nome da pessoa ou empresa sócia" /><button>Buscar</button></div>
      {qError ? <p className="field-error" id="partner-search-error">{qError}</p> : <p id="partner-search-help">A busca agrupa participações pelo nome e documento mascarado informados pela fonte. O agrupamento não comprova uma identidade civil única.</p>}
    </form>
    {query.isPending && searchable ? <div className="inline-message" role="status">Buscando…</div> : null}
    {query.isError && !qError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {view?.results.length === 0 ? <Empty /> : null}
    {view && view.results.length > 0 ? <>
      <div className="results-heading"><h1>Sócios encontrados</h1></div>
      <div className="partner-groups">{view.results.map((group, groupIndex) => {
        const returnTo = `${location.pathname}${location.search}`
        return <article className="partner-group" key={`${group.nome_socio_ou_razao_social}-${group.cnpj_cpf_socio ?? 'sem-documento'}-${groupIndex}`}>
          <header className="partner-group-heading">
            <div><h2>{group.nome_socio_ou_razao_social}</h2><span className="meta">{group.cnpj_cpf_socio || 'Documento não informado'}</span></div>
            <strong>{group.participacoes_count} {group.participacoes_count === 1 ? 'participação' : 'participações'}</strong>
          </header>
          <div className="partner-participations"><table><thead><tr><th>Empresa</th><th>CNPJ básico</th><th>Qualificação</th><th>Entrada</th></tr></thead><tbody>{group.participacoes.map(participation => {
            const target = `/receita-federal/cnpj/empresas/${participation.empresa.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`
            return <tr className="clickable-row" key={participation.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${participation.empresa.razao_social}`} /><strong>{participation.empresa.razao_social || 'Razão social não informada'}</strong></td><td>{participation.empresa.cnpj_basico}</td><td>{participation.qualificacao_socio?.descricao || 'Qualificação não informada'}</td><td>{participation.data_entrada_sociedade ? DATE_FORMATTER.format(new Date(`${participation.data_entrada_sociedade}T00:00:00Z`)) : 'Data não informada'}</td></tr>
          })}</tbody></table></div>
        </article>
      })}</div>
      <Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} />
    </> : null}
  </section>
}
