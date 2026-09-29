import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../api/errors'
import { portalTransparenciaApi } from '../api/portal-transparencia/client'
import type { PortalPage, PortalRecord, PortalValue } from '../api/portal-transparencia/types'

const MONTH_YEAR = /^(0[1-9]|1[0-2])\/\d{4}$/
const publicErrorMessages: Record<string, string> = {
  portal_integration_disabled: 'Esta consulta está indisponível porque a integração está desabilitada.',
  portal_upstream_timeout: 'A fonte excedeu o tempo de espera. Tente novamente mais tarde.',
  portal_upstream_rate_limited: 'A fonte limitou temporariamente as consultas. Aguarde antes de tentar novamente.',
  portal_upstream_rejected: 'A fonte rejeitou a consulta. Tente novamente mais tarde.',
  portal_upstream_unavailable: 'A fonte está temporariamente indisponível. Tente novamente mais tarde.',
  portal_upstream_invalid_response: 'A fonte retornou uma resposta inesperada. Tente novamente mais tarde.',
  portal_invalid_cnpj: 'O CNPJ informado não é válido para esta consulta.',
  portal_invalid_parameters: 'Revise o período e o número da página informados.',
}

function monthIndex(value: string) {
  const [month, year] = value.split('/').map(Number)
  return year * 12 + month
}

export function validatePortalPeriod(start: string, end: string) {
  if (!MONTH_YEAR.test(start) || !MONTH_YEAR.test(end)) return 'Informe o início e o fim no formato MM/AAAA.'
  if (monthIndex(start) > monthIndex(end)) return 'O período inicial deve ser anterior ou igual ao período final.'
  return null
}

function usePortalMutation<TVariables, TData>(request: (variables: TVariables, signal: AbortSignal) => Promise<TData>) {
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  return useMutation({
    mutationFn: (variables: TVariables) => {
      controller.current?.abort()
      controller.current = new AbortController()
      return request(variables, controller.current.signal)
    },
    retry: false,
  })
}

function PortalError({ error }: { error: Error }) {
  const code = error instanceof ApiError ? error.code : undefined
  return <div className="portal-state portal-error" role="alert"><strong>Não foi possível concluir a consulta</strong><p>{code && publicErrorMessages[code] ? publicErrorMessages[code] : 'A consulta não pôde ser concluída agora. Tente novamente mais tarde.'}</p></div>
}

function LiteralScalar({ value }: { value: PortalValue }) {
  if (value === null) return <span className="portal-literal-empty">null</span>
  if (value === '') return <span className="portal-literal-empty">string vazia</span>
  if (typeof value === 'boolean') return <span>{String(value)}</span>
  return <span>{String(value)}</span>
}

function LiteralValue({ value }: { value: PortalValue }): ReactNode {
  if (Array.isArray(value)) {
    if (!value.length) return <span className="portal-literal-empty">lista vazia</span>
    return <ol className="portal-literal-list">{value.map((item, index) => <li key={index}><LiteralValue value={item} /></li>)}</ol>
  }
  if (value !== null && typeof value === 'object') return <LiteralRecord record={value} />
  return <LiteralScalar value={value} />
}

function LiteralRecord({ record }: { record: PortalRecord }) {
  const entries = Object.entries(record)
  if (!entries.length) return <p className="portal-literal-empty">Objeto vazio</p>
  return <dl className="portal-literal-record">{entries.map(([key, value]) => <div key={key}><dt>{key}</dt><dd><LiteralValue value={value} /></dd></div>)}</dl>
}

function Records({ records }: { records: PortalRecord[] }) {
  return <div className="portal-records">{records.map((record, index) => <article key={index}><h4>Registro {index + 1}</h4><LiteralRecord record={record} /></article>)}</div>
}

function PageFacts({ page }: { page: PortalPage }) {
  return <dl className="portal-page-facts">
    <div><dt>Página consultada</dt><dd>{page.page}</dd></div>
    <div><dt>Registros nesta página</dt><dd>{page.returned_count}</dd></div>
    <div><dt>Total de registros</dt><dd>{page.total_count === null ? 'Desconhecido' : page.total_count}</dd></div>
    <div><dt>Há próxima página?</dt><dd>{page.has_next === null ? 'Desconhecido' : page.has_next ? 'Sim' : 'Não'}</dd></div>
    <div><dt>Há página anterior?</dt><dd>{page.has_previous ? 'Sim' : 'Não'}</dd></div>
  </dl>
}

function PageResult({ page, domain }: { page: PortalPage; domain: string }) {
  return <>
    <PageFacts page={page} />
    <p className="portal-caveat">A navegação é manual e não indica última página nem cobertura completa.</p>
    {page.results.length ? <Records records={page.results} /> : <div className="portal-state portal-empty"><strong>Nenhum registro retornado nesta página</strong><p>Isso não indica inexistência histórica de {domain}.</p></div>}
  </>
}

function PageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>Página<input aria-label="Página" type="number" min="1" step="1" value={value} onChange={event => onChange(event.target.value)} /></label>
}

