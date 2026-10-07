import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { Providers } from '../app/providers'
import { applyB2BForm, CnpjB2BFilters } from './cnpj-b2b-filters'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { segments: vi.fn() } }))
beforeEach(() => {
  vi.mocked(cnpjApi.segments).mockResolvedValue({ catalog_version: 'b2b-v1', classification_version: 'CNAE-Subclasses 2.3', reviewed_at: '2026-10-05', source: 'official', secondary_available: false, segments: [
    { id: 'restaurantes', label: 'Restaurantes', codes: ['5611201'], scope: 'Restaurantes e similares.', activities: [{ codigo: '5611201', descricao: 'Restaurantes e similares' }] },
    { id: 'academias', label: 'Academias', codes: ['9313100'], scope: 'Condicionamento físico.', activities: [{ codigo: '9313100', descricao: 'Atividades de condicionamento físico' }] },
  ] })
})

it('aplica múltiplos segmentos e os dois intervalos apenas ao enviar o formulário', async () => {
  const user = userEvent.setup(), applied = vi.fn()
  render(<Providers><form onSubmit={event => { event.preventDefault(); const next = new URLSearchParams('cnae=0000000&page=3'); applyB2BForm(new FormData(event.currentTarget), next); applied(next) }}><CnpjB2BFilters search={new URLSearchParams('inicio_atividade_de=2026-01-01&inicio_atividade_ate=2026-01-31&situacao_evento_de=2026-02-01&situacao_evento_ate=2026-02-28')} /><button>Aplicar</button></form></Providers>)
  await user.click(await screen.findByRole('checkbox', { name: 'Restaurantes' }))
  await user.click(screen.getByRole('checkbox', { name: 'Academias' }))
  expect(applied).not.toHaveBeenCalled()
  expect(screen.getByRole('option', { name: 'Principal ou secundárias' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Aplicar' }))
  const next = applied.mock.calls[0][0] as URLSearchParams
  expect(next.get('segmentos')).toBe('academias,restaurantes')
  expect(next.get('catalog_version')).toBe('b2b-v1')
  expect(next.get('atividade_escopo')).toBe('principal')
  expect(next.has('cnae')).toBe(true)
  expect(next.get('inicio_atividade_ate')).toBe('2026-01-31')
  expect(next.get('situacao_evento_ate')).toBe('2026-02-28')
  expect(next.has('situacao_cadastral')).toBe(false)
})

it('preserva seleção desconhecida para erro explícito e permite removê-la', async () => {
  const user = userEvent.setup()
  render(<Providers><CnpjB2BFilters search={new URLSearchParams('segmentos=desconhecido&catalog_version=old')} /></Providers>)
  const unknown = await screen.findByRole('checkbox', { name: 'Segmento indisponível: desconhecido' })
  expect(unknown).toBeChecked()
  await user.click(unknown)
  expect(unknown).not.toBeChecked()
})
