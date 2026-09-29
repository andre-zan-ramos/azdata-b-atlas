import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../api/errors'
import { portalTransparenciaApi } from '../api/portal-transparencia/client'
import type { PortalIndicator, PortalPage, PortalRecord, PortalResourcesParams, PortalValue } from '../api/portal-transparencia/types'
import { formatCnpj, formatDate } from '../utils/format'

const MONTH_YEAR = /^(0[1-9]|1[0-2])\/\d{4}$/
const personReservedKeys = new Set(['cnpj', 'razaoSocial', 'nomeFantasia', 'indicadores'])
const booleanLabels: Record<string, string> = {
  favorecidoDespesas: 'Recebeu pagamentos de despesas públicas', possuiContrato: 'Possui contratos com o Governo Federal', possuiContratacao: 'Possui contratação com o Governo Federal', convenios: 'Participa de convênios', favorecidoTransferencias: 'Recebeu transferências de recursos',
  sancionadoCEPIM: 'Consta no cadastro de entidades impedidas (CEPIM)', sancionadoCEIS: 'Consta no cadastro de empresas inidôneas e suspensas (CEIS)', sancionadoCNEP: 'Consta no cadastro de empresas punidas (CNEP)', sancionadoCEAF: 'Consta no cadastro de expulsões da Administração Federal (CEAF)',
  participanteLicitacao: 'Participou de licitações', emitiuNFe: 'Emitiu nota fiscal eletrônica para órgão público', beneficiadoRenunciaFiscal: 'Foi beneficiária de renúncia fiscal', isentoImuneRenunciaFiscal: 'Possui isenção ou imunidade relacionada à renúncia fiscal', habilitadoRenunciaFiscal: 'Está habilitada a receber benefício de renúncia fiscal',
}
const fieldLabels: Record<string, string> = {
  cnpj: 'CNPJ', razaoSocial: 'Razão social', nomeFantasia: 'Nome fantasia', anoMes: 'Mês de referência', numeroProcesso: 'Número do processo', fundamentoLegal: 'Fundamento legal', situacaoContrato: 'Situação do contrato', modalidadeCompra: 'Modalidade da compra', unidadeGestora: 'Unidade gestora', objeto: 'Objeto', numero: 'Número', id: 'Identificador',
}
const publicErrorMessages: Record<string, string> = {
  portal_integration_disabled: 'Esta consulta está indisponível porque a integração está desabilitada.', portal_upstream_timeout: 'A fonte excedeu o tempo de espera. Tente novamente mais tarde.', portal_upstream_rate_limited: 'A fonte limitou temporariamente as consultas. Aguarde antes de tentar novamente.', portal_upstream_rejected: 'A fonte rejeitou a consulta. Tente novamente mais tarde.', portal_upstream_unavailable: 'A fonte está temporariamente indisponível. Tente novamente mais tarde.', portal_upstream_invalid_response: 'A fonte retornou uma resposta inesperada. Tente novamente mais tarde.', portal_invalid_cnpj: 'O CNPJ informado não é válido para esta consulta.', portal_invalid_parameters: 'Revise o período e o número da página informados.',
}

function monthIndex(value: string) { const [month, year] = value.split('/').map(Number); return year * 12 + month }
export function validatePortalPeriod(start: string, end: string) {
  if (!MONTH_YEAR.test(start) || !MONTH_YEAR.test(end)) return 'Informe o início e o fim no formato MM/AAAA.'
  if (monthIndex(start) > monthIndex(end)) return 'O período inicial deve ser anterior ou igual ao período final.'
  return null
}
function monthYear(date: Date) { return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }
function recentPeriod() { const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth() - 2, 1); return { start: monthYear(start), end: monthYear(end) } }
function labelFor(key: string) { return booleanLabels[key] ?? fieldLabels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase()) }
function scalarText(value: PortalValue | undefined) { return value === null || value === undefined || value === '' || typeof value === 'object' ? 'Não informado' : String(value) }
function displayPortalScalar(field: string, value: string | number) {
  const normalizedField = field.toLocaleLowerCase('pt-BR')
  if (normalizedField === 'cnpj' && typeof value === 'string') return formatCnpj(value)
  if ((normalizedField.startsWith('data') || normalizedField.includes('vigencia')) && typeof value === 'string') return formatDate(value)
  if (normalizedField.includes('valor')) {
    const parsed = typeof value === 'number' ? value : Number(value.replace(/\./g, '').replace(',', '.').replace(/\s/g, ''))
    if (Number.isFinite(parsed)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parsed)
  }
  return String(value)
}

