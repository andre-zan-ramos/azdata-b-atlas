import { useEffect, useRef, useState } from 'react'
import type { JudicialProcessPage, JudicialProcessSummary } from '../api/judicial/types'
import { display, formatCnj, formatDate, formatMoney } from '../utils/format'
import { Pagination } from './pagination'

const statusLabels = { in_progress: 'Em andamento', suspended: 'Suspenso', closed: 'Baixado', unknown: 'Situação não informada' }
const relations = ['plaintiff', 'defendant', 'other', 'unknown'] as const
type Relation = typeof relations[number]
const relationLabels: Record<Relation, string> = { plaintiff: 'Polo ativo', defendant: 'Polo passivo', other: 'Outros participantes', unknown: 'Relação não identificada' }

function normalizedName(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLocaleUpperCase('pt-BR') }
function nominalMatch(name: string, references: string[]) {
  const normalized = normalizedName(name)
  return Boolean(normalized) && references.some(reference => {
    const candidate = normalizedName(reference)
    return Boolean(candidate) && (normalized === candidate || normalized.includes(candidate) || candidate.includes(normalized))
  })
}
function processRelations(process: JudicialProcessSummary, references: string[]): Relation[] {
  if (process.confidential) return ['unknown']
  const matched: Relation[] = []
  if (process.plaintiff_names.some(name => nominalMatch(name, references))) matched.push('plaintiff')
  if (process.defendant_names.some(name => nominalMatch(name, references))) matched.push('defendant')
  if (process.other_party_names.some(name => nominalMatch(name, references))) matched.push('other')
  return matched.length ? matched : ['unknown']
}

export function tjmgProcessUrl(process: Pick<JudicialProcessSummary, 'cnj_number' | 'external_id'>) {
  if (!process.external_id) return null
  const query = JSON.stringify({ numeroProcesso: [formatCnj(process.cnj_number)], page: 0, exclude: {} })
  const detail = JSON.stringify({ processoId: process.external_id })
  return `https://consulta.tjmg.jus.br/pesquisa?q=${encodeURIComponent(query)}&d=${encodeURIComponent(detail)}`
}

export function tjmgDocumentsUrl(process: Pick<JudicialProcessSummary, 'source_system' | 'external_id'>) {
  return process.source_system === 'PJE' && process.external_id
    ? `https://visualizador-documento.tjmg.jus.br/processo/PJE/${encodeURIComponent(process.external_id)}`
    : null
}

function ExternalActions({ process }: { process: JudicialProcessSummary }) {
  const processUrl = tjmgProcessUrl(process)
  const documentsUrl = tjmgDocumentsUrl(process)
  return <div className="process-external-actions">
    {processUrl ? <a href={processUrl} target="_blank" rel="noreferrer">Ver no TJMG <span aria-hidden="true">↗</span></a> : null}
    {documentsUrl ? <a href={documentsUrl} target="_blank" rel="noreferrer">Documentos no TJMG <span aria-hidden="true">↗</span></a> : null}
  </div>
}

function PartyList({ title, names }: { title: string; names: string[] }) {
  return <section><h4>{title}</h4>{names.length ? <ul>{names.map(name => <li key={name}>{name}</li>)}</ul> : <p>Não informado</p>}</section>
}

