import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { JudicialProcessPage } from '../api/judicial/types'
import { JudicialProcessList } from './judicial-process-list'

const data: JudicialProcessPage = {
  source_total: 2, page: 1, page_size: 10, has_next: false, has_previous: false, returned_count: 1, duplicates_removed: 1,
  results: [{
    cnj_number: '50139292720188130105', external_id: 'opaque/id', court: 'TJMG', source: 'TJMG', source_system: 'EPROC_1G', observed_source_systems: ['PJE', 'EPROC_1G'], status_raw: 'Processo Baixado', status_group: 'closed', class_name: 'PROCEDIMENTO COMUM CÍVEL', subjects: ['Defeito, nulidade ou anulação'], plaintiff_names: ['EMPRESA ATLAS LTDA'], defendant_names: ['OUTRA PARTE'], other_party_names: [], filing_date: '2018-12-18T10:00:00', court_unit: '5ª Vara Cível', district: 'Governador Valadares', claim_value: 310000, last_event: { date: '2026-06-16T10:00:00', description: 'Juntada de Petição', event: 'Evento' }, justice_type: 'Justiça Comum', legal_priority: false, confidential: false,
  }],
}

describe('judicial process list', () => {
  it('formata o processo, informa deduplicação e omite os polos dos detalhes', async () => {
    render(<JudicialProcessList data={data} onPage={vi.fn()} />)
    expect(screen.getByText('5013929-27.2018.8.13.0105')).toBeInTheDocument()
    expect(screen.getByText(/310\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/registro duplicado foi consolidado/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalhes' }))
    expect(screen.queryByText('Polo ativo')).not.toBeInTheDocument()
    expect(screen.queryByText('Polo passivo')).not.toBeInTheDocument()
    expect(screen.queryByText('EMPRESA ATLAS LTDA')).not.toBeInTheDocument()
    expect(screen.getByText('PJE → EPROC_1G')).toBeInTheDocument()
  })

  it('cria o deep link oficial sem utm e não oferece documentos fora do PJE', () => {
    render(<JudicialProcessList data={data} onPage={vi.fn()} />)
    const link = screen.getByRole('link', { name: /Ver no TJMG/ })
    const url = new URL(link.getAttribute('href')!)
    expect(link).toHaveAttribute('target', '_blank')
    expect(JSON.parse(url.searchParams.get('q')!)).toEqual({ numeroProcesso: ['5013929-27.2018.8.13.0105'], page: 0, exclude: {} })
    expect(JSON.parse(url.searchParams.get('d')!)).toEqual({ processoId: 'opaque/id' })
    expect(url.searchParams.has('utm_source')).toBe(false)
    expect(screen.queryByRole('link', { name: /Documentos no TJMG/ })).not.toBeInTheDocument()
  })

  it('oferece documentos somente para processo PJE', () => {
    const pje = { ...data, results: [{ ...data.results[0], source_system: 'PJE' }] }
    render(<JudicialProcessList data={pje} onPage={vi.fn()} />)
    expect(screen.getByRole('link', { name: /Documentos no TJMG/ })).toHaveAttribute('href', 'https://visualizador-documento.tjmg.jus.br/processo/PJE/opaque%2Fid')
  })
})
