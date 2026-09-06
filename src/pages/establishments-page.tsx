import { useQuery } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage } from '../api/receita-federal/cnpj/pagination'
import type { EstablishmentFilters, PageSize } from '../api/receita-federal/cnpj/types'
import { Empty, QueryError } from '../components/query-state'
import { Pagination } from '../components/pagination'
import { CnaeSelect, MunicipalitySelect } from '../components/domain-selects'
import { digits, formatCnpj } from '../utils/format'
const UFS = ['', 'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
export function EstablishmentsPage() {
  const [search, setSearch] = useSearchParams(); const submitted = search.has('buscar'); const page = Number(search.get('page') || 1); const pageSize = Number(search.get('page_size') || 10) as PageSize
  const [selectedUf, setSelectedUf] = useState(search.get('uf') || '')
  const params: EstablishmentFilters = { nome: search.get('nome') || undefined, nome_tipo: (search.get('nome_tipo') as EstablishmentFilters['nome_tipo']) || 'razao_social', nome_modo: search.get('nome_modo') || 'contendo', cnpj: search.get('cnpj') || undefined, cnpj_basico: search.get('cnpj_basico') || undefined, uf: search.get('uf') || undefined, municipio: search.get('municipio') || undefined, cnae: search.get('cnae') || undefined, situacao_cadastral: search.get('situacao_cadastral') || undefined, matriz_filial: search.get('matriz_filial') || undefined, porte: search.get('porte') || undefined, natureza_juridica: search.get('natureza_juridica') || undefined, page, page_size: pageSize }
  const query = useQuery({ queryKey: ['cnpj','establishments', params], queryFn: ({ signal }) => cnpjApi.establishments(params, signal), enabled: submitted })
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const next = new URLSearchParams(); data.forEach((value, key) => { const cleaned = ['cnpj','cnpj_basico','cnae','municipio'].includes(key) ? digits(String(value)) : String(value).trim(); if (cleaned) next.set(key, cleaned) }); next.set('buscar','1'); next.set('page','1'); setSearch(next) }
  const changePage = (value: number) => { const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }
  const view = query.data && adaptPage(query.data, page, pageSize)
  return <section><p className="eyebrow">RECEITA FEDERAL · CNPJ</p><h1>Estabelecimentos</h1><p className="page-intro">Consulte matrizes e filiais por identidade, território e atividade principal.</p>
    <form className="filter-card" onSubmit={submit}><div className="form-grid">
      <label className="wide">Nome<input name="nome" defaultValue={search.get('nome') || ''} placeholder="Razão social ou nome fantasia" /></label>
      <label>Campo<select name="nome_tipo" defaultValue={params.nome_tipo}><option value="razao_social">Razão social</option><option value="nome_fantasia">Nome fantasia</option></select></label>
      <label>Comparação<select name="nome_modo" defaultValue={params.nome_modo}><option value="contendo">Contendo</option><option value="inicio">Iniciando</option><option value="fim">Terminando</option><option value="exato">Exato</option></select></label>
      <label>CNPJ<input name="cnpj" inputMode="numeric" defaultValue={search.get('cnpj') || ''} /></label><label>Raiz do CNPJ<input name="cnpj_basico" inputMode="numeric" maxLength={8} defaultValue={search.get('cnpj_basico') || ''} /></label>
      <label>UF<select name="uf" value={selectedUf} onChange={(e) => setSelectedUf(e.target.value)}>{UFS.map(uf => <option key={uf} value={uf}>{uf || 'Todas'}</option>)}</select></label><MunicipalitySelect uf={selectedUf} defaultValue={search.get('municipio') || ''}/><CnaeSelect defaultValue={search.get('cnae') || ''}/>
      <label>Situação cadastral<input name="situacao_cadastral" inputMode="numeric" defaultValue={search.get('situacao_cadastral') || ''} /></label><label>Matriz/filial<input name="matriz_filial" inputMode="numeric" defaultValue={search.get('matriz_filial') || ''} /></label><label>Porte (código)<input name="porte" defaultValue={search.get('porte') || ''} /></label><label>Natureza jurídica (código)<input name="natureza_juridica" defaultValue={search.get('natureza_juridica') || ''} /></label><label>Resultados<select name="page_size" defaultValue={pageSize}><option>10</option><option>25</option><option>50</option></select></label>
    </div><div className="form-actions"><button type="submit">Buscar estabelecimentos</button><Link to="/receita-federal/cnpj/estabelecimentos">Limpar</Link></div></form>
    {!submitted && <div className="state"><h2>Comece pelos filtros</h2><p>A consulta só será enviada quando você selecionar Buscar.</p></div>}{query.isPending && submitted && <div className="state" role="status">Consultando estabelecimentos…</div>}{query.isError && <QueryError error={query.error} retry={() => query.refetch()} />}{view && view.results.length === 0 && <Empty />}{view && view.results.length > 0 && <><div className="table-wrap"><table><thead><tr><th>CNPJ</th><th>Razão social</th><th>Nome fantasia</th><th>Município/UF</th><th>CNAE principal</th><th>Situação</th></tr></thead><tbody>{view.results.map(item => <tr key={item.id}><td><Link to={`/receita-federal/cnpj/estabelecimentos/${item.cnpj}`}>{formatCnpj(item.cnpj)}</Link></td><td>{item.razao_social}</td><td>{item.nome_fantasia || '—'}</td><td>{item.municipio?.descricao || '—'} / {item.uf}</td><td>{item.cnae_principal ? `${item.cnae_principal.codigo} · ${item.cnae_principal.descricao}` : '—'}</td><td>{item.situacao_cadastral}</td></tr>)}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></>}</section>
}
