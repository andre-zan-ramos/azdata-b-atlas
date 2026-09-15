import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { judicialApi } from '../api/judicial/client'
import { Providers } from '../app/providers'
import { JudicialProcessSearchPage } from './judicial-process-search-page'

vi.mock('../api/judicial/client', () => ({ judicialApi: { byPartyName: vi.fn() } }))
const searchMock = vi.mocked(judicialApi.byPartyName)

describe('judicial process search page', () => {
  beforeEach(() => { vi.clearAllMocks(); searchMock.mockResolvedValue({ source_total: 0, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 0, duplicates_removed: 0, results: [] }) })
  it('consulta pelo nome somente após envio explícito', async () => {
    render(<Providers><JudicialProcessSearchPage /></Providers>)
    const input = screen.getByLabelText('Nome da pessoa')
    await userEvent.type(input, '  Maria   da Silva  ')
    expect(searchMock).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))
    expect(await screen.findByText('Nenhum processo encontrado')).toBeInTheDocument()
    expect(searchMock).toHaveBeenCalledWith('Maria da Silva', { page: 1, page_size: 10 }, expect.any(AbortSignal))
  })
})
