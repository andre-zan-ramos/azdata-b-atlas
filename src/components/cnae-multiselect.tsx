import { Combobox } from '@base-ui/react/combobox'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { CodeDescription } from '../api/receita-federal/cnpj/types'
import { QueryError } from './query-state'

export function CnaeMultiselect({ items, onChange, label = 'Tipo de estabelecimento' }: { label?: string; items: CodeDescription[]; onChange: (items: CodeDescription[]) => void }) {
  const id = useId()
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (input.trim() === term) return
    const timer = setTimeout(() => { setTerm(input.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [input, term])
  const domain = useQuery({ queryKey: ['cnpj', 'cnae-multiselect', term, page], enabled: open, queryFn: ({ signal }) => cnpjApi.cnaes({ descricao: term, page, page_size: 10 }, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const options = [...items, ...(domain.data?.results ?? []).filter(item => !items.some(selected => selected.codigo === item.codigo))]
  return <div className="cnae-multiselect" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
    <label htmlFor={id}>{label}</label>
    <Combobox.Root multiple items={options} value={items} onValueChange={(next, details) => {
      if (details.reason === 'escape-key') { details.cancel(); return }
      if (next.length > 100) { setNotice('Selecione até 100 CNAEs.'); return }
      setNotice(''); onChange(next)
    }} open={open} onOpenChange={setOpen} inputValue={input} onInputValueChange={setInput} filter={null} itemToStringLabel={item => `${item.codigo} · ${item.descricao}`} isItemEqualToValue={(a, b) => a.codigo === b.codigo}>
      <Combobox.Chips ref={anchor} className="cnae-chips">
        <Combobox.Value>{(selected: CodeDescription[]) => selected.map((item, index) => <Combobox.Chip key={`${item.codigo}-${index}`} className="cnae-chip">
          <span>{item.descricao} <small>{item.codigo}</small></span>
          <Combobox.ChipRemove aria-label={`Remover ${item.codigo}`}>×</Combobox.ChipRemove>
        </Combobox.Chip>)}</Combobox.Value>
        <Combobox.Input id={id} placeholder="Buscar atividade…" />
      </Combobox.Chips>
      <Combobox.Portal><Combobox.Positioner anchor={anchor} sideOffset={4} className="cnae-combobox-positioner"><Combobox.Popup className="cnae-combobox-popup">
        {domain.isFetching || input.trim() !== term ? <p role="status">Buscando…</p> : domain.isError ? <QueryError error={domain.error} retry={() => void domain.refetch()} /> : <>
          {!domain.data?.results.length ? <p>Nenhuma atividade encontrada.</p> : null}
          <Combobox.List>{(item: CodeDescription) => <Combobox.Item key={item.codigo} value={item} className="cnae-combobox-item"><Combobox.ItemIndicator>✓</Combobox.ItemIndicator><span>{item.descricao}<small>{item.codigo}</small></span></Combobox.Item>}</Combobox.List>
          {domain.data?.previous || domain.data?.next ? <div className="cnae-combobox-pagination"><button type="button" disabled={!domain.data?.previous} onMouseDown={event => event.preventDefault()} onClick={() => setPage(previous => previous - 1)}>Anterior</button><span>{page}</span><button type="button" disabled={!domain.data?.next} onMouseDown={event => event.preventDefault()} onClick={() => setPage(previous => previous + 1)}>Próxima</button></div> : null}
        </>}
      </Combobox.Popup></Combobox.Positioner></Combobox.Portal>
    </Combobox.Root>
    {notice ? <p role="alert">{notice}</p> : null}
  </div>
}
