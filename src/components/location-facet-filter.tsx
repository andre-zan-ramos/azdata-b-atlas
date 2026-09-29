import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { LocationFacetFilters, TextMatchMode } from '../api/receita-federal/cnpj/types'

type FacetContext = Omit<LocationFacetFilters, 'q' | 'page' | 'page_size' | 'descricao'>
type Selection = { uf: string; municipio: string } | null

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export function LocationFacetFilter({ selected, onSelect }: { q: string; qMode: TextMatchMode; filters: FacetContext; selected: Selection; onSelect: (selection: Selection) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const municipalitySearchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [uf, setUf] = useState(selected?.uf ?? '')
  const [municipalitySearch, setMunicipalitySearch] = useState('')
  const municipalities = useInfiniteQuery({
    queryKey: ['cnpj', 'domains', 'municipalities', uf],
    enabled: open && Boolean(uf),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => cnpjApi.municipalities({ uf, page: pageParam, page_size: 50 }, signal),
    getNextPageParam: (lastPage, pages) => lastPage.next ? pages.length + 1 : undefined,
  })
  useEffect(() => {
    if (!open) return
    setUf(selected?.uf ?? '')
    setMunicipalitySearch('')
  }, [open, selected])
  useEffect(() => {
    if (open && uf) municipalitySearchRef.current?.focus()
  }, [open, uf])
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])
  const items = municipalities.data?.pages.flatMap(page => page.results) ?? []
  const normalizedSearch = municipalitySearch.trim().toLocaleLowerCase('pt-BR')
  useEffect(() => {
    if (!normalizedSearch || !municipalities.hasNextPage || municipalities.isFetchingNextPage) return
    void municipalities.fetchNextPage()
  }, [normalizedSearch, municipalities.hasNextPage, municipalities.isFetchingNextPage, municipalities.fetchNextPage])
  const visibleItems = useMemo(() => normalizedSearch ? items.filter(item => item.descricao.toLocaleLowerCase('pt-BR').includes(normalizedSearch)) : items, [items, normalizedSearch])
  const choose = (municipio: string) => {
    onSelect({ uf, municipio })
    setOpen(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }
  const clear = () => { onSelect(null); setUf(''); setOpen(false); queueMicrotask(() => triggerRef.current?.focus()) }
  return <div className="facet-control" ref={rootRef}>
    <button ref={triggerRef} type="button" className="facet-trigger" aria-expanded={open} aria-haspopup="dialog" aria-controls="location-facet-popover" aria-label={selected ? 'Alterar filtro de localidade' : 'Filtrar por localidade'} title="Filtrar por localidade" onClick={() => setOpen(current => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7z" /></svg>{selected && <i aria-hidden="true" />}</button>
    {open && <div id="location-facet-popover" className="facet-popover" role="dialog" aria-label="Filtrar resultados por localidade" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() } }}>
      <div className="facet-title"><div><strong>Filtrar por localidade</strong><span>Escolha primeiro a UF e depois o município</span></div><button type="button" className="facet-close" aria-label="Fechar filtro de localidade" onClick={() => { setOpen(false); triggerRef.current?.focus() }}>×</button></div>
      <div className="facet-fields">
        <label htmlFor="facet-location-uf">UF</label>
        <select id="facet-location-uf" value={uf} onChange={event => { setUf(event.target.value); setMunicipalitySearch('') }}>
          <option value="">Selecione uma UF</option>
          {UFS.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <label htmlFor="facet-location-search">Município</label>
        <input ref={municipalitySearchRef} id="facet-location-search" value={municipalitySearch} disabled={!uf} onChange={event => setMunicipalitySearch(event.target.value)} placeholder={uf ? 'Buscar entre os municípios carregados' : 'Selecione uma UF primeiro'} />
      </div>
      {selected && <button type="button" className="facet-clear" onClick={clear}>Remover filtro atual</button>}
      <div className="facet-options">
        {!uf && <p>Selecione uma UF para carregar seus municípios.</p>}
        {uf && municipalities.isPending && <p role="status">Carregando municípios…</p>}
        {uf && municipalities.isError && <p role="alert">Não foi possível carregar os municípios. Feche e tente novamente.</p>}
        {uf && normalizedSearch && municipalities.hasNextPage && <p role="status">Buscando em todos os municípios da UF…</p>}
        {uf && !municipalities.isPending && !municipalities.isError && !municipalities.hasNextPage && visibleItems.length === 0 && <p>Nenhum município encontrado.</p>}
        {visibleItems.map(item => <button type="button" className="facet-option" key={`${item.uf}-${item.codigo}`} aria-pressed={selected?.uf === uf && selected.municipio === item.codigo} onClick={() => choose(item.codigo)}><span>{item.descricao}<small>{item.uf}</small></span></button>)}
      </div>
      {municipalities.hasNextPage && <button type="button" className="facet-more" disabled={municipalities.isFetchingNextPage} onClick={() => municipalities.fetchNextPage()}>{municipalities.isFetchingNextPage ? 'Carregando…' : 'Carregar mais municípios'}</button>}
    </div>}
  </div>
}
