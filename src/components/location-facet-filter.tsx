import { useInfiniteQuery } from '@tanstack/react-query'
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { LocationFacetFilters, LocationFacetItem } from '../api/receita-federal/cnpj/types'

type FacetContext = Omit<LocationFacetFilters, 'q' | 'page' | 'page_size' | 'descricao'>
type Selection = { uf: string; municipio: string } | null

export function LocationFacetFilter({ q, filters, selected, onSelect }: { q: string; filters: FacetContext; selected: Selection; onSelect: (selection: Selection) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [appliedDescription, setAppliedDescription] = useState('')
  const query = useInfiniteQuery({
    queryKey: ['cnpj', 'search', 'location-facets', q, filters, appliedDescription], enabled: open,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => cnpjApi.locationFacets({ q, ...filters, descricao: appliedDescription || undefined, page: pageParam, page_size: 50 }, signal),
    getNextPageParam: (lastPage, pages) => lastPage.next ? pages.length + 1 : undefined,
  })
  useEffect(() => { if (open) searchRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])
  const items = query.data?.pages.flatMap(page => page.results) ?? []
  const submit = (event: FormEvent) => { event.preventDefault(); setAppliedDescription(description.trim()) }
  const choose = (item: LocationFacetItem) => {
    if (!item.municipio) return
    onSelect({ uf: item.uf, municipio: String(item.municipio.codigo) })
    setOpen(false); queueMicrotask(() => triggerRef.current?.focus())
  }
  const clear = () => { onSelect(null); setOpen(false); queueMicrotask(() => triggerRef.current?.focus()) }
  const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() } }
  return <div className="facet-control" ref={rootRef}>
    <button ref={triggerRef} type="button" className="facet-trigger" aria-expanded={open} aria-haspopup="dialog" aria-controls="location-facet-popover" aria-label={selected ? 'Alterar filtro de localidade' : 'Filtrar por localidade'} title="Filtrar por localidade" onClick={() => setOpen(current => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7z" /></svg>{selected && <i aria-hidden="true" />}</button>
    {open && <div id="location-facet-popover" className="facet-popover" role="dialog" aria-label="Filtrar resultados por localidade" onKeyDown={handleKeyDown}>
      <div className="facet-title"><div><strong>Filtrar por localidade</strong><span>Localidades encontradas em toda a consulta</span></div><button type="button" className="facet-close" aria-label="Fechar filtro de localidade" onClick={() => { setOpen(false); triggerRef.current?.focus() }}>×</button></div>
      <form className="facet-search" onSubmit={submit}><label htmlFor="facet-location-search">Buscar município</label><div><input ref={searchRef} id="facet-location-search" value={description} onChange={event => setDescription(event.target.value)} placeholder="Nome do município" /><button>Buscar</button></div></form>
      {selected && <button type="button" className="facet-clear" onClick={clear}>Remover filtro atual</button>}
      <div className="facet-options">
        {query.isPending && <p role="status">Carregando localidades…</p>}
        {query.isError && <p role="alert">Não foi possível carregar as localidades. Feche e tente novamente.</p>}
        {!query.isPending && !query.isError && items.length === 0 && <p>Nenhuma localidade encontrada.</p>}
        {items.map((item, index) => item.municipio
          ? <button type="button" className="facet-option" key={`${item.uf}-${item.municipio.codigo}`} onClick={() => choose(item)}><span>{item.municipio.descricao}<small>{item.uf}</small></span><b>{item.estabelecimentos_count.toLocaleString('pt-BR')}</b></button>
          : <div className="facet-option unavailable" key={`unknown-${item.uf}-${index}`}><span>Município não informado<small>{item.uf}</small></span><b>{item.estabelecimentos_count.toLocaleString('pt-BR')}</b></div>)}
      </div>
      {query.hasNextPage && <button type="button" className="facet-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}</button>}
    </div>}
  </div>
}