function usePortalMutation<TVariables, TData>(request: (variables: TVariables, signal: AbortSignal) => Promise<TData>) {
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  return useMutation({ mutationFn: (variables: TVariables) => { controller.current?.abort(); controller.current = new AbortController(); return request(variables, controller.current.signal) }, retry: false })
}
function PortalError({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : undefined
  return <div className="portal-state portal-error" role="alert"><strong>Não foi possível concluir esta parte da consulta</strong><p>{code && publicErrorMessages[code] ? publicErrorMessages[code] : 'A consulta não pôde ser concluída agora. Tente novamente mais tarde.'}</p></div>
}
function LiteralValue({ field, value, formatContract = false }: { field: string; value: PortalValue; formatContract?: boolean }): ReactNode {
  if (value === null || value === '') return <span className="portal-literal-empty">Não informado</span>
  if (typeof value === 'boolean') return <span className={`portal-boolean ${value ? 'is-yes' : 'is-no'}`}>{value ? 'Sim' : 'Não'}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="portal-literal-empty">Nenhum item</span>
    return <div className="portal-table-wrap"><table className="portal-data-table"><tbody>{value.map((item, index) => <tr key={index}><th scope="row">Item {index + 1}</th><td><LiteralValue field={field} value={item} formatContract={formatContract} /></td></tr>)}</tbody></table></div>
  }
  if (typeof value === 'object') return <RecordTable record={value} formatContract={formatContract} />
  return <span>{formatContract ? displayPortalScalar(field, value) : field.toLowerCase() === 'cnpj' && typeof value === 'string' ? formatCnpj(value) : String(value)}</span>
}
function RecordTable({ record, caption, formatContract = false }: { record: PortalRecord; caption?: string; formatContract?: boolean }) {
  const entries = Object.entries(record)
  if (!entries.length) return <p className="portal-literal-empty">Nenhuma informação</p>
  return <div className="portal-table-wrap"><table className="portal-data-table">{caption ? <caption>{caption}</caption> : null}<tbody>{entries.map(([key, value]) => <tr key={key}><th scope="row">{labelFor(key)}</th><td><LiteralValue field={key} value={value} formatContract={formatContract} /></td></tr>)}</tbody></table></div>
}
function Records({ records, singular }: { records: PortalRecord[]; singular: string }) { return <div className="portal-records">{records.map((record, index) => <RecordTable key={index} record={record} caption={`${singular} ${index + 1}`} />)}</div> }
function nestedRecord(value: PortalValue | undefined) { return value !== null && !Array.isArray(value) && typeof value === 'object' ? value : null }
function ContractRecords({ records }: { records: PortalRecord[] }) {
  return <div className="portal-contracts">{records.map((record, index) => {
    const purchase = nestedRecord(record.compra)
    const number = scalarText(record.numero) !== 'Não informado' ? scalarText(record.numero) : scalarText(record.id)
    const status = scalarText(record.situacaoContrato)
    const object = scalarText(record.objeto) !== 'Não informado' ? scalarText(record.objeto) : scalarText(purchase?.objeto)
    return <details className="portal-contract" key={`${number}-${index}`}><summary><strong>Contrato {number}</strong><span>{status}</span><span title={object}>{object}</span></summary><div className="portal-contract-body"><RecordTable record={record} formatContract /></div></details>
  })}</div>
}
function portalIndicators(value: PortalValue | undefined): PortalIndicator[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (item === null || Array.isArray(item) || typeof item !== 'object') return []
    const { key, label, description, value: indicatorValue, present, source_scope: sourceScope, reference_date: referenceDate } = item
    if (typeof key !== 'string' || typeof label !== 'string' || typeof description !== 'string' || (typeof indicatorValue !== 'boolean' && indicatorValue !== null) || typeof present !== 'boolean' || typeof sourceScope !== 'string' || (typeof referenceDate !== 'string' && referenceDate !== null)) return []
    return [{ key, label, description, value: indicatorValue, present, source_scope: sourceScope, reference_date: referenceDate }]
  })
}
function IndicatorDialog({ indicator, onClose }: { indicator: PortalIndicator; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])
  const titleId = `portal-indicator-${indicator.key}-title`
  return <dialog ref={dialogRef} className="portal-indicator-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose}>
    <header><div><p>Indicador do Portal da Transparência</p><h2 id={titleId}>{indicator.label}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Fechar detalhes do indicador">×</button></header>
    <div className="portal-indicator-dialog-body"><p>{indicator.description}</p><dl><dt>Situação</dt><dd><span className={`portal-boolean ${indicator.value ? 'is-yes' : 'is-no'}`}>{indicator.value === null ? 'Não informado' : indicator.value ? 'Sim' : 'Não'}</span></dd><dt>Disponível na resposta</dt><dd>{indicator.present ? 'Sim' : 'Não'}</dd><dt>Escopo na fonte</dt><dd>{indicator.source_scope}</dd><dt>Data de referência</dt><dd>{indicator.reference_date || 'Não informada'}</dd><dt>Chave do indicador</dt><dd>{indicator.key}</dd></dl></div>
    <footer><button type="button" onClick={onClose}>Fechar</button></footer>
  </dialog>
}
function PersonRecord({ record }: { record: PortalRecord }) {
  const [selectedIndicator, setSelectedIndicator] = useState<PortalIndicator | null>(null)
  const booleans = Object.entries(record).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  const detailsByKey = new Map(portalIndicators(record.indicadores).map(indicator => [indicator.key, indicator]))
  const remaining = Object.fromEntries(Object.entries(record).filter(([key, value]) => !personReservedKeys.has(key) && typeof value !== 'boolean'))
  const cnpj = scalarText(record.cnpj)
  const identity = [
    ['CNPJ', cnpj === 'Não informado' ? cnpj : formatCnpj(cnpj)],
    ['Razão social', scalarText(record.razaoSocial)],
    ['Nome fantasia', scalarText(record.nomeFantasia)],
  ]
  return <>
    <dl className="portal-company-identity">{identity.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="portal-ellipsis" title={value}>{value}</dd></div>)}</dl>
    {booleans.length ? <section className="portal-indicators" aria-labelledby="portal-indicators-title"><h4 id="portal-indicators-title">Indicadores</h4><div className="portal-indicator-grid">{booleans.map(([key, value]) => { const detail = detailsByKey.get(key) ?? { key, label: labelFor(key), description: labelFor(key), value, present: true, source_scope: 'Não informado', reference_date: null }; return <button className="portal-indicator" type="button" key={key} onClick={() => setSelectedIndicator(detail)} aria-label={`Ver detalhes: ${detail.label}`}><span title={detail.label}>{detail.label}</span><span className={`portal-boolean ${value ? 'is-yes' : 'is-no'}`}>{value ? 'Sim' : 'Não'}</span></button> })}</div></section> : null}
    {Object.keys(remaining).length ? <div className="portal-additional-data"><h4>Outras informações</h4><RecordTable record={remaining} /></div> : null}
    {selectedIndicator ? <IndicatorDialog indicator={selectedIndicator} onClose={() => setSelectedIndicator(null)} /> : null}
  </>
}
function PageResult({ page, singular, contracts = false }: { page: PortalPage; singular: string; contracts?: boolean }) {
  if (!page.results.length) return <div className="portal-state portal-empty"><strong>Nenhum registro encontrado</strong></div>
  return <><p className="portal-page-summary">Página {page.page} · {page.returned_count} {page.returned_count === 1 ? 'registro' : 'registros'}{page.total_count === null ? '' : ` de ${page.total_count}`}</p>{contracts ? <ContractRecords records={page.results} /> : <Records records={page.results} singular={singular} />}</>
}
function SectionState({ pending, error, children }: { pending: boolean; error: Error | null; children: ReactNode }) {
  if (pending) return <div className="portal-state" role="status">Consultando esta seção…</div>
  if (error) return <PortalError error={error} />
  return children
}

