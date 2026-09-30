import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'

export type AreaMode = 'busca' | 'mapa'

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
  const [search] = useSearchParams()
  const target = (nextMode: AreaMode) => {
    const next = new URLSearchParams()
    next.set('modo', nextMode)
    for (const key of compatibleKeys) for (const value of search.getAll(key)) next.append(key, value)
    return `?${next.toString()}`
  }

  return <nav className="area-mode-switcher" aria-label="Modo de visualização">
    <Link to={target('busca')} replace={mode === 'busca'} aria-current={mode === 'busca' ? 'page' : undefined}>Busca</Link>
    <Link to={target('mapa')} replace={mode === 'mapa'} aria-current={mode === 'mapa' ? 'page' : undefined}>Mapa</Link>
  </nav>
}

export function UnavailableMap({ area }: { area: 'Empresas' | 'Sócios' }) {
  return <section className="mode-placeholder" aria-labelledby="map-mode-title">
    <h1 id="map-mode-title">Mapa de {area}</h1>
    <p>Esta visualização ainda não está disponível. Use o modo Busca para consultar os dados publicados.</p>
  </section>
}
