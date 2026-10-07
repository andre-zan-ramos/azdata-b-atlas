import { test as base, expect } from '@playwright/test'
import type { BusinessSearchItem, EstablishmentMapPoint, GroupedPartnerSearchItem, PartnerMapItem } from '../src/api/receita-federal/cnpj/types'
import { detail, fastPage, work } from '../src/test/cno-fixtures'
import { cnaeCatalog, cnaeNode, cnaePage, publication } from '../src/test/cnae-fixtures'

const release = 'browser-fixture'
const municipality = { codigo: '4123', codigo_ibge: '3106200', descricao: 'Belo Horizonte', uf: 'MG' }
const geo = { status: 'available', reason: null, precision: 'postal_code_approximation', latitude: -19.9, longitude: -43.9, source: 'fixture', observed_at: null, stale: false } as const
const business: BusinessSearchItem = {
  id: 9, cnpj: '00123456000100', cnpj_basico: '00123456', razao_social: 'EMPRESA DE TESTE', nome_fantasia: 'ATLAS TESTE',
  identificador_matriz_filial: { codigo: '1', descricao: 'Matriz' }, situacao_cadastral: { codigo: '2', descricao: 'Ativa' },
  uf: 'MG', municipio: municipality, cnae_principal: null, match_fields: ['razao_social'],
}
const establishment = { ...business, identificador_matriz_filial: 1, situacao_cadastral: 2, data_inicio_atividade: null, data_situacao_cadastral: null }
const point: EstablishmentMapPoint = { ...establishment, release, geolocation: geo }
const partner: PartnerMapItem = {
  identity: { release, participation_id: 7, establishment_id: 9, cnpj: business.cnpj, geo_link_id: 12 },
  establishment: { ...establishment, geolocation: geo }, company: { cnpj_basico: business.cnpj_basico, razao_social: business.razao_social },
  partner: { nome_socio_ou_razao_social: 'MARIA TESTE', cnpj_cpf_socio: '***123456**', missing_document_id: null },
  participation: { id: 7, cnpj_basico: business.cnpj_basico, identificador_socio: 2, qualificacao_socio: { codigo: '49', descricao: 'Sócio' }, data_entrada_sociedade: null, representante_legal_cpf: '', representante_legal_nome: '', faixa_etaria: null },
}
const secondPartner: PartnerMapItem = { ...partner, identity: { ...partner.identity, participation_id: 8 }, participation: { ...partner.participation, id: 8 } }
const grouped: GroupedPartnerSearchItem = { ...partner.partner, participacoes_count: 2, participacoes: [partner, secondPartner].map(item => ({ ...item.participation, empresa: item.company })) }
const obra = { ...work, release, municipio: municipality.descricao, codigo_municipio: municipality.codigo, geolocation: geo }
const pendingWork = { ...obra, id: 43, geolocation: { ...geo, status: 'not_requested', precision: null, latitude: null, longitude: null, source: null } }
const contextB2B = { catalog_version: null, segmentos: [], cnaes: [], atividade_escopo: null }
const coverage = { results_total: 2, points_total: 1, without_coordinates_total: 1, returned_points: 1, limit: 2000, maximum_limit: 5000, truncated: false, points_match_results: true }
const polygon = (codarea: string) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { codarea }, geometry: { type: 'Polygon', coordinates: [[[-45, -21], [-43, -21], [-43, -19], [-45, -19], [-45, -21]]] } }] })
// A local one-pixel tile avoids external downloads. Tile-provider availability is outside this suite.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64')

export interface BrowserEvidence {
  requests: Array<{ method: string; path: string; params: Record<string, string> }>
  unexpected: string[]
  errors: string[]
  failPartnerMap: boolean
  cnaeChanged: boolean
  mapState: 'normal' | 'empty' | 'unavailable' | 'truncated'
}

