import { useEffect, useId, useRef, useState } from 'react'

export type ComboboxOption = { value: string; label: string }
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

// Same search and keyboard interaction used by Polling, with B-Atlas native styling.
export function SearchableCombobox({ label, value, options, onChange, disabled = false, loading = false, emptyMessage = 'Nenhuma opção encontrada.' }: {
  label: string; value: string; options: ComboboxOption[]; onChange: (value: string) => void; disabled?: boolean; loading?: boolean; emptyMessage?: string
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = options.find(option => option.value === value)
  const visible = options.filter(option => normalize(option.label).includes(normalize(query.trim())))
  const choose = (option: ComboboxOption) => { onChange(option.value); setOpen(false); setQuery(''); input.current?.focus() }
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, id, open])
  return <div className="searchable-combobox" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setQuery('') }
  }}>
    <label htmlFor={id}>{label}</label>
    <div className="searchable-combobox-control">
      <input id={id} ref={input} role="combobox" aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={`${id}-options`} aria-activedescendant={open && visible[active] ? `${id}-option-${active}` : undefined} aria-busy={loading || undefined} disabled={disabled} autoComplete="off" value={open ? query : selected?.label ?? value} placeholder={loading ? 'Carregando…' : selected?.label ?? `Buscar ${label.toLocaleLowerCase('pt-BR')}…`} onClick={() => setOpen(true)} onFocus={() => { setOpen(true); setQuery(''); setActive(0) }} onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true) }} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery('') }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(current => visible.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length : 0) }
        else if (event.key === 'Enter') { event.preventDefault(); if (open && visible[active]) choose(visible[active]); else setOpen(true) }
      }} />
      <button type="button" tabIndex={-1} aria-label={`Abrir opções de ${label}`} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => { if (open) { setOpen(false); setQuery('') } else { input.current?.focus(); setOpen(true); setActive(0) } }}>▾</button>
    </div>
    {open && !disabled ? <div id={`${id}-options`} className="searchable-combobox-options" role="listbox" aria-label={`Opções de ${label}`}>
      {loading ? <p role="status">Carregando…</p> : visible.length ? visible.map((option, index) => <button id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={option.value === value} data-active={active === index} type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>{option.label}</button>) : <p role="status">{emptyMessage}</p>}
    </div> : null}
  </div>
}
