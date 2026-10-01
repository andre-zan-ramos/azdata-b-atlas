import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { judicialApi } from '../api/judicial/client'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { GroupedPartnerSearchItem } from '../api/receita-federal/cnpj/types'
import { JudicialProcessList } from '../components/judicial-process-list'
import { QueryError } from '../components/query-state'
import { formatDate } from '../utils/format'
import { internalReturnTo } from '../utils/navigation'

type PartnerLocationState = { partner?: GroupedPartnerSearchItem }

function samePartner(partner: GroupedPartnerSearchItem, name: string, document: string | null) {
  return partner.nome_socio_ou_razao_social === name && partner.cnpj_cpf_socio === document
}

async function loadPartner(name: string, document: string | null, signal: AbortSignal) {
  const page = await cnpjApi.partners({ q: name, page: 1, page_size: 50 }, signal)
  const partner = page.results.find(item => samePartner(item, name, document))
  if (!partner) throw new Error('O sócio selecionado não foi encontrado nesta consulta.')
  return partner
}

function PartnerJudicialProcesses({ partnerName }: { partnerName: string }) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['judicial', 'tjmg', 'party-name', partnerName, page],
    queryFn: ({ signal }) => judicialApi.byPartyName(partnerName, { page, page_size: 10 }, signal),
    retry: false,
  })

  return <section className="partner-judicial judicial-search-results" aria-labelledby="partner-judicial-title">
    <div className="results-heading"><h2 id="partner-judicial-title">Processos encontrados</h2><span>Busca nominal no TJMG por {partnerName}</span></div>
    <p className="hint">Resultados por nome podem incluir homônimos. O documento mascarado da Receita Federal não permite confirmar a identidade das partes.</p>
    {query.isPending ? <div className="inline-message" role="status">Consultando processos no TJMG…</div> : null}
    {query.isError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {query.data ? <JudicialProcessList data={query.data} onPage={setPage} referenceNames={[partnerName]} /> : null}
  </section>
}

export function PartnerDetailPage() {
  const [search] = useSearchParams()
  const location = useLocation()
  const name = search.get('nome')?.trim() ?? ''
  const document = search.get('documento')
  const rawParticipationId = search.get('participacao')
  const participationId = rawParticipationId && /^[1-9]\d*$/.test(rawParticipationId) ? Number(rawParticipationId) : null
  const release = search.get('release')
  const technicalDetail = rawParticipationId !== null
  const statePartner = (location.state as PartnerLocationState | null)?.partner
  const initialPartner = statePartner && samePartner(statePartner, name, document) ? statePartner : undefined
  const valid = technicalDetail ? participationId !== null && Number.isSafeInteger(participationId) && Boolean(release) : name.length >= 3
  const query = useQuery({
    queryKey: ['cnpj', 'partner-detail', name, document, participationId, release],
    queryFn: async ({ signal }) => {
      if (!technicalDetail) return loadPartner(name, document, signal)
      const data = await cnpjApi.partnerParticipation(participationId!, release!, signal)
      const partner = data.participation
      return { nome_socio_ou_razao_social: partner.nome_socio_ou_razao_social, cnpj_cpf_socio: partner.cnpj_cpf_socio, participacoes_count: 1, participacoes: [partner] }
    },
    enabled: valid,
    initialData: technicalDetail ? undefined : initialPartner,
    retry: technicalDetail ? false : undefined,
  })
  const returnTo = internalReturnTo(search.get('return_to'), '/receita-federal/cnpj/socios')

  if (!valid) return <div className="state error"><h1>Sócio inválido</h1><p>{technicalDetail ? 'O detalhe precisa do ID da participação e de sua publicação.' : 'O detalhe precisa de um nome com ao menos três caracteres.'}</p></div>
  if (query.isPending) return <div className="state" role="status">Carregando sócio…</div>
  if (query.isError) return <QueryError error={query.error} retry={() => query.refetch()} />

  const partner = query.data
  return <section>
    <Link className="back-link" to={returnTo}>← Voltar aos resultados</Link>
    <p className="eyebrow">SÓCIO · RECEITA FEDERAL</p>
    <h1>{partner.nome_socio_ou_razao_social}</h1>
    <p className="partner-detail-document">{partner.cnpj_cpf_socio || 'Documento não informado'}</p>
    {technicalDetail ? <p className="hint">Participação {participationId} · release {release}. Este contexto contém a participação selecionada, sem afirmar identidade civil nem representar o grupo inteiro.</p> : null}
    <div className="detail-grid partner-detail-summary">
      <article className="detail-card"><h2>Identificação na fonte</h2><dl><dt>Nome</dt><dd>{partner.nome_socio_ou_razao_social}</dd><dt>Documento</dt><dd>{partner.cnpj_cpf_socio || 'Não informado'}</dd></dl></article>
      <article className="detail-card"><h2>Visão societária</h2><dl><dt>Participações</dt><dd>{partner.participacoes_count}</dd><dt>{technicalDetail ? 'Contexto' : 'Critério do grupo'}</dt><dd>{technicalDetail ? 'Participação publicada selecionada por ID e release' : 'Nome e documento informado pela fonte'}</dd></dl></article>
    </div>
    <h2 className="section-title">Empresas em que participa</h2>
    <div className="cards">{partner.participacoes.map(participation => <article className="result-card" key={participation.id}><div><span className="meta">CNPJ básico {participation.empresa.cnpj_basico}</span><h3>{participation.empresa.razao_social}</h3><span className="meta">{participation.qualificacao_socio?.descricao || 'Qualificação não informada'} · entrada {formatDate(participation.data_entrada_sociedade)}</span></div><Link to={`/receita-federal/cnpj/empresas/${participation.empresa.cnpj_basico}?return_to=${encodeURIComponent(`${location.pathname}${location.search}`)}`}>Ver empresa →</Link></article>)}</div>
    <PartnerJudicialProcesses partnerName={partner.nome_socio_ou_razao_social} />
  </section>
}
