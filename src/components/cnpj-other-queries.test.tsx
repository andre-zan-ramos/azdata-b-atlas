import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CnpjOtherQueries } from './cnpj-other-queries'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('Demais consultas', () => {
  it('keeps successful controls mounted when closed and separates applied values from pending edits', () => {
    const search = new URLSearchParams('cnaes=0010100&atividade_escopo=principal&inicio_atividade_de=2025-01-01&porte=03')
    const client = new QueryClient()
    client.setQueryData(['cnpj', 'cnae-label', '0010100'], { codigo: '0010100', descricao: 'Descrição Receita' })
    const view = render(<form><CnpjOtherQueries search={search} dirty blocked={false}><input name="porte" defaultValue="01" /></CnpjOtherQueries></form>, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    const details = view.container.querySelector('details')!
    expect(details.open).toBe(false)
    fireEvent.click(details.querySelector('summary')!)
    details.open = false
    expect(new FormData(view.container.querySelector('form')!).get('porte')).toBe('01')
    expect(screen.getByLabelText('Resumo dos filtros aplicados')).toHaveTextContent('Porte: 03')
    expect(screen.getByLabelText('Resumo dos filtros aplicados')).toHaveTextContent('0010100')
    expect(screen.getByLabelText('Resumo dos filtros aplicados')).toHaveTextContent('Descrição Receita')
    expect(screen.getByLabelText('Resumo dos filtros aplicados')).toHaveTextContent('01/01/2025')
    expect(screen.getByRole('status')).toHaveTextContent('Alterações ainda não aplicadas.')
    view.rerender(<form><CnpjOtherQueries search={search} dirty={false} blocked><input name="porte" defaultValue="01" /></CnpjOtherQueries></form>)
    expect(screen.getByLabelText('Resumo dos filtros aplicados')).toHaveTextContent('Nenhum recorte aplicado')
    expect(screen.getByRole('status')).toHaveTextContent('Sem alterações pendentes')
  })
})
