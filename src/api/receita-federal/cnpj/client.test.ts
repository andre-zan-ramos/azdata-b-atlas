import axios, { type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createCnpjApi, serializeParams } from './client'
import { adaptPage, pageFromSearch } from './pagination'

describe('contrato CNPJ', () => {
  it('consulta mapa, lista e participação separadamente sem cascata nem páginas no mapa', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { points: [], results: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    const controller = new AbortController()
    await api.partnerMap({ uf: 'MG' }, controller.signal)
    await api.partnerMapResults({ uf: 'MG', page: 3, page_size: 10, release: '2026-08' }, controller.signal)
    await api.partnerParticipation(17, '2026-08', controller.signal)
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['api/v1/receita-federal/cnpj/socios/mapa/', 'api/v1/receita-federal/cnpj/socios/mapa/resultados/', 'api/v1/receita-federal/cnpj/socios/participacoes/17/'])
    expect(String(adapter.mock.calls[0][0].params)).toBe('uf=MG')
    expect(String(adapter.mock.calls[1][0].params)).toBe('uf=MG&page=3&page_size=10&release=2026-08')
    expect(String(adapter.mock.calls[2][0].params)).toBe('release=2026-08')
    expect(adapter.mock.calls.every(([config]) => config.signal === controller.signal && config.method === 'get')).toBe(true)
  })
  it('serializa somente parâmetros definidos e preserva zeros à esquerda', () => {
    expect(serializeParams({ cnpj_basico: '00123456', nome: '', page: 1 }).toString()).toBe('cnpj_basico=00123456&page=1')
  })
  it('serializa todos os parâmetros da busca unificada sem enviar vazios', () => {
    expect(serializeParams({ q:'atlas',page:2,page_size:25,include_total:false,uf:'MG',municipio:'4123',cnae:'6201501',situacao_cadastral:'2',matriz_filial:'1',porte:'03',natureza_juridica:'2062',ignorado:'' }).toString()).toBe('q=atlas&page=2&page_size=25&include_total=false&uf=MG&municipio=4123&cnae=6201501&situacao_cadastral=2&matriz_filial=1&porte=03&natureza_juridica=2062')
  })
  it.each(['contendo', 'inicio', 'fim', 'exato'] as const)('serializa q_modo=%s no cliente', mode => {
    expect(serializeParams({ q: 'atlas', q_modo: mode }).toString()).toBe(`q=atlas&q_modo=${mode}`)
  })
  it('usa prefixo e barras finais nos endpoints', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    await api.establishments({}); await api.establishmentMap({uf:'MG'}); await api.establishment('00123456000199'); await api.companies({}); await api.company('00123456'); await api.cnaes({}); await api.municipalities({})
    expect(adapter.mock.calls.map(call => call[0].url)).toEqual([
      'api/v1/receita-federal/cnpj/estabelecimentos/', 'api/v1/receita-federal/cnpj/estabelecimentos/mapa/', 'api/v1/receita-federal/cnpj/estabelecimentos/00123456000199/',
      'api/v1/receita-federal/cnpj/empresas/', 'api/v1/receita-federal/cnpj/empresas/00123456/',
      'api/v1/receita-federal/cnpj/dominios/cnaes/', 'api/v1/receita-federal/cnpj/dominios/municipios/',
    ])
  })
  it('propaga AbortSignal e não envia paginação à consulta cartográfica', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { points: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const controller = new AbortController()
    await createCnpjApi(axios.create({ adapter })).establishmentMap({ uf: 'MG', municipio: '4123' }, controller.signal)
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)
    expect(String(adapter.mock.calls[0][0].params)).toBe('uf=MG&municipio=4123')
  })
  it('usa os endpoints unificados, a faceta e os domínios oficiais', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { count:0,next:null,previous:null,results:[] }, status:200, statusText:'OK', headers:{}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    await api.search({q:'cedov'}); await api.partners({q:'maria'}); await api.locationFacets({q:'cedov'}); await api.registrationStatuses({}); await api.headquartersBranches({}); await api.companySizes({}); await api.legalNatures({descricao:'sociedade'})
    expect(adapter.mock.calls.map(call => call[0].url)).toEqual([
      'api/v1/receita-federal/cnpj/busca/', 'api/v1/receita-federal/cnpj/socios/', 'api/v1/receita-federal/cnpj/busca/facetas/localidades/',
      'api/v1/receita-federal/cnpj/dominios/situacoes-cadastrais/', 'api/v1/receita-federal/cnpj/dominios/matriz-filial/',
      'api/v1/receita-federal/cnpj/dominios/portes/', 'api/v1/receita-federal/cnpj/dominios/naturezas-juridicas/',
    ])
  })
  it('envia somente os parâmetros definidos e propaga o AbortSignal em socios', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    const controller = new AbortController()
    await api.partners({ q: 'maria', q_modo: 'fim', page: 2, page_size: 25, include_total: undefined }, controller.signal)
    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)
    expect(String(adapter.mock.calls[0][0].params)).toBe('q=maria&q_modo=fim&page=2&page_size=25&agrupar=true')
  })
  it('solicita geolocalização pela rota correta, com corpo vazio, CNPJ literal e AbortSignal', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { status: 'pending' }, status: 202, statusText: 'Accepted', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    const controller = new AbortController()
    await api.requestEstablishmentGeolocation('00123456000199', controller.signal)
    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0][0]).toMatchObject({ method: 'post', url: 'api/v1/receita-federal/cnpj/estabelecimentos/00123456000199/geolocation/request/', signal: controller.signal })
    expect(adapter.mock.calls[0][0].data).toBeUndefined()
  })
  it.each([400, 404, 409, 429, 503])('preserva o envelope normalizado em HTTP %s', async status => {
    const envelope = { status: status === 503 ? 'temporary_error' : 'unavailable', reason: 'producer_unavailable', precision: null, latitude: null, longitude: null, source: null, observed_at: null, stale: false }
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: envelope, status, statusText: 'Controlled', headers: {}, config }))
    await expect(createCnpjApi(axios.create({ adapter })).requestEstablishmentGeolocation('00123456000199')).resolves.toEqual(envelope)
  })
  it.each(['00123456', '00123456000199'])('mantém a busca de CNPJ %s sem inventar parâmetros', async q => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    await api.search({ q })
    expect(String(adapter.mock.calls[0][0].params)).toBe(`q=${q}`)
  })
  it('adapta paginação com e sem contagem', () => {
    expect(adaptPage({ count:null,next:'x',previous:null,page:2,page_size:10,has_next:true,has_previous:true,results:[] },2,10)).toMatchObject({count:null,page:2,hasNext:true})
    expect(adaptPage({ count:31,next:'x',previous:'x',results:[] },2,25)).toMatchObject({count:31,page:2,pageSize:25,hasPrevious:true})
    expect(pageFromSearch('3')).toBe(3)
    expect(pageFromSearch('-1')).toBe(1)
    expect(pageFromSearch('inválida')).toBe(1)
  })
})
