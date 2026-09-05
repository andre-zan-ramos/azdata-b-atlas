import { AxiosError, CanceledError, type AxiosAdapter } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../app/providers'
import { createApiClient } from './client'

const success: AxiosAdapter = async (config) => ({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config })

describe('infraestrutura de API', () => {
  it('aplica URL base e encaminha o signal ao transporte', async () => {
    const client = createApiClient('https://api.example.test/v1')
    const controller = new AbortController()
    const adapter = vi.fn(success)
    await client.get('example', { adapter, signal: controller.signal })
    expect(adapter.mock.calls[0][0]).toMatchObject({ baseURL: 'https://api.example.test/v1/', signal: controller.signal })
  })

  it.each([undefined, 'invalid', 'ftp://api.example.test'])('bloqueia configuração inválida antes do transporte: %s', async (url) => {
    const adapter = vi.fn(success)
    await expect(createApiClient(url).get('example', { adapter })).rejects.toThrow(/VITE_API_BASE_URL/)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('preserva status e mensagem de uma falha HTTP', async () => {
    const adapter: AxiosAdapter = async (config) => {
      throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, {
        data: { detalhe: 'Parâmetro inválido.', codigo: 'invalid_parameter' },
        status: 400, statusText: 'Bad Request', headers: {}, config,
      })
    }
    await expect(createApiClient('https://api.example.test').get('example', { adapter })).rejects.toMatchObject({
      name: 'ApiError', status: 400, message: 'Parâmetro inválido.', code: 'invalid_parameter',
    })
  })

  it('cancela uma consulta em andamento pelo TanStack Query', async () => {
    const api = createApiClient('https://api.example.test')
    const queries = createQueryClient()
    let receivedSignal: AbortSignal | undefined
    const adapter: AxiosAdapter = (config) => new Promise((_resolve, reject) => {
      receivedSignal = config.signal as AbortSignal
      receivedSignal.addEventListener('abort', () => reject(new CanceledError()), { once: true })
    })
    const pending = queries.fetchQuery({
      queryKey: ['example'],
      queryFn: ({ signal }) => api.get('example', { signal, adapter }),
    })
    const settled = pending.catch(() => undefined)
    await vi.waitFor(() => expect(receivedSignal).toBeDefined())
    await queries.cancelQueries({ queryKey: ['example'] })
    await settled
    expect(receivedSignal?.aborted).toBe(true)
    expect(queries.getQueryState(['example'])?.error).toBeNull()
    queries.clear()
  })
})
