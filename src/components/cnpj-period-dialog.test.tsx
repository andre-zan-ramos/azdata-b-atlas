import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import { CnpjB2BFilters } from './cnpj-b2b-filters'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { segments: vi.fn().mockResolvedValue({ secondary_available: false }) } }))
it('isolates edits, cancellation and clear; confirmation changes only temporal draft form values', async () => {
  const user = userEvent.setup(), changed = vi.fn(), submit = vi.fn(event => event.preventDefault())
  const { container } = render(<Providers><form onSubmit={submit}><CnpjB2BFilters search={new URLSearchParams('uf=MG&cnaes=0010100&atividade_escopo=principal&inicio_atividade_de=2025-01-01')} onDraftChange={changed} /></form></Providers>)
  const trigger = screen.getByRole('button', { name: 'Definir período' })
  const values = () => new FormData(container.querySelector('form')!)
  await user.click(trigger)
  let dialog = within(screen.getByRole('dialog'))
  const start = dialog.getByLabelText('Início de atividade: de')
  await user.clear(start); await user.type(start, '2025-02-29{Enter}')
  expect(submit).not.toHaveBeenCalled()
  await user.click(dialog.getByRole('button', { name: 'Confirmar' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('datas válidas')
  expect(start).toHaveValue('2025-02-29')
  expect(changed).not.toHaveBeenCalled()
  await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
  expect(values().get('inicio_atividade_de')).toBe('2025-01-01')
  await user.click(trigger)
  dialog = within(screen.getByRole('dialog'))
  await user.click(dialog.getByRole('button', { name: 'Limpar' }))
  await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
  expect(values().get('inicio_atividade_de')).toBe('2025-01-01')
  await user.click(trigger)
  dialog = within(screen.getByRole('dialog'))
  await user.click(dialog.getByRole('button', { name: 'Limpar' }))
  await user.click(dialog.getByRole('button', { name: 'Confirmar' }))
  expect(values().get('inicio_atividade_de')).toBe('')
  expect(values().get('cnaes')).toBe('0010100')
  expect(values().get('atividade_escopo')).toBe('principal')
  expect(changed).toHaveBeenCalledTimes(1)
  expect(submit).not.toHaveBeenCalled()
  expect(cnpjApi.segments).toHaveBeenCalledTimes(1)
})
