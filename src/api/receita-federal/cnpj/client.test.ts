import axios, { type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createCnpjApi, serializeParams } from './client'
import { adaptPage } from './pagination'

describe('contrato CNPJ', () => {
  it('serializa somente parâmetros definidos e preserva zeros à esquerda', () => {
    expect(serializeParams({ cnpj_basico: '00123456', nome: '', page: 1 }).toString()).toBe('cnpj_basico=00123456&page=1')
  })
  it('usa prefixo e barras finais nos seis endpoints', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: { results: [] }, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createCnpjApi(axios.create({ adapter }))
    await api.establishments({}); await api.establishment('00123456000199'); await api.companies({}); await api.company('00123456'); await api.cnaes({}); await api.municipalities({})
    expect(adapter.mock.calls.map(call => call[0].url)).toEqual([
      'api/v1/receita-federal/cnpj/estabelecimentos/', 'api/v1/receita-federal/cnpj/estabelecimentos/00123456000199/',
      'api/v1/receita-federal/cnpj/empresas/', 'api/v1/receita-federal/cnpj/empresas/00123456/',
      'api/v1/receita-federal/cnpj/dominios/cnaes/', 'api/v1/receita-federal/cnpj/dominios/municipios/',
    ])
  })
  it('adapta paginação com e sem contagem', () => {
    expect(adaptPage({ count:null,next:'x',previous:null,page:2,page_size:10,has_next:true,has_previous:true,results:[] },2,10)).toMatchObject({count:null,page:2,hasNext:true})
    expect(adaptPage({ count:31,next:'x',previous:'x',results:[] },2,25)).toMatchObject({count:31,page:2,pageSize:25,hasPrevious:true})
  })
})
