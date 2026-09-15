import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { judicialApi } from '../api/judicial/client'
import { JudicialProcessList } from '../components/judicial-process-list'
import { QueryError } from '../components/query-state'
import { PartnerLink } from '../components/partner-link'
import { codedChoice, display, formatCnpj, formatDate, formatMoney } from '../utils/format'
import { internalReturnTo } from '../utils/navigation'

const Field = ({ label, value }: { label: string; value: unknown }) => <><dt>{label}</dt><dd>{display(value)}</dd></>

function establishmentType(value: number | string) {
  const normalized = String(value).trim().toLowerCase()
  if (normalized === '1' || normalized === 'matriz') return 'Matriz'
  if (normalized === '2' || normalized === 'filial') return 'Filial'
  return display(value)
}

function EstablishmentJudicialProcesses({ cnpj }: { cnpj: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['judicial', 'tjmg', 'document', cnpj, page],
    queryFn: ({ signal }) => judicialApi.byDocument(cnpj, { page, page_size: 10 }, signal),
    retry: false,
  })
  return <section className="establishment-judicial" aria-labelledby="judicial-processes-title">
    <header><p className="eyebrow">TJMG</p><h2 id="judicial-processes-title">Processos judiciais</h2><p className="hint">Consulta pública feita sob demanda para o CNPJ deste estabelecimento.</p></header>
    {query.isPending ? <div className="state" role="status">Consultando processos no TJMG…</div> : null}
    {query.isError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {query.data ? <JudicialProcessList data={query.data} onPage={setPage} /> : null}
  </section>
}

export function EstablishmentDetailPage() {
  const { cnpj = '' } = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const valid = /^\d{14}$/.test(cnpj)
  const query = useQuery({ queryKey: ['cnpj', 'establishment', cnpj], queryFn: ({ signal }) => cnpjApi.establishment(cnpj, signal), enabled: valid })
  if (!valid) return <div className="state error"><h1>CNPJ inválido</h1><p>Informe exatamente 14 dígitos, sem máscara.</p></div>
  if (query.isPending) return <div className="state" role="status">Carregando estabelecimento…</div>
  if (query.isError) return <QueryError error={query.error} retry={() => query.refetch()} />

  const establishment = query.data
  const companyPath = `/receita-federal/cnpj/empresas/${establishment.empresa.cnpj_basico}`
  const companyReturn = internalReturnTo(search.get('return_to'), companyPath)
  const establishmentReturn = `${location.pathname}${location.search}`
  const address = [establishment.tipo_logradouro, establishment.logradouro, establishment.numero, establishment.complemento, establishment.bairro].filter(Boolean).join(', ')
  const type = establishmentType(establishment.identificador_matriz_filial)
  return <section>
    <header className="establishment-heading">
      <Link className="back-link" to={companyReturn}>← {establishment.empresa.razao_social}</Link>
      <h1>{establishment.nome_fantasia || establishment.empresa.razao_social}</h1>
      <p className="establishment-meta">Estabelecimento · {type} · CNPJ {formatCnpj(establishment.cnpj)}</p>
    </header>
    <div className="detail-grid">
      <article className="detail-card"><h2>Identificação</h2><dl><Field label="CNPJ" value={formatCnpj(establishment.cnpj)} /><Field label="Matriz/filial" value={type} /><Field label="Início da atividade" value={formatDate(establishment.data_inicio_atividade)} /></dl></article>
      <article className="detail-card"><h2>Situação cadastral</h2><dl><Field label="Situação" value={establishment.situacao_cadastral} /><Field label="Data" value={formatDate(establishment.data_situacao_cadastral)} /><Field label="Motivo" value={establishment.motivo_situacao_cadastral?.descricao} /><Field label="Situação especial" value={establishment.situacao_especial} /></dl></article>
      <article className="detail-card"><h2>Dados empresariais</h2><dl><Field label="Razão social" value={establishment.empresa.razao_social} /><Field label="Natureza jurídica" value={establishment.empresa.natureza_juridica?.descricao} /><Field label="Capital social" value={formatMoney(establishment.empresa.capital_social)} /><Field label="Porte" value={establishment.empresa.porte_empresa?.descricao} /></dl></article>
      <article className="detail-card"><h2>Endereço</h2><dl><Field label="Logradouro" value={address} /><Field label="CEP" value={establishment.cep} /><Field label="Município/UF" value={establishment.municipio ? `${establishment.municipio.descricao}/${establishment.uf}` : establishment.uf} /><Field label="País" value={establishment.pais?.descricao} /></dl></article>
      <article className="detail-card"><h2>Contatos</h2><dl><Field label="Telefone 1" value={[establishment.ddd1, establishment.telefone1].filter(Boolean).join(' ')} /><Field label="Telefone 2" value={[establishment.ddd2, establishment.telefone2].filter(Boolean).join(' ')} /><Field label="E-mail" value={establishment.correio_eletronico} /></dl></article>
      <article className="detail-card"><h2>Simples / MEI</h2><dl><Field label="Optante pelo Simples" value={codedChoice(establishment.empresa.simples?.opcao_simples)} /><Field label="Opção pelo Simples" value={formatDate(establishment.empresa.simples?.data_opcao_simples)} /><Field label="Optante pelo MEI" value={codedChoice(establishment.empresa.simples?.opcao_mei)} /></dl></article>
    </div>
    <h2 className="section-title">Atividades</h2>
    <div className="detail-card"><p><strong>Principal:</strong> {establishment.cnae_fiscal_principal ? `${establishment.cnae_fiscal_principal.codigo} · ${establishment.cnae_fiscal_principal.descricao}` : 'Não informado'}</p>{establishment.cnaes_secundarios.length > 0 && <ul>{establishment.cnaes_secundarios.map(cnae => <li key={`${cnae.codigo}-${cnae.ordem}`}>{cnae.codigo} · {cnae.descricao}</li>)}</ul>}</div>
    <h2 className="section-title">Sócios da empresa</h2>
    <p className="hint">Este quadro pertence à empresa {establishment.empresa.razao_social}, não exclusivamente a este estabelecimento.</p>
    {establishment.socios.length ? <div className="cards">{establishment.socios.map((partner, index) => <article className="result-card" key={`${partner.identificador_socio}-${index}`}><div><h3><PartnerLink partner={partner} returnTo={establishmentReturn} /></h3><span className="meta">{partner.cnpj_cpf_socio || 'Documento não informado'} · {partner.qualificacao_socio?.descricao || 'Qualificação não informada'}</span></div></article>)}</div> : <p>Não há sócios informados.</p>}
    <EstablishmentJudicialProcesses cnpj={establishment.cnpj} />
  </section>
}
