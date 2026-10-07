import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PERIOD_GROUPS, readPeriod, validatePeriod, type Period } from '../utils/cnpj-period'

export function CnpjPeriodDialog({ initial, trigger, close, confirm }: { initial: Period; trigger: HTMLButtonElement | null; close: () => void; confirm: (period: Period) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const title = useId()
  const [period, setPeriod] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    dialog.current?.showModal()
    input.current?.focus()
    return () => { queueMicrotask(() => trigger?.focus()) }
  }, [trigger])
  return createPortal(<dialog className="cnae-dialog" ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close() }} onKeyDown={event => {
    event.stopPropagation()
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault()
    if (event.key === 'Tab') {
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('input, button')).filter(item => item.getClientRects().length)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }} onChange={event => event.stopPropagation()}>
    <h2 id={title}>Definir período</h2>
    <p>Limites inclusivos. Os dois intervalos se combinam por AND, também com território, CNAEs e demais filtros. Cada limite é opcional.</p>
    <p>O evento cadastral não significa última atualização geral nem necessariamente abertura. Datas ausentes não correspondem ao intervalo. Estes campos não comprovam que empresas estavam ativas no período.</p>
    {PERIOD_GROUPS.map(({ prefix, label }, index) => <fieldset key={prefix}><legend>{label}</legend>{(['de', 'ate'] as const).map(end => {
      const key = `${prefix}_${end}` as keyof Period
      return <label key={key}>{label}: {end === 'de' ? 'de' : 'até'}<input ref={index === 0 && end === 'de' ? input : undefined} type="text" placeholder="AAAA-MM-DD" value={period[key]} onChange={event => setPeriod(previous => ({ ...previous, [key]: event.target.value }))} /></label>
    })}</fieldset>)}
    <p>Informe datas no formato AAAA-MM-DD; o resumo mostra dia/mês/ano.</p>
    {error ? <p role="alert">{error}</p> : null}
    <button type="button" onClick={() => { const notice = validatePeriod(period); setError(notice); if (!notice) confirm(period) }}>Confirmar</button>
    <button type="button" onClick={close}>Cancelar</button>
    <button type="button" onClick={() => { setPeriod(readPeriod(new URLSearchParams())); setError(null) }}>Limpar</button>
  </dialog>, document.body)
}
