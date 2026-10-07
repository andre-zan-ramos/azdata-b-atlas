import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { CodeDescription } from '../api/receita-federal/cnpj/types'
import { CnaeCatalogPicker } from './cnae-catalog-picker'
import { QueryError } from './query-state'

export function CnaeReceitaDialog({ initial, scope, secondary, confirm, close, trigger }: { initial: CodeDescription[]; scope: string; secondary: boolean; confirm: (items: CodeDescription[], scope: string) => void; close: () => void; trigger?: HTMLButtonElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const title = useId()
  const [items, setItems] = useState(initial)
  const [activityScope, setScope] = useState(scope)
  const [term, setTerm] = useState('')
  const [exact, setExact] = useState('')
  const [notice, setNotice] = useState('')
  const [request, setRequest] = useState({ descricao: '', page: 1 })
  const domain = useQuery({ queryKey: ['cnpj', 'cnae-domain', request], queryFn: ({ signal }) => cnpjApi.cnaes({ ...request, page_size: 10 }, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  useEffect(() => {
    const previous = trigger ?? document.activeElement as HTMLElement | null
    dialog.current?.showModal(); input.current?.focus()
    return () => { queueMicrotask(() => previous?.focus()) }
  }, [])
  const add = (item: CodeDescription) => {
    if (items.some(value => value.codigo === item.codigo)) return false
    if (items.length >= 100) { setNotice('Limite de 100 CNAEs atingido. Remova um código antes de adicionar.'); return false }
    setItems(previous => [...previous, item]); setNotice('')
    return true
  }
  return createPortal(<dialog className="cnae-dialog" ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); close() }} onChange={event => event.stopPropagation()} onKeyDown={event => {
    event.stopPropagation()
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); if (event.target === input.current) setRequest({ descricao: term, page: 1 }) }
    if (event.key === 'Tab') {
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(item => item.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }}>
    <h2 id={title}>Selecionar CNAEs</h2>
    <p>Domínio Receita Federal. OR entre códigos; AND com território e demais filtros. {items.length}/100 CNAEs selecionados.</p>
    <label>Buscar descrição Receita<input ref={input} value={term} onChange={event => setTerm(event.target.value)} /></label>
    <button type="button" onClick={() => setRequest({ descricao: term, page: 1 })}>Buscar CNAEs</button>
    {domain.isFetching ? <p role="status">Carregando CNAEs Receita…</p> : null}
    {domain.isError ? <QueryError error={domain.error} retry={() => void domain.refetch()} /> : null}
    {!domain.isFetching && !domain.isError ? domain.data?.results.map(item => <label className="cnae-choice" key={item.codigo}><input type="checkbox" checked={items.some(value => value.codigo === item.codigo)} onChange={event => event.target.checked ? add(item) : setItems(previous => previous.filter(value => value.codigo !== item.codigo))} />{item.codigo} · {item.descricao}</label>) : null}
    <p>Página Receita {request.page}</p>
    <button type="button" disabled={domain.isFetching || domain.isError || !domain.data?.previous} onClick={() => setRequest(previous => ({ ...previous, page: previous.page - 1 }))}>Página anterior Receita</button>
    <button type="button" disabled={domain.isFetching || domain.isError || !domain.data?.next} onClick={() => setRequest(previous => ({ ...previous, page: previous.page + 1 }))}>Próxima página Receita</button>
    <label>Código exato (sete dígitos)<input value={exact} onChange={event => setExact(event.target.value)} /></label>
    <button type="button" onClick={() => /^[0-9]{7}$/.test(exact) ? add({ codigo: exact, descricao: 'Existência a validar na consulta CNPJ' }) : setNotice('Informe um código literal de sete dígitos.')}>Adicionar código exato</button>
    <p>Códigos informados e subclasses IBGE são validados pela Receita somente ao aplicar. Erros conservam a seleção.</p>
    <CnaeCatalogPicker codes={items.map(item => item.codigo).join(',')} onCodes={(codes, node) => { const code = codes.split(',').at(-1)!; return add({ codigo: code, descricao: node ? `IBGE/CONCLA: ${node.description} — existência a validar na Receita` : 'Subclasse IBGE — existência a validar na Receita' }) }} />
    <ul>{items.map((item, index) => <li key={`${item.codigo}-${index}`}>{item.codigo} · {item.descricao} <button type="button" onClick={() => setItems(previous => previous.filter((_, position) => position !== index))}>Remover {item.codigo}</button></li>)}</ul>
    <label>Atividades consideradas<select value={activityScope} onChange={event => setScope(event.target.value)}><option value="principal">Somente principal</option><option value="principal_ou_secundaria" disabled={!secondary}>Principal ou secundárias</option></select></label>
    {!secondary ? <p>Secundárias indisponíveis até certificação da release pela API.</p> : null}
    {notice ? <p role="alert">{notice}</p> : null}
    <button type="button" onClick={() => { if (items.length > 100 || (activityScope === 'principal_ou_secundaria' && !secondary)) { setNotice('Revise o limite de 100 CNAEs e o escopo certificado.'); return } confirm(items, activityScope) }}>Confirmar</button>
    <button type="button" onClick={close}>Cancelar</button>
    <button type="button" onClick={() => { setItems([]); setNotice('') }}>Limpar</button>
  </dialog>, document.body)
}
