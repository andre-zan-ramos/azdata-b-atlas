import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams, useLocation } from 'react-router'

export type AreaMode = 'busca' | 'mapa'
export const AreaModeHeaderContext = createContext<HTMLElement | null>(null)

export function useAreaMode() {
  const [search, setSearch] = useSearchParams()
  const rawMode = search.get('modo')
  const mode: AreaMode = rawMode === 'mapa' ? 'mapa' : 'busca'

  useEffect(() => {
    if (rawMode === null || rawMode === 'busca' || rawMode === 'mapa') return
    const next = new URLSearchParams(search)
    next.set('modo', 'busca')
    setSearch(next, { replace: true })
  }, [rawMode, search, setSearch])

  return mode
}

export function AreaModeSwitcher({ mode, compatibleKeys }: { mode: AreaMode; compatibleKeys: readonly string[] }) {
  const headerTarget = useContext(AreaModeHeaderContext)
  const [search] = useSearchParams()
  const location = useLocation()
  const [memory, setMemory] = useState<Record<string, Partial<Record<AreaMode, string>>>>(() => location.state?.areaModes ?? {})
  const queryString = search.toString()
  useEffect(() => {
    setMemory(previous => ({ ...previous, [location.pathname]: { ...previous[location.pathname], ...location.state?.areaModes?.[location.pathname], [mode]: `?${queryString}` } }))
  }, [location.pathname, location.state, mode, queryString])
  const saved = memory[location.pathname] ?? {}
  const state = { ...location.state, areaModes: { ...location.state?.areaModes, [location.pathname]: { ...saved, [mode]: `?${search.toString()}` } } }
  const target = (nextMode: AreaMode) => {
    if (nextMode === mode) return `?${search.toString()}`
    if (saved[nextMode]) return saved[nextMode]
    const next = new URLSearchParams()
    next.set('modo', nextMode)
    for (const key of compatibleKeys) for (const value of search.getAll(key)) next.append(key, value)
    return `?${next.toString()}`
  }

  const switcher = <nav className="area-mode-switcher" aria-label="Modo de visualização">
    <Link to={target('busca')} state={state} replace={mode === 'busca'} aria-current={mode === 'busca' ? 'page' : undefined}>Busca</Link>
    <Link to={target('mapa')} state={state} replace={mode === 'mapa'} aria-current={mode === 'mapa' ? 'page' : undefined}>Mapa</Link>
  </nav>
  return headerTarget ? createPortal(switcher, headerTarget) : switcher
}

export function UnavailableMap({ area }: { area: 'Empresas' | 'Sócios' }) {
  return <section className="mode-placeholder" aria-labelledby="map-mode-title">
    <h1 id="map-mode-title">Mapa de {area}</h1>
    <p>Esta visualização ainda não está disponível. Use o modo Busca para consultar os dados publicados.</p>
  </section>
}
