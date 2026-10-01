import type L from 'leaflet'
import { describe, expect, it, vi } from 'vitest'
import { makeMapControl, validCoordinates } from './map-accessibility'

describe('acesso aos pontos cartográficos', () => {
  it('abre por Enter e Espaço, fecha por Escape e não acumula handlers', () => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const closePopup = vi.fn()
    const activate = vi.fn()
    const layer = { getElement: () => element, closePopup } as unknown as L.Path
    makeMapControl(layer, 'CNPJ 00123456000100', activate)
    makeMapControl(layer, 'CNPJ 00123456000100', activate)
    expect(element.getAttribute('tabindex')).toBe('0')
    expect(element.getAttribute('aria-label')).toContain('00123456000100')
    for (const key of ['Enter', ' ', 'Escape', 'ArrowDown']) element.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }))
    expect(activate).toHaveBeenCalledTimes(2)
    expect(closePopup).toHaveBeenCalledTimes(1)
  })
  it.each([[null, -43], [-19, null], [NaN, -43], [-19, Infinity], [91, -43], [-19, -181], [0, 0]])('exclui coordenadas inválidas %s / %s', (lat, lon) => {
    expect(validCoordinates(lat, lon)).toBe(false)
  })
  it('aceita coordenadas válidas inclusive uma coordenada zero', () => {
    expect(validCoordinates(-19, -43)).toBe(true)
    expect(validCoordinates(0, -43)).toBe(true)
  })
})
