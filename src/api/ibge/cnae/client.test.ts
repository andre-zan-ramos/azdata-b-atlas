import axios, { AxiosError, CanceledError, type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../client'
import { createCnaeApi, cnaeParams } from './client'
import { cnaeCatalog, cnaeCorrespondence, cnaeDetail, cnaeNode, cnaePage, cnaeRelationship, publication } from '../../../test/cnae-fixtures'

describe('cliente CNAE oficial', () => {
  it('usa os cinco GETs, os parâmetros literais e AbortSignal', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: cnaeCatalog, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnaeApi(axios.create({ adapter })), signal = new AbortController().signal
    await api.catalog({}, signal); await api.nodes({ nivel: 'subclasse', codigo: '0010100', publication_id: publication }, signal)
    await api.node('subclasse', '0010100', { publication_id: publication }, signal)
    await api.relationships({ pai_nivel: 'classe', pai_codigo: '99999', source_row: 7 }, signal)
    await api.correspondences({ target_code: '', target_code_state: 'empty', source_member: '  fonte  ', source_row: 7 }, signal)
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['catalogo/', 'nos/', 'nos/subclasse/0010100/', 'relacoes/', 'correspondencias/'].map(path => `api/v1/ibge/cnae/${path}`))
    expect(adapter.mock.calls.every(([config]) => config.signal === signal && config.method === 'get')).toBe(true)
    expect(String(adapter.mock.calls[4][0].params)).toBe('target_code=&target_code_state=empty&source_member=++fonte++&source_row=7')
    expect(cnaeParams({ codigos: '0010100,0010100', source_code: '', source_code_state: 'null', source_sheet: ' ', omitted: undefined }).get('codigos')).toBe('0010100,0010100')
  })
  it.each([cnaeCatalog, cnaeDetail, cnaePage([cnaeNode]), cnaePage([cnaeRelationship, cnaeRelationship]), cnaePage([cnaeCorrespondence, { ...cnaeCorrespondence, ordinal: 1 }])])('preserva JSONs, ocorrências, NULL, espaços e vazios sem transformação', async response => {
    const adapter: AxiosAdapter = async config => ({ data: response, status: 200, statusText: 'OK', headers: {}, config })
    expect(await createCnaeApi(axios.create({ adapter })).catalog()).toEqual(response)
  })
  it('segue integralmente links com publicação esperada na origem AzData', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: cnaePage([]), status: 200, statusText: 'OK', headers: {}, config }))
    const client = createApiClient('https://azdata.example.test'); client.defaults.adapter = adapter
    const signal = new AbortController().signal
    const query = `target_code=&target_code_state=empty&source_sheet=++A++&page=2&page_size=25&publication_id=${publication}`
    await createCnaeApi(client).follow(`https://link-origin.example.test/api/v1/ibge/cnae/correspondencias/?${query}`, publication, signal)
    expect(adapter.mock.calls[0][0]).toMatchObject({ baseURL: 'https://azdata.example.test/', url: `api/v1/ibge/cnae/correspondencias/?${query}`, signal })
  })
  it.each(['/api/v1/receita-federal/cnpj/estabelecimentos/', '/api/v1/ibge/cnae/nos/?page=2', `/api/v1/ibge/cnae/nos/?publication_id=${'b'.repeat(64)}`, `/api/v1/ibge/cnae/nos/?publication_id=${publication}&publication_id=${publication}`])('bloqueia link incompatível: %s', async link => {
    const adapter = vi.fn<AxiosAdapter>()
    await expect(createCnaeApi(axios.create({ adapter })).follow(link, publication)).rejects.toMatchObject({ status: 400 })
    expect(adapter).not.toHaveBeenCalled()
  })
  it('rejeita envelope de outra publicação mesmo em 200', async () => {
    const adapter: AxiosAdapter = async config => ({ data: { ...cnaeCatalog, publication_id: 'b'.repeat(64) }, status: 200, statusText: 'OK', headers: {}, config })
    await expect(createCnaeApi(axios.create({ adapter })).nodes({ publication_id: publication })).rejects.toMatchObject({ status: 409, code: 'publication_mismatch' })
  })
  it.each([400, 404, 409, 503, 405])('preserva detail e code no erro HTTP %s, sem tratá-los como campos', async status => {
    const client = createApiClient('https://azdata.example.test')
    client.defaults.adapter = async config => { throw new AxiosError('HTTP error', 'ERR_BAD_RESPONSE', config, undefined, { config, status, statusText: 'Error', headers: {}, data: status === 405 ? { detail: 'Method not allowed.' } : { code: 'catalog_correspondence_invalid', detail: 'Mensagem literal da API.' } }) }
    await expect(createCnaeApi(client).catalog()).rejects.toMatchObject({ status, message: status === 405 ? 'Method not allowed.' : 'Mensagem literal da API.', fields: {}, code: status === 405 ? undefined : 'catalog_correspondence_invalid' })
  })
  it('preserva cancelamento sem converter em erro de catálogo', async () => {
    const client = createApiClient('https://azdata.example.test')
    client.defaults.adapter = async () => { throw new CanceledError('Cancelado') }
    await expect(createCnaeApi(client).nodes({})).rejects.toBeInstanceOf(CanceledError)
  })
})
