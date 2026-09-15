import type { AxiosInstance } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createJudicialApi } from './client'

const page = { source_total: 0, page: 1, page_size: 10 as const, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] }

describe('judicial api', () => {
  it('envia documento e nome somente no corpo dos endpoints próprios', async () => {
    const post = vi.fn().mockResolvedValue({ data: page })
    const api = createJudicialApi({ post } as unknown as AxiosInstance)
    await api.byDocument('07434241000198', { page: 2, page_size: 20 })
    await api.byPartyName('NOME PRIVADO', { page: 1, page_size: 10 })
    expect(post).toHaveBeenNthCalledWith(1, 'api/v1/judicial/tjmg/processes/by-document/', { document: '07434241000198', page: 2, page_size: 20 }, { signal: undefined })
    expect(post).toHaveBeenNthCalledWith(2, 'api/v1/judicial/tjmg/processes/by-party-name/', { party_name: 'NOME PRIVADO', page: 1, page_size: 10 }, { signal: undefined })
  })
})
