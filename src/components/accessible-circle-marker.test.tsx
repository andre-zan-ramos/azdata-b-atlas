import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccessibleCircleMarker } from './accessible-circle-marker'

const calls = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn() }))
vi.mock('react-leaflet', async () => {
  const { forwardRef, useImperativeHandle, useRef } = await import('react')
  return { CircleMarker: forwardRef((_props, ref) => {
    const element = useRef<SVGPathElement>(null)
    useImperativeHandle(ref, () => ({ getElement: () => element.current, openPopup: calls.open, closePopup: calls.close, getPopup: () => undefined }))
    return <svg><path ref={element} data-testid="point" /></svg>
  }) }
})

describe('teclado após montagem do marcador', () => {
  it('instala o controle mesmo sem evento add, atualiza o nome e remove o handler', () => {
    const view = render(<AccessibleCircleMarker center={[-19, -43]} accessibleLabel="CNPJ 001" />)
    const point = screen.getByTestId('point')
    expect(point).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(point, { key: 'Enter' })
    expect(calls.open).toHaveBeenCalledTimes(1)
    view.rerender(<AccessibleCircleMarker center={[-19, -43]} accessibleLabel="Duas relações" />)
    expect(point).toHaveAttribute('aria-label', 'Duas relações')
    fireEvent.keyDown(point, { key: 'Escape' })
    expect(calls.close).toHaveBeenCalledTimes(1)
    view.unmount()
    expect((point as unknown as SVGElement).onkeydown).toBeNull()
  })
})
