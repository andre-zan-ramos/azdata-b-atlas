import type L from 'leaflet'
import { useEffect, useRef, type ComponentProps } from 'react'
import { CircleMarker } from 'react-leaflet'
import { bindPointKeyboard } from '../utils/map-accessibility'

export function AccessibleCircleMarker({ accessibleLabel, ...props }: ComponentProps<typeof CircleMarker> & { accessibleLabel: string }) {
  const marker = useRef<L.CircleMarker>(null)
  // The child's Leaflet lifecycle has mounted the path before this effect.
  useEffect(() => {
    const layer = marker.current
    if (!layer) return
    bindPointKeyboard(layer, accessibleLabel)
    const element = layer.getElement() as SVGElement | undefined
    return () => {
      if (element) element.onkeydown = null
      const popup = layer.getPopup()?.getElement()
      if (popup) popup.onkeydown = null
    }
  }, [accessibleLabel])
  return <CircleMarker {...props} ref={marker} />
}
