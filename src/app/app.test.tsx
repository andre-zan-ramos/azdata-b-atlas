import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from './app'
import { Providers } from './providers'

describe('navegação', () => {
  it('abre a página inicial sem configurar ou consultar uma API', () => {
    render(<Providers><MemoryRouter><App /></MemoryRouter></Providers>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Um novo olhar')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })

  it('exibe 404 em acesso direto e permite retornar ao início', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/endereco-inexistente']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Página não encontrada')
    await user.click(screen.getByRole('link', { name: 'Voltar ao início' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Um novo olhar')
  })
})