export function PortalTransparenciaEnrichment({ cnpj }: { cnpj: string }) {
  const defaults = useRef(recentPeriod()).current
  const [started, setStarted] = useState(false)
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [validation, setValidation] = useState<string | null>(null)
  const person = usePortalMutation<void, PortalRecord>((_, signal) => portalTransparenciaApi.person(cnpj, signal))
  const resources = usePortalMutation<PortalResourcesParams, PortalPage>((values, signal) => portalTransparenciaApi.resources(cnpj, values, signal))
  const contracts = usePortalMutation<void, PortalPage>((_, signal) => portalTransparenciaApi.contracts(cnpj, 1, signal))
  const pending = person.isPending || resources.isPending || contracts.isPending
  const requestAll = () => { setStarted(true); setValidation(null); person.mutate(); resources.mutate({}); contracts.mutate() }
  const filterResources = (event: FormEvent) => { event.preventDefault(); const error = validatePortalPeriod(start, end); setValidation(error); if (!error) resources.mutate({ mes_ano_inicio: start, mes_ano_fim: end, pagina: 1 }) }

  return <section className="portal-enrichment" aria-labelledby="portal-enrichment-title">
    <header><h2 id="portal-enrichment-title">Portal da Transparência do Governo Federal</h2><p className="hint">Fonte dos dados: <a href="https://api.portaldatransparencia.gov.br/" target="_blank" rel="noreferrer">Portal da Transparência do Governo Federal</a>.</p></header>
    <button className="portal-primary-action" type="button" disabled={pending} onClick={requestAll}>{pending ? 'Buscando dados…' : started ? 'Atualizar dados do Portal' : 'Buscar dados no Portal da Transparência'}</button>
    {!started ? <p className="portal-idle">Nenhum dado do Portal foi solicitado nesta visita.</p> : <div className="portal-sections">
      <article className="portal-panel"><header><h3>Dados da pessoa jurídica</h3></header><SectionState pending={person.isPending} error={person.error}>{person.data ? <PersonRecord record={person.data} /> : null}</SectionState></article>
      <article className="portal-panel"><header><h3>Recursos recebidos</h3></header><details className="portal-filter"><summary>Filtrar por período</summary><form onSubmit={filterResources} noValidate><div className="portal-controls"><label>Início (MM/AAAA)<input aria-label="Início (MM/AAAA)" value={start} onChange={event => setStart(event.target.value)} inputMode="numeric" /></label><label>Fim (MM/AAAA)<input aria-label="Fim (MM/AAAA)" value={end} onChange={event => setEnd(event.target.value)} inputMode="numeric" /></label></div><button disabled={resources.isPending}>Aplicar período</button></form>{validation ? <div className="portal-state portal-error" role="alert">{validation}</div> : null}</details><SectionState pending={resources.isPending} error={resources.error}>{resources.data ? <PageResult page={resources.data} singular="Recurso" /> : null}</SectionState></article>
      <article className="portal-panel"><header><h3>Contratos</h3></header><SectionState pending={contracts.isPending} error={contracts.error}>{contracts.data ? <PageResult page={contracts.data} singular="Contrato" contracts /> : null}</SectionState></article>
    </div>}
  </section>
}
