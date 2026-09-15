import { useQuery } from '@tanstack/react-query'
import { FormEvent, useEffect, useId, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import { isInvalidTextMatchMode, textMatchModeFromSearch } from '../api/receita-federal/cnpj/match-mode'
import type { GroupedPartnerSearchItem, PageSize, PartnerParticipation, TextMatchMode } from '../api/receita-federal/cnpj/types'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { TextMatchModeSelect } from '../components/text-match-mode-select'
import { partnerDetailPath } from '../utils/partners'

const PAGE_SIZE: PageSize = 10
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
type SortField = 'empresa' | 'entrada'
type SortDirection = 'asc' | 'desc'

function compareOptional(left: string | null, right: string | null, direction: SortDirection, compare: (a: string, b: string) => number) {
  if (left === null) return right === null ? 0 : 1
  if (right === null) return -1
  return compare(left, right) * (direction === 'asc' ? 1 : -1)
}

function PartnerGroup({ group, returnTo, groupIndex }: { group: GroupedPartnerSearchItem; returnTo: string; groupIndex: number }) {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection } | null>(null)
  const regionId = `${useId().replace(/:/g, '')}-participacoes-${groupIndex}`
  const participations = sort ? [...group.participacoes].sort((left, right) => {
    if (sort.field === 'empresa') return compareOptional(left.empresa.razao_social || null, right.empresa.razao_social || null, sort.direction, (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    return compareOptional(left.data_entrada_sociedade, right.data_entrada_sociedade, sort.direction, (a, b) => a.localeCompare(b))
  }) : group.participacoes
  const changeSort = (field: SortField) => setSort(current => ({ field, direction: current?.field === field && current.direction === 'asc' ? 'desc' : 'asc' }))
  const sortLabel = (field: SortField, label: string) => sort?.field === field ? `${label}, ${sort.direction === 'asc' ? 'crescente' : 'decrescente'}` : `${label}, ordem original`

  return <article className={`partner-group${expanded ? ' expanded' : ''}`}>
    <header className="partner-group-heading">
      <button className="partner-group-trigger" type="button" aria-expanded={expanded} aria-controls={regionId} onClick={() => setExpanded(value => !value)}>
        <span className="partner-group-identity"><strong>{group.nome_socio_ou_razao_social}</strong><small className="meta">{group.cnpj_cpf_socio || 'Documento não informado'}</small></span>
        <span className="partner-group-summary"><strong>{group.participacoes_count} {group.participacoes_count === 1 ? 'participação' : 'participações'}</strong><span aria-hidden="true" className="accordion-icon">⌄</span></span>
      </button>
      <Link aria-label="Ver detalhes" className="partner-detail-link" to={partnerDetailPath(group, returnTo)} state={{ partner: group }}>Ver detalhes →</Link>
    </header>
    {expanded ? <div className="partner-participations" id={regionId}>
      <table><thead><tr><th><span className="sortable-heading">Empresa <button type="button" className="sort-button" aria-label={`Ordenar por empresa; ${sortLabel('empresa', 'empresa')}`} onClick={() => changeSort('empresa')}>{sort?.field === 'empresa' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</button></span></th><th>CNPJ básico</th><th>Qualificação</th><th><span className="sortable-heading">Entrada <button type="button" className="sort-button" aria-label={`Ordenar por entrada; ${sortLabel('entrada', 'entrada')}`} onClick={() => changeSort('entrada')}>{sort?.field === 'entrada' ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</button></span></th></tr></thead><tbody>{participations.map((participation: PartnerParticipation) => {
        const target = `/receita-federal/cnpj/empresas/${participation.empresa.cnpj_basico}?return_to=${encodeURIComponent(returnTo)}`
        return <tr className="clickable-row" key={participation.id}><td><Link className="row-link" to={target} aria-label={`Ver empresa ${participation.empresa.razao_social}`} /><strong>{participation.empresa.razao_social || 'Razão social não informada'}</strong></td><td>{participation.empresa.cnpj_basico}</td><td>{participation.qualificacao_socio?.descricao || 'Qualificação não informada'}</td><td>{participation.data_entrada_sociedade ? DATE_FORMATTER.format(new Date(`${participation.data_entrada_sociedade}T00:00:00Z`)) : 'Data não informada'}</td></tr>
      })}</tbody></table>
    </div> : null}
  </article>
}

export function PartnersPage() {
  const [search, setSearch] = useSearchParams()
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
  const params = { q: term, q_modo: qMode, page, page_size: PAGE_SIZE }
  const searchable = term.length >= 3
  const query = useQuery({ queryKey: ['cnpj', 'partners', params], enabled: searchable, queryFn: ({ signal }) => cnpjApi.partners(params, signal) })
  const localQError = term && !searchable ? 'Informe ao menos 3 caracteres.' : undefined
  const qError = localQError || (query.error instanceof ApiError ? query.error.fields?.q?.join(' ') : undefined)
  const view = query.data && adaptPage(query.data, page, PAGE_SIZE)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = inputValue.trim()
    const next = new URLSearchParams(search)
    if (value) { next.set('q', value); next.set('q_modo', qMode); next.set('page', '1') } else { next.delete('q'); next.delete('page') }
    setSearch(next)
  }
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }
  const changeMode = (value: TextMatchMode) => { const next = new URLSearchParams(search); next.set('q_modo', value); next.set('page', '1'); setSearch(next) }

  return <section className="search-page">
    <form className={`unified-search${term ? ' compact' : ''}`} onSubmit={submit} role="search">
      <label htmlFor="partner-search">Encontre um sócio</label>
      <div className="search-row"><input id="partner-search" name="q" value={inputValue} onChange={event => setInputValue(event.target.value)} autoFocus aria-invalid={Boolean(qError)} aria-describedby={qError ? 'partner-search-error' : 'partner-search-help'} placeholder="Digite o nome da pessoa ou empresa sócia" /><TextMatchModeSelect value={qMode} onChange={changeMode} /><button>Buscar</button></div>
      {qError ? <p className="field-error" id="partner-search-error">{qError}</p> : <p id="partner-search-help">A busca agrupa participações pelo nome e documento mascarado informados pela fonte. O agrupamento não comprova uma identidade civil única.</p>}
    </form>
    {query.isPending && searchable ? <div className="inline-message" role="status">Buscando…</div> : null}
    {query.isError && !qError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {view?.results.length === 0 ? <Empty /> : null}
    {view && view.results.length > 0 ? <>
      <div className="results-heading"><h1>Sócios encontrados</h1></div>
      <div className="partner-groups">{view.results.map((group, groupIndex) => {
        const returnTo = `${location.pathname}${location.search}`
        return <PartnerGroup group={group} returnTo={returnTo} groupIndex={groupIndex} key={`${group.nome_socio_ou_razao_social}-${group.cnpj_cpf_socio ?? 'sem-documento'}-${groupIndex}`} />
      })}</div>
      <Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} />
    </> : null}
  </section>
}
