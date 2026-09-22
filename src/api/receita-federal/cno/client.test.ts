import axios, { type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createCnoApi, serializeParams } from './client'
import { adaptPage, readSearch } from './navigation'

describe('contrato CNO', () => {
  it('usa allowlist por endpoint sem transformar identificadores', () => {
    expect(serializeParams('obras', { cno: '00.01', ni_responsavel: ' 000-X ', uf: '', data_inicio_obra_de: '2024-02-29', data_inicio_obra_ate: '2024-03-01', q: 'não', release: 'x', return_to: '/', page: 1, include_total: false }).toString()).toBe('cno=00.01&ni_responsavel=+000-X+&data_inicio_obra_de=2024-02-29&data_inicio_obra_ate=2024-03-01&page=1&include_total=false')
    expect(serializeParams('areas', { cno: '001', cnae: '22', ni_responsavel: 'x' }).toString()).toBe('cno=001')
    expect(serializeParams('cnaes', { cno: '001', cnae: '022', ni_responsavel: 'x' }).toString()).toBe('cno=001&cnae=022')
    expect(serializeParams('vinculos', { cno: '001', ni_responsavel: 'X', situacao: '2' }).toString()).toBe('cno=001&ni_responsavel=X')
    expect(serializeParams('municipios', { uf: 'MG', nome: 'São', cno: '001', page_size: 50 }).toString()).toBe('uf=MG&nome=S%C3%A3o&page_size=50')
  })
  it.each([{ page: 0 }, { page: 1000000000 }, { page: 1.2 }, { page_size: 20 }, { include_total: 'true' }, { cno: 123 }])('recusa parâmetros inválidos %o', params => {
    expect(() => serializeParams('obras', params)).toThrow('Revise os campos')
  })
  it.each([10, 25, 50])('aceita tamanho %s e o limite da página', page_size => {
    expect(serializeParams('obras', { page_size, page: 999999999 }).get('page_size')).toBe(String(page_size))
  })
  it('usa as seis rotas, propaga signal e nunca envia query no detalhe', async () => {
    const data = { cno: '0001', ni_responsavel: '00-X', area_total: '1.000,00', nome: '', municipio: null }
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnoApi(axios.create({ baseURL: 'https://configurada.example/', adapter }))
    const signal = new AbortController().signal
    await api.obras({ cno: '0001' }, signal); await api.areas({ cno: '0001' }, signal); await api.cnaes({ cnae: '001' }, signal); await api.vinculos({ ni_responsavel: '00-X' }, signal); await api.municipios({ uf: 'MG', nome: 'Belo' }, signal)
    expect(await api.obra('0123', signal)).toEqual(data)
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['obras/', 'areas/', 'cnaes/', 'vinculos/', 'municipios/', 'obras/0123/'].map(path => `api/v1/receita-federal/cno/${path}`))
    expect(adapter.mock.calls.every(([config]) => config.signal === signal && config.baseURL === 'https://configurada.example/')).toBe(true)
    expect(adapter.mock.calls[5][0].params).toBeUndefined()
    await expect(api.obra('../x')).rejects.toMatchObject({ status: 404 })
    expect(adapter).toHaveBeenCalledTimes(6)
  })
  it.each(['page=0', 'page=1e2', 'page=1000000000', 'page_size=20', 'page_size=', 'include_total=1', 'cno=1&cno=2', 'page=1&page=2', 'include_total=true&include_total=false'])('valida URL %s antes do HTTP', query => {
    expect(Object.keys(readSearch(new URLSearchParams(query), 'obras').errors).length).toBeGreaterThan(0)
  })
  it('não envia estado de interface nem conta automaticamente', () => {
    const result = readSearch(new URLSearchParams('cno=000-X&listar=true&return_to=/&q=nome'), 'obras')
    expect(result.params).toEqual({ cno: '000-X', page: 1, page_size: 10 })
    expect(result.active).toBe(true)
    expect(readSearch(new URLSearchParams(), 'obras').active).toBe(false)
  })
  it('adapta total desconhecido e envelope contado', () => {
    expect(adaptPage({ count: null, next: 'https://outra.example/', previous: null, page: 1, page_size: 10, has_next: true, has_previous: false, results: [] }, 1, 10)).toMatchObject({ count: null, hasNext: true })
    expect(adaptPage({ count: 30, next: null, previous: '/x', results: [] }, 2, 25)).toMatchObject({ count: 30, page: 2, pageSize: 25, hasPrevious: true })
  })
})
