import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/errors'
import { cnoApi, cnoQueryOptions } from '../api/receita-federal/cno/client'
import { adaptPage, readPagination } from '../api/receita-federal/cno/navigation'
import type { Area, Cnae, FastPage, Page, WorkDetail, WorkLink, WorkSummary } from '../api/receita-federal/cno/types'
import { LinkResults, OfficialFields, WorkResults, officialText } from '../components/cno-results'
import { Pagination } from '../components/pagination'
import { Empty, QueryError } from '../components/query-state'
import { internalReturnTo } from '../utils/navigation'

type Collection = 'areas' | 'cnaes' | 'vinculos' | 'obras_vinculadas'
type Child = Area | Cnae | WorkLink | WorkSummary
const collections: [Collection, string][] = [['areas', 'Áreas'], ['cnaes', 'CNAEs'], ['vinculos', 'Vínculos'], ['obras_vinculadas', 'Obras vinculadas']]
const sections: [string, (keyof WorkSummary | 'codigo_pais' | 'pais' | 'data_inicio_obra' | 'data_inicio_responsabilidade' | 'data_registro' | 'cno_vinculado' | 'caixa_postal' | 'unidade_medida' | 'area_total' | 'codigo_localizacao')[]][] = [
  ['Identificação', ['id', 'cno', 'nome', 'nome_empresarial', 'cno_vinculado']],
  ['Responsável', ['ni_responsavel', 'qualificacao_responsavel', 'data_inicio_responsabilidade']],
  ['Endereço e localização', ['codigo_pais', 'pais', 'codigo_municipio', 'municipio', 'uf', 'tipo_logradouro', 'logradouro', 'numero', 'bairro', 'complemento', 'cep', 'caixa_postal', 'codigo_localizacao']],
  ['Situação e datas', ['situacao', 'data_situacao', 'data_inicio_obra', 'data_registro']],
  ['Área total', ['area_total', 'unidade_medida']],
]

function CollectionPanel({ name, title, work, version }: { name: Collection; title: string; work: WorkDetail; version: number }) {
  const [search, setSearch] = useSearchParams()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const prefix = `${name}_`
  const { page, pageSize, errors } = readPagination(search, prefix)
  const invalid = Object.keys(errors).length > 0
  const embedded: FastPage<Child> = work[name]
  const cno = name === 'obras_vinculadas' ? work.cno_vinculado : work.cno
  const canRequest = work.cno !== null && work.cno !== '' && cno !== null && cno !== ''
  const initial = page === embedded.page && pageSize === embedded.page_size
  const params = { cno: cno ?? undefined, page, page_size: pageSize }
  const query = useQuery<Page<Child>>({
    ...cnoQueryOptions, queryKey: ['cno', 'collection', work.id, work.release, version, name, params],
    enabled: open && canRequest && !initial && !invalid,
    queryFn: ({ signal }) => {
      if (name === 'obras_vinculadas') return cnoApi.obras(params, signal)
      if (name === 'areas') return cnoApi.areas(params, signal)
      if (name === 'cnaes') return cnoApi.cnaes(params, signal)
      return cnoApi.vinculos(params, signal)
    },
  })
  const data = initial || !canRequest ? embedded : query.data
  const view = data && !invalid && !query.isError ? adaptPage(data, page, pageSize) : undefined
  const change = (key: string, value: number) => { const next = new URLSearchParams(search); next.set(prefix + key, String(value)); if (key === 'page_size') next.set(prefix + 'page', '1'); setSearch(next) }
  const returnTo = location.pathname + location.search
  return <details className="detail-card cno-collection" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{title}</summary>
    {open && <><div className="cno-page-controls"><label>Resultados por página — {title}<select value={pageSize} disabled={!canRequest} aria-invalid={Boolean(errors[prefix + 'page_size'])} onChange={event => change('page_size', Number(event.target.value))}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label></div>
      {invalid && <QueryError error={new ApiError('Revise os parâmetros da coleção na URL.', 400, undefined, errors)} retry={() => { const next = new URLSearchParams(search); next.delete(prefix + 'page'); next.delete(prefix + 'page_size'); setSearch(next) }} />}
      {query.isFetching && <p role="status">Carregando {title.toLowerCase()}…</p>}
      {query.error && <QueryError error={query.error} retry={() => query.refetch()} />}
      {view && <>{view.results.length === 0 ? <Empty /> : name === 'obras_vinculadas' ? <WorkResults items={view.results as WorkSummary[]} returnTo={returnTo} /> : name === 'vinculos' ? <LinkResults items={view.results as WorkLink[]} returnTo={returnTo} /> : <div className="cards">{view.results.map(item => <article className="detail-card" key={item.id}><OfficialFields entries={Object.entries(item)} /></article>)}</div>}
        <Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={canRequest && view.hasPrevious && view.page > 1} next={canRequest && view.hasNext && view.page < 999999999} onPage={value => change('page', value)} /></>}
    </>}
  </details>
}

export function CnoDetailPage() {
  const { id = '' } = useParams()
  const [search] = useSearchParams()
  const query = useQuery({ ...cnoQueryOptions, queryKey: ['cno', 'obra', id], queryFn: ({ signal }) => cnoApi.obra(id, signal) })
  const work = query.data
  return <section className="cno-page">
    <Link className="back-link" to={internalReturnTo(search.get('return_to'), '/receita-federal/cno')}>Voltar à consulta anterior</Link>
    {query.isPending && <p role="status">Carregando obra…</p>}
    {query.error && (query.error instanceof ApiError && query.error.status === 404 ? <div className="state" role="alert"><h1>Ocorrência não disponível</h1><p>Retorne à pesquisa para consultar as ocorrências disponíveis.</p></div> : <QueryError error={query.error} retry={() => query.refetch()} />)}
    {work && !query.isError && <><h1>CNO {officialText(work.cno)}</h1><p className="meta">ID técnico: {work.id} · Release: {work.release}</p>
      <div className="detail-grid">{sections.map(([title, fields]) => <section className="detail-card" key={title}><h2>{title}</h2><OfficialFields entries={fields.map(key => [key, work[key]])} /></section>)}</div>
      <details className="cno-help"><summary>Sobre as associações</summary><p>{work.associacao.descricao}</p><p>A associação textual não comprova vínculo empresarial. Cada nova consulta utiliza a release ativa, sem garantir um mesmo snapshot entre páginas.</p></details>
      <div className="cno-collections">{collections.map(([name, title]) => <CollectionPanel key={`${id}:${query.dataUpdatedAt}:${name}`} name={name} title={title} work={work} version={query.dataUpdatedAt} />)}</div>
    </>}
  </section>
}
