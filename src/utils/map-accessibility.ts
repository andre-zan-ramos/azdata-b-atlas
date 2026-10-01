import type L from 'leaflet'

// Leaflet SVG paths are not keyboard controls by default.
export function makeMapControl(layer: L.Path, label: string, activate: () => void) {
  const element = layer.getElement() as SVGElement | undefined
  if (!element) return
  element.setAttribute('role', 'button')
  element.setAttribute('tabindex', '0')
  element.setAttribute('aria-label', label)
  element.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    } else if (event.key === 'Escape') {
      layer.closePopup()
    }
  }
}

export function bindPointKeyboard(layer: L.Path, label: string) {
  makeMapControl(layer, label, () => {
    layer.openPopup()
    const popup = layer.getPopup()?.getElement()
    popup?.querySelector<HTMLElement>('a, button')?.focus()
    if (popup) popup.onkeydown = keyEvent => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        layer.closePopup()
        const marker = layer.getElement() as SVGElement | undefined
        marker?.focus()
      }
    }
  })
}

export function validCoordinates(latitude: number | null, longitude: number | null) {
  return latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0)
}
