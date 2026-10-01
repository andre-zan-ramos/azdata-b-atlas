import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import type { PartnerMapItem } from '../api/receita-federal/cnpj/types'
import { validPartnerPoint } from '../utils/partner-map'
import { PartnerTerritoryMap } from './partner-territory-map'

vi.mock('../api/ibge/territories', () => ({ getMesh: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }) }))
vi.mock('leaflet', () => ({ default: { geoJSON: () => ({ getBounds: () => ({ isValid: () => false }) }) } }))
vi.mock('react-leaflet', async () => {
  const { forwardRef } = await import('react')
  return {
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CircleMarker: forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, _ref) => <div data-testid="marker">{children}</div>),
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GeoJSON: () => null, TileLayer: () => null, useMap: () => ({}),
  }
})
const point: PartnerMapItem = {
  identity: { release: '2026-08', participation_id: 1, establishment_id: 2, cnpj: '00123456000100', geo_link_id: 3 },
  partner: { nome_socio_ou_razao_social: 'MARIA', cnpj_cpf_socio: null, missing_document_id: 1 },
  participation: { id: 1, cnpj_basico: '00123456', identificador_socio: 2, qualificacao_socio: null, data_entrada_sociedade: null, representante_legal_cpf: '', representante_legal_nome: '', faixa_etaria: null },
  company: { cnpj_basico: '00123456', razao_social: 'EMPRESA' },
  establishment: { id: 2, cnpj: '00123456000100', cnpj_basico: '00123456', nome_fantasia: '', uf: 'MG', municipio: { codigo: '4123', descricao: 'Belo Horizonte', uf: 'MG' }, geolocation: { status: 'available', reason: null, stale: false, precision: 'postal_code_approximation', latitude: -19, longitude: -43, source: 'brasilapi', observed_at: null } },
}

describe('pontos de estabelecimentos com contexto de sócios', () => {
  it('reúne itens co-localizados sem perder duplicatas, identidades ou navegação', async () => {
    const second = { ...point, identity: { ...point.identity, participation_id: 4 }, participation: { ...point.participation, id: 4 } }
    render(<Providers><MemoryRouter><PartnerTerritoryMap uf="MG" onState={vi.fn()} onMunicipality={vi.fn()} names={new Map()} selectedMunicipalityIbge={null} points={[point, second]} returnTo="/receita-federal/cnpj/socios?modo=mapa&page=3" /></MemoryRouter></Providers>)
    const marker = await screen.findByTestId('marker')
    expect(screen.getAllByTestId('marker')).toHaveLength(1)
    expect(within(marker).getAllByText('MARIA')).toHaveLength(2)
    expect(within(marker).getAllByText(/CNPJ 00123456000100/)).toHaveLength(2)
    expect(within(marker).getAllByText(/Localização aproximada pelo CEP/)).toHaveLength(2)
    const links = within(marker).getAllByRole('link', { name: 'Abrir participação do sócio' })
    expect(links[0].getAttribute('href')).toContain('participacao=1&release=2026-08')
    expect(links[1].getAttribute('href')).toContain('participacao=4&release=2026-08')
  })

  it.each([
    { status: 'stale' }, { stale: true }, { reason: 'context_mismatch' },
    { precision: null }, { latitude: null }, { longitude: null },
    { latitude: 91 }, { longitude: -181 }, { latitude: NaN },
    { longitude: Infinity }, { latitude: 0, longitude: 0 },
  ] as const)('rejeita geolocalização fora do contrato %j', override => {
    expect(validPartnerPoint({ ...point, establishment: { ...point.establishment, geolocation: { ...point.establishment.geolocation, ...override } } })).toBe(false)
  })

  it('rejeita identidade incompatível sem reinterpretar o CNPJ', () => {
    expect(validPartnerPoint({ ...point, identity: { ...point.identity, cnpj: '123456000100' } })).toBe(false)
    expect(validPartnerPoint({ ...point, identity: { ...point.identity, participation_id: 100 } })).toBe(false)
  })
})