function PersonPanel({ cnpj }: { cnpj: string }) {
  const query = usePortalMutation<void, PortalRecord>((_, signal) => portalTransparenciaApi.person(cnpj, signal))
  return <article className="portal-panel">
    <header><h3>Pessoa jurídica</h3><p>Dados cadastrais complementares da fonte federal.</p></header>
    <button type="button" disabled={query.isPending} onClick={() => query.mutate()}>{query.isPending ? 'Consultando…' : query.data ? 'Consultar novamente' : 'Consultar pessoa jurídica'}</button>
    {query.isIdle ? <p className="portal-idle">Consulta ainda não realizada.</p> : null}
    {query.isPending ? <div className="portal-state" role="status">Consultando pessoa jurídica…</div> : null}
    {query.isError ? <PortalError error={query.error} /> : null}
    {query.isSuccess ? <div className="portal-success"><LiteralRecord record={query.data} /><p className="portal-caveat">Indicadores booleanos descrevem somente a resposta desta fonte; não comprovam cobertura completa nem existência atual em outro domínio.</p></div> : null}
  </article>
}

function ResourcesPanel({ cnpj }: { cnpj: string }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [page, setPage] = useState('1')
  const [validation, setValidation] = useState<string | null>(null)
  const query = usePortalMutation<{ start: string; end: string; page: number }, PortalPage>((values, signal) => portalTransparenciaApi.resources(cnpj, { mes_ano_inicio: values.start, mes_ano_fim: values.end, pagina: values.page }, signal))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const periodError = validatePortalPeriod(start, end)
    const parsedPage = Number(page)
    const error = periodError ?? (!Number.isInteger(parsedPage) || parsedPage < 1 ? 'Informe uma página com número inteiro positivo.' : null)
    setValidation(error)
    if (!error) query.mutate({ start, end, page: parsedPage })
  }
  return <article className="portal-panel">
    <header><h3>Recursos recebidos</h3><p>Consulta pontual por período e página.</p></header>
    <form onSubmit={submit} noValidate><div className="portal-controls"><label>Início (MM/AAAA)<input aria-label="Início (MM/AAAA)" value={start} onChange={event => setStart(event.target.value)} placeholder="01/2025" inputMode="numeric" /></label><label>Fim (MM/AAAA)<input aria-label="Fim (MM/AAAA)" value={end} onChange={event => setEnd(event.target.value)} placeholder="12/2025" inputMode="numeric" /></label><PageField value={page} onChange={setPage} /></div><button disabled={query.isPending}>{query.isPending ? 'Consultando…' : 'Consultar recursos'}</button></form>
    {validation ? <div className="portal-state portal-error" role="alert">{validation}</div> : null}
    {query.isIdle ? <p className="portal-idle">Consulta ainda não realizada.</p> : null}
    {query.isPending ? <div className="portal-state" role="status">Consultando recursos recebidos…</div> : null}
    {query.isError ? <PortalError error={query.error} /> : null}
    {query.isSuccess ? <PageResult page={query.data} domain="recursos recebidos" /> : null}
  </article>
}

function ContractsPanel({ cnpj }: { cnpj: string }) {
  const [page, setPage] = useState('1')
  const [validation, setValidation] = useState<string | null>(null)
  const query = usePortalMutation<number, PortalPage>((value, signal) => portalTransparenciaApi.contracts(cnpj, value, signal))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsedPage = Number(page)
    const error = !Number.isInteger(parsedPage) || parsedPage < 1 ? 'Informe uma página com número inteiro positivo.' : null
    setValidation(error)
    if (!error) query.mutate(parsedPage)
  }
  return <article className="portal-panel">
    <header><h3>Contratos</h3><p>Consulta pontual dos contratos associados ao CNPJ na fonte.</p></header>
    <form onSubmit={submit} noValidate><div className="portal-controls"><PageField value={page} onChange={setPage} /></div><button disabled={query.isPending}>{query.isPending ? 'Consultando…' : 'Consultar contratos'}</button></form>
    {validation ? <div className="portal-state portal-error" role="alert">{validation}</div> : null}
    {query.isIdle ? <p className="portal-idle">Consulta ainda não realizada.</p> : null}
    {query.isPending ? <div className="portal-state" role="status">Consultando contratos…</div> : null}
    {query.isError ? <PortalError error={query.error} /> : null}
    {query.isSuccess ? <PageResult page={query.data} domain="contratos" /> : null}
  </article>
}

export function PortalTransparenciaEnrichment({ cnpj }: { cnpj: string }) {
  return <section className="portal-enrichment" aria-labelledby="portal-enrichment-title">
    <header><p className="eyebrow">Enriquecimento externo</p><h2 id="portal-enrichment-title">Portal da Transparência do Governo Federal</h2><p className="hint">Consultas independentes e sob demanda. Estes dados complementam, mas não substituem, o cadastro da Receita Federal exibido acima.</p></header>
    <div className="portal-grid"><PersonPanel cnpj={cnpj} /><ResourcesPanel cnpj={cnpj} /><ContractsPanel cnpj={cnpj} /></div>
  </section>
}
