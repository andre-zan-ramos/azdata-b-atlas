import type { AxiosInstance } from 'axios'
import { apiClient } from '../client'
import type { JudicialProcessPage } from './types'

const PREFIX = 'api/v1/judicial/tjmg/processes/'
type Pagination = { page?: number; page_size?: 10 | 20 }

export function createJudicialApi(client: AxiosInstance = apiClient) {
  const post = async (path: string, data: object, signal?: AbortSignal) => (await client.post<JudicialProcessPage>(PREFIX + path, data, { signal })).data
  return {
    byDocument: (document: string, pagination: Pagination = {}, signal?: AbortSignal) => post('by-document/', { document, ...pagination }, signal),
    byPartyName: (partyName: string, pagination: Pagination = {}, signal?: AbortSignal) => post('by-party-name/', { party_name: partyName, ...pagination }, signal),
  }
}
export const judicialApi = createJudicialApi()
