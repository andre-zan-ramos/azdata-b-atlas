import axios, { type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createPortalTransparenciaApi } from './client'

describe('cliente do Portal da Transparência via AzData API', () => {
  it('usa apenas as três rotas da AzData, preserva parâmetros e propaga AbortSignal', async () => {
    const adapter = vi.fn<AxiosAdapter>(async config => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }))
    const api = createPortalTransparenciaApi(axios.create({ adapter }))
    const controller = new AbortController()

    await api.person('00123456000199', controller.signal)
    await api.resources('00123456000199', { quantidade: '3' }, controller.signal)
    await api.resources('00123456000199', { mes_ano_inicio: '01/2025', mes_ano_fim: '02/2025', pagina: 3, quantidade: 'todos' }, controller.signal)
    await api.contracts('00123456000199', 4, controller.signal)

    expect(adapter.mock.calls.map(call => call[0].url)).toEqual([
      'api/v1/portal-transparencia/pessoas-juridicas/00123456000199/',
      'api/v1/portal-transparencia/pessoas-juridicas/00123456000199/recursos-recebidos/',
      'api/v1/portal-transparencia/pessoas-juridicas/00123456000199/recursos-recebidos/',
      'api/v1/portal-transparencia/pessoas-juridicas/00123456000199/contratos/',
    ])
    expect(String(adapter.mock.calls[1][0].params)).toBe('quantidade=3')
    expect(String(adapter.mock.calls[2][0].params)).toBe('mes_ano_inicio=01%2F2025&mes_ano_fim=02%2F2025&pagina=3&quantidade=todos')
    expect(String(adapter.mock.calls[3][0].params)).toBe('pagina=4')
    expect(adapter.mock.calls.every(call => call[0].signal === controller.signal)).toBe(true)
  })
})
