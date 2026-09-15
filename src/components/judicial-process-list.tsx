import { useState } from 'react'
import type { JudicialProcessPage, JudicialProcessSummary } from '../api/judicial/types'
import { display, formatCnj, formatDate, formatMoney } from '../utils/format'
import { Pagination } from './pagination'

function normalizedName(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLocaleUpperCase('pt-BR') }
function nominalMatch(name: string, references: string[]) { const normalized = normalizedName(name); return Boolean(normalized) && references.some(reference => normalizedName(reference) === normalized) }
const statusLabels = { in_progress: 'Em andamento', suspended: 'Suspenso', closed: 'Baixado', unknown: 'Situação não informada' }

function PartyList({ title, names, references }: { title: string; names: string[]; references: string[] }) {
  if (!names.length) return null
  return <div><h4>{title}</h4><ul>{names.map(name => <li key={name}>{name}{nominalMatch(name, references) ? <small className="nominal-match">Correspondência nominal neste polo</small> : null}</li>)}</ul></div>
}

function ProcessCard({ process, references }: { process: JudicialProcessSummary; references: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const systems = process.observed_source_systems.length > 1 ? process.observed_source_systems.join(' → ') : process.source_system
  return <article className="judicial-process-card">
    <header><div><p className="process-source">{process.court}</p><h3>{formatCnj(process.cnj_number)}</h3><p>{display(process.class_name)}</p></div><span className={`process-status ${process.status_group}`}>{statusLabels[process.status_group]}</span></header>
    {process.subjects.length ? <p className="process-subject">{process.subjects[0]}</p> : null}
    <dl className="process-summary"><dt>Comarca</dt><dd>{display(process.district)}</dd><dt>Órgão julgador</dt><dd>{display(process.court_unit)}</dd><dt>Distribuição</dt><dd>{formatDate(process.filing_date)}</dd><dt>Valor da causa</dt><dd>{formatMoney(process.claim_value)}</dd></dl>
    {process.last_event ? <div className="last-event"><strong>Última movimentação</strong><span>{formatDate(process.last_event.date)}</span><p>{display(process.last_event.description || process.last_event.event)}</p></div> : null}
    <button className="process-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</button>
    {expanded ? <div className="process-details">{process.confidential ? <p className="confidential-notice">Processo em segredo de justiça. Participantes não são exibidos.</p> : <div className="party-grid"><PartyList title="Polo ativo" names={process.plaintiff_names} references={references} /><PartyList title="Polo passivo" names={process.defendant_names} references={references} /><PartyList title="Outros participantes" names={process.other_party_names} references={references} /></div>}<dl className="process-metadata"><dt>Sistema de origem</dt><dd>{display(systems)}</dd><dt>Tipo de justiça</dt><dd>{display(process.justice_type)}</dd><dt>Identificador externo</dt><dd>{display(process.external_id)}</dd></dl></div> : null}
  </article>
}

export function JudicialProcessList({ data, onPage, referenceNames = [] }: { data: JudicialProcessPage; onPage: (page: number) => void; referenceNames?: string[] }) {
  if (!data.results.length) return <div className="state"><h3>Nenhum processo encontrado</h3><p>A consulta ao TJMG não retornou processos para este critério.</p></div>
  return <><div className="judicial-results-heading"><div><strong>{data.source_total} {data.source_total === 1 ? 'processo informado' : 'processos informados'} pelo TJMG</strong><span>{data.returned_count} {data.returned_count === 1 ? 'processo único nesta página' : 'processos únicos nesta página'}</span></div></div>{data.duplicates_removed > 0 ? <p className="dedupe-notice">{data.duplicates_removed} {data.duplicates_removed === 1 ? 'registro duplicado foi consolidado' : 'registros duplicados foram consolidados'} pelo número CNJ nesta página.</p> : null}<div className="judicial-processes">{data.results.map(process => <ProcessCard key={process.cnj_number} process={process} references={referenceNames} />)}</div><Pagination page={data.page} pageSize={data.page_size} count={data.source_total} previous={data.has_previous} next={data.has_next} onPage={onPage} /></>
}
