import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App, legacyCnoLinksTarget } from './app'
import { Providers } from './providers'

describe('navegação', () => {
  it('abre a página inicial sem configurar ou consultar uma API', () => {
    render(<Providers><MemoryRouter><App /></MemoryRouter></Providers>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Um novo olhar')
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Navegação principal' }).querySelectorAll('a')).toHaveLength(4)
  })

  it('exibe 404 em acesso direto e permite retornar ao início', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/endereco-inexistente']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Página não encontrada')
    await user.click(screen.getByRole('link', { name: 'Voltar ao início' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Um novo olhar')
  })

  it('redireciona a rota antiga de vínculos para o mapa de Obras com parâmetros compatíveis', () => {
    expect(legacyCnoLinksTarget('?cno=000001&ni_responsavel=00-X&page=4&return_to=%2Freceita-federal%2Fcno')).toBe('/receita-federal/cno?modo=mapa&cno=000001&ni_responsavel=00-X&return_to=%2Freceita-federal%2Fcno')
  })
})
