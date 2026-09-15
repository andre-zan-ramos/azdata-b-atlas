import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { judicialApi } from '../api/judicial/client'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { JudicialProcessList } from '../components/judicial-process-list'
import { QueryError } from '../components/query-state'
import { PartnerLink } from '../components/partner-link'
import { display, formatCnpj, formatDate, formatMoney } from '../utils/format'
import { internalReturnTo } from '../utils/navigation'

function CompanyJudicialProcesses({ companyName }: { companyName: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['judicial', 'tjmg', 'party-name', companyName, page],
    queryFn: ({ signal }) => judicialApi.byPartyName(companyName, { page, page_size: 10 }, signal),
    retry: false,
  })

  return <section className="company-judicial judicial-search-results" aria-labelledby="company-judicial-title">
    <div className="results-heading"><h2 id="company-judicial-title">Processos encontrados</h2><span>Busca por {companyName}</span></div>
    {query.isPending ? <div className="inline-message" role="status">Consultando processos no TJMG…</div> : null}
    {query.isError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {query.data ? <JudicialProcessList data={query.data} onPage={setPage} referenceNames={[companyName]} /> : null}
  </section>
}

export function CompanyDetailPage() {
  const { cnpjBasico = '' } = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const valid = /^\d{8}$/.test(cnpjBasico)
  const query = useQuery({ queryKey: ['cnpj', 'company', cnpjBasico], queryFn: ({ signal }) => cnpjApi.company(cnpjBasico, signal), enabled: valid })
  if (!valid) return <div className="state error"><h1>Raiz de CNPJ inválida</h1><p>Informe exatamente oito dígitos.</p></div>
  if (query.isPending) return <div className="state" role="status">Carregando empresa…</div>
  if (query.isError) return <QueryError error={query.error} retry={() => query.refetch()} />

  const company = query.data
  const establishments = [...company.estabelecimentos].sort((left, right) =>
    left.cnpj.replace(/\D/g, '').localeCompare(right.cnpj.replace(/\D/g, '')),
  )
  const searchReturn = internalReturnTo(search.get('return_to'))
  const companyReturn = `${location.pathname}${location.search}`
  return <section>
    <Link className="back-link" to={searchReturn}>← Voltar aos resultados</Link>
    <p className="eyebrow">EMPRESA · {company.cnpj_basico}</p>
    <h1>{company.razao_social}</h1>
    <div className="detail-grid">
      <article className="detail-card"><h2>Dados empresariais</h2><dl><dt>Natureza jurídica</dt><dd>{company.natureza_juridica ? `${company.natureza_juridica.codigo} · ${company.natureza_juridica.descricao}` : 'Não informado'}</dd><dt>Capital social</dt><dd>{formatMoney(company.capital_social)}</dd><dt>Porte</dt><dd>{company.porte_empresa?.descricao || 'Não informado'}</dd><dt>Ente federativo responsável</dt><dd>{display(company.ente_federativo_responsavel)}</dd></dl></article>
      <article className="detail-card"><h2>Visão da empresa</h2><dl><dt>Estabelecimentos</dt><dd>{company.estabelecimentos.length}</dd><dt>Sócios</dt><dd>{company.socios.length}</dd></dl></article>
    </div>
    <h2 className="section-title">Estabelecimentos</h2>
    {establishments.length ? <div className="cards">{establishments.map(establishment => <article className="result-card" key={establishment.id}><div><span className="meta">{formatCnpj(establishment.cnpj)} · {establishment.municipio?.descricao || 'Município não informado'}/{establishment.uf}</span><h3>{establishment.nome_fantasia || establishment.razao_social}</h3></div><Link to={`/receita-federal/cnpj/estabelecimentos/${establishment.cnpj}?return_to=${encodeURIComponent(companyReturn)}`}>Ver estabelecimento →</Link></article>)}</div> : <p>Não há estabelecimentos informados.</p>}
    <h2 className="section-title">Quadro societário</h2>
    <div className="cards">{company.socios.map((partner, index) => <article className="result-card" key={`${partner.identificador_socio}-${index}`}><div><h3><PartnerLink partner={partner} returnTo={companyReturn} /></h3><span className="meta">{partner.cnpj_cpf_socio || 'Documento não informado'} · {partner.qualificacao_socio?.descricao || 'Qualificação não informada'} · entrada {formatDate(partner.data_entrada_sociedade)}</span></div></article>)}</div>
    <CompanyJudicialProcesses companyName={company.razao_social} />
  </section>
}
