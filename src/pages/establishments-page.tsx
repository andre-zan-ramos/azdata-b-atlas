import { useQuery } from '@tanstack/react-query'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import type { BusinessSearchFilters, PageSize } from '../api/receita-federal/cnpj/types'
import { LocationFacetFilter } from '../components/location-facet-filter'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { formatCnpj } from '../utils/format'

const PAGE_SIZE: PageSize = 10
const FILTER_KEYS = ['uf', 'municipio', 'cnae', 'situacao_cadastral', 'matriz_filial', 'porte', 'natureza_juridica'] as const

export function EstablishmentsPage() {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const term = search.get('q')?.trim() ?? ''
  const [inputValue, setInputValue] = useState(term)
  useEffect(() => setInputValue(term), [term])
  const page = pageFromSearch(search.get('page'))
  const filters = Object.fromEntries(FILTER_KEYS.flatMap(key => { const value = search.get(key); return value ? [[key, value]] : [] })) as Pick<BusinessSearchFilters, typeof FILTER_KEYS[number]>
  const params: BusinessSearchFilters = { q: term, ...filters, page, page_size: PAGE_SIZE }
  const query = useQuery({ queryKey: ['cnpj', 'search', params], enabled: Boolean(term), queryFn: ({ signal }) => cnpjApi.search(params, signal) })
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
  const changeLocation = (selection: { uf: string; municipio: string } | null) => {
    const next = new URLSearchParams(search)
    next.set('page', '1')
    if (selection) { next.set('uf', selection.uf); next.set('municipio', selection.municipio) } else { next.delete('uf'); next.delete('municipio') }
    setSearch(next)
  }
  const facetFilters = { cnae: filters.cnae, situacao_cadastral: filters.situacao_cadastral, matriz_filial: filters.matriz_filial, porte: filters.porte, natureza_juridica: filters.natureza_juridica }

  return <section className="search-page">
    <form className={`unified-search${term ? ' compact' : ''}`} onSubmit={submit} role="search">
      <label htmlFor="business-search">Encontre uma empresa</label>
      <div className="search-row"><input id="business-search" name="q" value={inputValue} onChange={event => setInputValue(event.target.value)} autoFocus aria-invalid={Boolean(qError)} aria-describedby={qError ? 'business-search-error' : 'business-search-help'} placeholder="Digite razão social, nome fantasia ou CNPJ" /><button>Buscar</button></div>
      {qError ? <p className="field-error" id="business-search-error">{qError}</p> : <p id="business-search-help">Você pode informar um nome ou um CNPJ com 8 ou 14 dígitos.</p>}
    </form>
    {query.isPending && term && <div className="inline-message" role="status">Buscando…</div>}
    {query.isError && !qError && <QueryError error={query.error} retry={() => query.refetch()} />}
    {view?.results.length === 0 && <Empty />}
    {view && view.results.length > 0 && <><div className="results-heading"><h1>Resultados</h1></div><div className="table-wrap"><table><thead><tr><th>Razão social</th><th>Nome fantasia</th><th>CNPJ</th><th><span className="column-filter-heading">Localidade <LocationFacetFilter q={term} filters={facetFilters} selected={filters.uf && filters.municipio ? { uf: filters.uf, municipio: filters.municipio } : null} onSelect={changeLocation} /></span></th><th>Atividade principal</th></tr></thead><tbody>{view.results.map(item => { const returnTo = `${location.pathname}${location.search}`; const target = `/receita-federal/cnpj/empresas/${item.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`; return <tr className="clickable-row" key={item.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${item.razao_social}`} /><span>{item.razao_social}</span></td><td>{item.nome_fantasia || '—'}</td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || 'Município não informado'} / {item.uf}</td><td>{item.cnae_principal ? `${item.cnae_principal.codigo} · ${item.cnae_principal.descricao}` : '—'}</td></tr>})}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></>}
  </section>
}
