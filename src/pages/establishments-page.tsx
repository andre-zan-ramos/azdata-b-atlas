import { useQuery } from '@tanstack/react-query'
import { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage } from '../api/receita-federal/cnpj/pagination'
import type { EstablishmentFilters, PageSize } from '../api/receita-federal/cnpj/types'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { digits, formatCnpj } from '../utils/format'

type TextField = 'razao_social' | 'nome_fantasia'
const PAGE_SIZE: PageSize = 10
const looksLikeDocument = (value: string) => /^[\d./\s-]+$/.test(value)

export function EstablishmentsPage() {
  const [search, setSearch] = useSearchParams()
  const term = search.get('q')?.trim() ?? ''
  const page = Number(search.get('page') || 1)
  const fixedTextField = search.get('tipo') as TextField | null
  const numericTerm = digits(term)
  const documentSearch = term.length > 0 && looksLikeDocument(term)
  const invalidDocument = documentSearch && ![8, 14].includes(numericTerm.length)
  const query = useQuery({
    queryKey: ['cnpj', 'search', term, page, fixedTextField], enabled: Boolean(term) && !invalidDocument,
    queryFn: async ({ signal }) => {
      const base: EstablishmentFilters = { page, page_size: PAGE_SIZE }
      if (documentSearch && numericTerm.length === 14) return { data: await cnpjApi.establishments({ ...base, cnpj: numericTerm }, signal), source: 'cnpj' as const }
      if (documentSearch && numericTerm.length === 8) return { data: await cnpjApi.establishments({ ...base, cnpj_basico: numericTerm }, signal), source: 'cnpj_basico' as const }
      if (fixedTextField) return { data: await cnpjApi.establishments({ ...base, nome: term, nome_tipo: fixedTextField, nome_modo: 'contendo' }, signal), source: fixedTextField }
      const legalName = await cnpjApi.establishments({ ...base, nome: term, nome_tipo: 'razao_social', nome_modo: 'contendo' }, signal)
      if (legalName.results.length > 0) return { data: legalName, source: 'razao_social' as const }
      return { data: await cnpjApi.establishments({ ...base, nome: term, nome_tipo: 'nome_fantasia', nome_modo: 'contendo' }, signal), source: 'nome_fantasia' as const }
    },
  })
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('q') ?? '').trim(); setSearch(value ? { q: value, page: '1' } : {}) }
  const view = query.data && adaptPage(query.data.data, page, PAGE_SIZE)
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); if (query.data?.source === 'razao_social' || query.data?.source === 'nome_fantasia') next.set('tipo', query.data.source); setSearch(next) }
  return <section className="search-page"><form className="unified-search" onSubmit={submit} role="search"><label htmlFor="business-search">Encontre uma empresa</label><div className="search-row"><input id="business-search" name="q" defaultValue={term} autoFocus placeholder="Digite razão social, nome fantasia ou CNPJ" /><button>Buscar</button></div><p>Você pode informar um nome ou um CNPJ com 8 ou 14 dígitos.</p></form>
    {invalidDocument && <div className="inline-message error" role="alert">Para buscar por CNPJ, informe exatamente 8 ou 14 dígitos.</div>}
    {!term && <div className="search-intro"><h1>Explore o ambiente empresarial</h1><p>Comece por uma empresa. Novas formas de explorar atividades e territórios serão adicionadas aqui.</p></div>}
    {query.isPending && term && !invalidDocument && <div className="inline-message" role="status">Buscando…</div>}{query.isError && <QueryError error={query.error} retry={() => query.refetch()} />}{view?.results.length === 0 && <Empty />}
    {view && view.results.length > 0 && <><div className="results-heading"><h1>Resultados</h1><span>{query.data.source === 'nome_fantasia' ? 'Por nome fantasia' : query.data.source === 'razao_social' ? 'Por razão social' : 'Por CNPJ'}</span></div><div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Nome fantasia</th><th>CNPJ</th><th>Localidade</th><th>Atividade principal</th></tr></thead><tbody>{view.results.map(item => <tr key={item.id}><td><Link to={`/receita-federal/cnpj/estabelecimentos/${item.cnpj}`}>{item.razao_social}</Link></td><td>{item.nome_fantasia || '—'}</td><td>{formatCnpj(item.cnpj)}</td><td>{item.municipio?.descricao || '—'} / {item.uf}</td><td>{item.cnae_principal ? `${item.cnae_principal.codigo} · ${item.cnae_principal.descricao}` : '—'}</td></tr>)}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></>}
  </section>
}
