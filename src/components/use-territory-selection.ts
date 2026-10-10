import { useCallback, useEffect, useRef } from 'react'

// Leaflet retains GeoJSON handlers between renders; always use the current domain and draft.
export function useTerritorySelection(uf: string, onState: (code: string) => void, onMunicipality: (code: string) => void) {
  const current = useRef({ uf, onState, onMunicipality })
  useEffect(() => { current.current = { uf, onState, onMunicipality } }, [uf, onState, onMunicipality])
  return useCallback((code: string) => {
    const selection = current.current
    if (selection.uf) selection.onMunicipality(code)
    else selection.onState(code)
  }, [])
}