function ProcessDialog({ process, onClose }: { process: JudicialProcessSummary; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])
  const systems = process.observed_source_systems.length > 1 ? process.observed_source_systems.join(' → ') : process.source_system
  const titleId = `process-${process.cnj_number}-title`
  return <dialog ref={dialogRef} className="process-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose}>
    <div className="process-dialog-heading"><div><p className="process-source">{process.court}</p><h2 id={titleId}>{formatCnj(process.cnj_number)}</h2><p>{display(process.class_name)}</p></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Fechar detalhes do processo">×</button></div>
    <div className="process-dialog-body">
      {process.subjects.length ? <p className="process-subject">{process.subjects.join(' · ')}</p> : null}
      <dl className="process-summary"><dt>Comarca</dt><dd>{display(process.district)}</dd><dt>Órgão julgador</dt><dd>{display(process.court_unit)}</dd><dt>Distribuição</dt><dd>{formatDate(process.filing_date)}</dd><dt>Valor da causa</dt><dd>{formatMoney(process.claim_value)}</dd></dl>
      {process.last_event ? <div className="last-event"><strong>Última movimentação</strong><span>{formatDate(process.last_event.date)}</span><p>{display(process.last_event.description || process.last_event.event)}</p></div> : null}
      {process.confidential ? <p className="confidential-notice">Processo em segredo de justiça. Participantes não são exibidos.</p> : <div className="party-grid"><PartyList title="Polo ativo" names={process.plaintiff_names} /><PartyList title="Polo passivo" names={process.defendant_names} /><PartyList title="Outros participantes" names={process.other_party_names} /></div>}
      <dl className="process-metadata"><dt>Sistema de origem</dt><dd>{display(systems)}</dd><dt>Tipo de justiça</dt><dd>{display(process.justice_type)}</dd><dt>Identificador externo</dt><dd>{display(process.external_id)}</dd></dl>
    </div>
    <footer><ExternalActions process={process} /><button type="button" onClick={onClose}>Fechar</button></footer>
  </dialog>
}

function ProcessTable({ processes, relation }: { processes: JudicialProcessSummary[]; relation: Relation }) {
  const [selected, setSelected] = useState<JudicialProcessSummary | null>(null)
  return <section className="process-group" aria-labelledby={`process-group-${relation}`}>
    <header><h2 id={`process-group-${relation}`}>{relationLabels[relation]}</h2><span>{processes.length} {processes.length === 1 ? 'processo' : 'processos'} nesta página</span></header>
    <div className="table-wrap process-table"><table><thead><tr><th>Processo</th><th>Classe e assunto</th><th>Comarca</th><th>Distribuição</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{processes.map(process => <tr className="clickable-row" key={process.cnj_number}>
      <td><button className="row-dialog-trigger" type="button" onClick={() => setSelected(process)} aria-label={`Ver detalhes do processo ${formatCnj(process.cnj_number)}`} /><strong>{formatCnj(process.cnj_number)}</strong><small>{process.court}</small></td>
      <td><strong>{display(process.class_name)}</strong><small>{process.subjects[0] || 'Assunto não informado'}</small></td>
      <td>{display(process.district)}</td><td>{formatDate(process.filing_date)}</td><td><span className={`process-status ${process.status_group}`}>{statusLabels[process.status_group]}</span></td><td><ExternalActions process={process} /></td>
    </tr>)}</tbody></table></div>
    {selected ? <ProcessDialog process={selected} onClose={() => setSelected(null)} /> : null}
  </section>
}

export function JudicialProcessList({ data, onPage, referenceNames = [] }: { data: JudicialProcessPage; onPage: (page: number) => void; referenceNames?: string[] }) {
  if (!data.results.length) return <div className="state"><h3>Nenhum processo encontrado</h3><p>A consulta ao TJMG não retornou processos para este critério.</p></div>
  const grouped: Record<Relation, JudicialProcessSummary[]> = { plaintiff: [], defendant: [], other: [], unknown: [] }
  data.results.forEach(process => processRelations(process, referenceNames).forEach(relation => grouped[relation].push(process)))
  return <><div className="judicial-results-heading"><div><strong>{data.source_total} {data.source_total === 1 ? 'processo informado' : 'processos informados'} pelo TJMG</strong><span>{data.returned_count} {data.returned_count === 1 ? 'processo único nesta página' : 'processos únicos nesta página'} · agrupamento pela relação nominal nesta página</span></div></div>{data.duplicates_removed > 0 ? <p className="dedupe-notice">{data.duplicates_removed} {data.duplicates_removed === 1 ? 'registro duplicado foi consolidado' : 'registros duplicados foram consolidados'} pelo número CNJ nesta página.</p> : null}<div className="judicial-process-groups">{relations.flatMap(relation => grouped[relation].length ? [<ProcessTable key={relation} relation={relation} processes={grouped[relation]} />] : [])}</div><Pagination page={data.page} pageSize={data.page_size} count={data.source_total} previous={data.has_previous} next={data.has_next} onPage={onPage} /></>
}