export const test = base.extend<{ evidence: BrowserEvidence }>({
  evidence: [async ({ context, page }, use, testInfo) => {
    const evidence: BrowserEvidence = { requests: [], unexpected: [], errors: [], failPartnerMap: false, cnaeChanged: false, mapState: 'normal' }
    page.on('pageerror', error => evidence.errors.push(error.message))
    page.on('response', response => {
      const url = new URL(response.url())
      const expectedFailure = evidence.failPartnerMap && url.origin === 'http://127.0.0.1:9'
        && url.pathname === '/api/v1/receita-federal/cnpj/socios/mapa/' && response.status() === 503
      const expectedConflict = evidence.cnaeChanged && url.origin === 'http://127.0.0.1:9' && url.pathname === '/api/v1/ibge/cnae/nos/' && response.status() === 409
      if (response.status() >= 400 && !expectedFailure && !expectedConflict) evidence.errors.push(`HTTP ${response.status()} ${url.origin}${url.pathname}`)
    })
    // Browser resource-error messages are checked through response statuses above.
    page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) evidence.errors.push(message.text()) })
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url())
      const json = (body: unknown, status = 200) => route.fulfill({ status, json: body, headers: { 'access-control-allow-origin': '*' } })
      // Existing detail pages issue read-only judicial searches using POST. Only these
      // two exact fixture routes are allowed; geolocation and other writes stay blocked.
      if (url.origin === 'http://127.0.0.1:9' && request.method() === 'POST' && /^\/api\/v1\/judicial\/tjmg\/processes\/by-(document|party-name)\/$/.test(url.pathname)) {
        evidence.requests.push({ method: 'POST', path: url.pathname, params: {} })
        return json({ source_total: 0, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] })
      }
      if (request.method() !== 'GET') {
        evidence.unexpected.push(`${request.method()} ${url.pathname}`)
        return json({ detail: 'Writes are blocked by browser tests.' }, 405)
      }
      if (url.origin === 'http://127.0.0.1:45177') return route.continue()
      if (/^[abc]\.tile\.openstreetmap\.org$/.test(url.hostname)) return route.fulfill({ contentType: 'image/png', body: tile })
      if (url.hostname === 'servicodados.ibge.gov.br') {
        if (url.pathname.endsWith('/estados')) return json([{ id: 31, nome: 'Minas Gerais', sigla: 'MG' }])
        if (url.pathname.includes('/malhas/')) return json(polygon(url.pathname.includes('/estados/') ? '3106200' : '31'))
      }
      if (url.origin !== 'http://127.0.0.1:9') {
        evidence.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
        return json({ detail: 'Unexpected origin blocked.' }, 500)
      }
      const params = Object.fromEntries(url.searchParams)
      evidence.requests.push({ method: request.method(), path: url.pathname, params })
      if (evidence.requests.length > 30) {
        evidence.unexpected.push('API request budget exceeded (30 per test).')
        return json({ detail: 'Request budget exceeded.' }, 429)
      }
      const prefix = '/api/v1/receita-federal/'
      const filters = Object.fromEntries([...url.searchParams].filter(([key]) => !['page', 'page_size', 'include_total', 'limit'].includes(key)))
      const pageNumber = Number(params.page ?? 1)
      if (url.pathname === '/api/v1/ibge/cnae/catalogo/') return json({ ...cnaeCatalog, publication_id: evidence.cnaeChanged ? 'b'.repeat(64) : publication })
      if (url.pathname === '/api/v1/ibge/cnae/nos/') {
        if (evidence.cnaeChanged && params.publication_id === publication) return json({ code: 'publication_mismatch', detail: 'Publicação substituída no teste.' }, 409)
        return json(cnaePage([cnaeNode], { next: `/api/v1/ibge/cnae/nos/?nivel=subclasse&page=2&publication_id=${publication}` }))
      }
      const activeRelease = evidence.mapState === 'unavailable' ? null : release
      const stateCoverage = evidence.mapState === 'empty' || evidence.mapState === 'unavailable'
        ? { ...coverage, results_total: 0, points_total: 0, without_coordinates_total: 0, returned_points: 0 }
        : evidence.mapState === 'truncated' ? { ...coverage, limit: 1, truncated: true, points_total: 2, without_coordinates_total: 0 } : coverage
      switch (url.pathname) {
        case `${prefix}cnpj/dominios/municipios/`: return json(fastPage([municipality]))
        case `${prefix}cnpj/dominios/cnaes/`: return json(fastPage([{ codigo: '0010100', descricao: 'Literal Receita' }]))
        case `${prefix}cnpj/estabelecimentos/00123456000100/`: return json({ ...establishment, empresa: partner.company, cnpj_ordem: '0001', cnpj_dv: '00', cnaes_secundarios: [], socios: [], geolocation: geo })
        case `${prefix}cnpj/socios/participacoes/7/`: return json({ release, participation: { ...partner.participation, ...partner.partner, empresa: partner.company } })
        case `${prefix}cnpj/segmentos/`: return json({ catalog_version: 'test-v1', classification_version: 'CNAE-Subclasses 2.3', reviewed_at: '2026-10-06', source: 'fixture', secondary_available: false, segments: [] })
        case `${prefix}cnpj/busca/`: return json(fastPage([business], pageNumber))
        case `${prefix}cnpj/socios/`: return json(fastPage([grouped], pageNumber))
        case `${prefix}cnpj/estabelecimentos/mapa/`: return json({ release: activeRelease, identity: { record: 'establishment', key: 'cnpj' }, filters, b2b_context: contextB2B, territories: [municipality], coverage: stateCoverage, points: stateCoverage.returned_points ? [point] : [] })
        case `${prefix}cnpj/estabelecimentos/mapa/resultados/`: return json({ ...fastPage(stateCoverage.results_total ? [establishment, { ...establishment, id: 10, cnpj: '00123456000200' }] : [], pageNumber), release: activeRelease, filters, b2b_context: contextB2B })
        case `${prefix}cnpj/socios/mapa/`:
          if (evidence.failPartnerMap) return json({ detail: 'Mapa indisponível no teste.' }, 503)
          return json({ release, identity: { record: 'participation_establishment', key: ['release', 'participation_id', 'establishment_id', 'cnpj'] }, filters, territories: [municipality], coverage: { ...coverage, results_total: 2, points_total: 2, without_coordinates_total: 0, returned_points: 2, unit: 'participation_establishment' }, points: [partner, secondPartner] })
        case `${prefix}cnpj/socios/mapa/resultados/`: return json({ ...fastPage([partner, secondPartner], pageNumber, pageNumber === 1), release, filters })
        case `${prefix}cno/municipios/`: return json(fastPage([{ nome: municipality.descricao, uf: 'MG', codigo_tom: municipality.codigo, codigo_ibge: municipality.codigo_ibge }]))
        case `${prefix}cno/obras/`: return json(fastPage([obra, pendingWork], pageNumber))
        case `${prefix}cno/obras/mapa/`: return json({ release, source_file_id: 17, filters, coverage, points: [{ ...obra, source_file_id: 17 }] })
        case `${prefix}cno/obras/41/`: return json({ ...detail, ...obra, areas: fastPage(), cnaes: fastPage(), vinculos: fastPage(), obras_vinculadas: fastPage() })
      }
      evidence.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
      return json({ detail: 'Unexpected request blocked.' }, 500)
    })
    await use(evidence)
    await testInfo.attach('browser-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
    expect(evidence.unexpected, 'No writes or unhandled external requests').toEqual([])
    expect(evidence.errors, 'No JavaScript or React errors').toEqual([])
  }, { auto: true }],
})
export { expect }
