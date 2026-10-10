import type { ReactNode } from 'react'

export function MapWorkspace({ filters, children }: { filters: ReactNode; children: ReactNode }) {
  return <div className="cno-explorer map-workspace">
    <div className="map-workspace-column map-workspace-filters" role="region" aria-label="Filtros do mapa" tabIndex={0}>
      {filters}
    </div>
    <div className="map-workspace-column" role="region" aria-label="Mapa e resultados" tabIndex={0}>
      {children}
    </div>
  </div>
}
