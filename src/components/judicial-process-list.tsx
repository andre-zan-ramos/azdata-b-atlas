import { useState } from 'react'
import type { JudicialProcessPage, JudicialProcessSummary } from '../api/judicial/types'
import { display, formatCnj, formatDate, formatMoney } from '../utils/format'
import { Pagination } from './pagination'

const statusLabels = { in_progress: 'Em andamento', suspended: 'Suspenso', closed: 'Baixado', unknown: 'Situação não informada' }

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

function ProcessCard({ process }: { process: JudicialProcessSummary }) {
  const [expanded, setExpanded] = useState(false)
  const systems = process.observed_source_systems.length > 1 ? process.observed_source_systems.join(' → ') : process.source_system
  const processUrl = tjmgProcessUrl(process)
  const documentsUrl = tjmgDocumentsUrl(process)
  return <article className="judicial-process-card">
    <header><div><p className="process-source">{process.court}</p><h3>{formatCnj(process.cnj_number)}</h3><p>{display(process.class_name)}</p></div><span className={`process-status ${process.status_group}`}>{statusLabels[process.status_group]}</span></header>
    {process.subjects.length ? <p className="process-subject">{process.subjects[0]}</p> : null}
    <dl className="process-summary"><dt>Comarca</dt><dd>{display(process.district)}</dd><dt>Órgão julgador</dt><dd>{display(process.court_unit)}</dd><dt>Distribuição</dt><dd>{formatDate(process.filing_date)}</dd><dt>Valor da causa</dt><dd>{formatMoney(process.claim_value)}</dd></dl>
    {process.last_event ? <div className="last-event"><strong>Última movimentação</strong><span>{formatDate(process.last_event.date)}</span><p>{display(process.last_event.description || process.last_event.event)}</p></div> : null}
    <div className="process-card-actions">
      <button className="process-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</button>
      <div className="process-external-actions">{processUrl ? <a href={processUrl} target="_blank" rel="noreferrer">Ver no TJMG <span aria-hidden="true">↗</span></a> : null}{documentsUrl ? <a href={documentsUrl} target="_blank" rel="noreferrer">Documentos no TJMG <span aria-hidden="true">↗</span></a> : null}</div>
    </div>
    {expanded ? <div className="process-details"><dl className="process-metadata"><dt>Sistema de origem</dt><dd>{display(systems)}</dd><dt>Tipo de justiça</dt><dd>{display(process.justice_type)}</dd><dt>Identificador externo</dt><dd>{display(process.external_id)}</dd></dl></div> : null}
  </article>
}

export function JudicialProcessList({ data, onPage }: { data: JudicialProcessPage; onPage: (page: number) => void }) {
  if (!data.results.length) return <div className="state"><h3>Nenhum processo encontrado</h3><p>A consulta ao TJMG não retornou processos para este critério.</p></div>
  return <><div className="judicial-results-heading"><div><strong>{data.source_total} {data.source_total === 1 ? 'processo informado' : 'processos informados'} pelo TJMG</strong><span>{data.returned_count} {data.returned_count === 1 ? 'processo único nesta página' : 'processos únicos nesta página'}</span></div></div>{data.duplicates_removed > 0 ? <p className="dedupe-notice">{data.duplicates_removed} {data.duplicates_removed === 1 ? 'registro duplicado foi consolidado' : 'registros duplicados foram consolidados'} pelo número CNJ nesta página.</p> : null}<div className="judicial-processes">{data.results.map(process => <ProcessCard key={process.cnj_number} process={process} />)}</div><Pagination page={data.page} pageSize={data.page_size} count={data.source_total} previous={data.has_previous} next={data.has_next} onPage={onPage} /></>
}
