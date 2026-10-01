import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useSearchParams, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AreaModeSwitcher, useAreaMode } from './area-mode-switcher'

function Modes() {
  const mode = useAreaMode()
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  return <>
    <AreaModeSwitcher mode={mode} compatibleKeys={['return_to']} />
    <output data-testid="url">{location.pathname}{location.search}</output>
    <button onClick={() => { const next = new URLSearchParams(search); next.set('uf', 'MG'); next.set('page', '2'); setSearch(next) }}>Filtrar mapa</button>
    <button onClick={() => navigate(-1)}>Anterior</button>
  </>
}

describe('modos independentes em cada área', () => {
  it.each(['/receita-federal/cnpj', '/receita-federal/cnpj/socios', '/receita-federal/cno'])('restaura busca e mapa em %s, incluindo página e retorno', async path => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={[`${path}?modo=busca&q=000001&page=3&return_to=%2Freceita-federal%2Fcnpj`]}><Modes /></MemoryRouter>)
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(screen.getByTestId('url')).not.toHaveTextContent('q=000001')
    await user.click(screen.getByRole('button', { name: 'Filtrar mapa' }))
    await user.click(screen.getByRole('link', { name: 'Busca' }))
    expect(screen.getByTestId('url')).toHaveTextContent('modo=busca&q=000001&page=3')
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(screen.getByTestId('url')).toHaveTextContent('uf=MG&page=2')
    expect(screen.getByTestId('url')).toHaveTextContent('return_to=')
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('link', { name: 'Busca' })).toHaveAttribute('aria-current', 'page')
  })
})
