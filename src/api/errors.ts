import axios from 'axios'

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string, public readonly fields?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
  }
}

export function normalizeApiError(error: unknown): Error {
  if (axios.isCancel(error) || error instanceof ApiError) return error
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error('Falha inesperada.')
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('A consulta excedeu o tempo de espera. Tente novamente.', undefined, 'timeout')
  }

  const status = error.response?.status
  const data: unknown = error.response?.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const body = data as Record<string, unknown>
    const detail = [body.detalhe, body.detail, body.message].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )
    const code = typeof body.codigo === 'string' ? body.codigo : undefined
    const fields = Object.fromEntries(Object.entries(body).flatMap(([key, value]) => {
      if (['detalhe', 'detail', 'message', 'codigo'].includes(key)) return []
      const messages = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : []
      return messages.length ? [[key, messages]] : []
    }))
    if (detail || Object.keys(fields).length) return new ApiError(detail ?? 'Revise os campos informados.', status, code, fields)
  }
  const message = status === undefined
    ? 'Não foi possível acessar a API. Verifique sua conexão.'
    : status === 404
      ? 'Recurso não encontrado.'
      : status === 429
        ? 'Muitas consultas. Tente novamente em instantes.'
        : 'Não foi possível concluir a consulta.'
  return new ApiError(message, status, status === undefined ? 'network_error' : undefined)
}
