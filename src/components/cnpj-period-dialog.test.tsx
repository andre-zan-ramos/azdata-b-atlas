import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import { CnpjB2BFilters } from './cnpj-b2b-filters'
vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { segments: vi.fn().mockResolvedValue({ secondary_available: false }) } }))

it('edits inline dates only in the draft and retains activity codes and scope', () => {
  const changed = vi.fn(), submit = vi.fn(event => event.preventDefault())
  const { container } = render(<Providers><form onSubmit={submit}><CnpjB2BFilters search={new URLSearchParams('uf=MG&cnaes=0010100&atividade_escopo=principal&inicio_atividade_de=2025-01-01')} onDraftChange={changed} /></form></Providers>)
  fireEvent.change(screen.getByLabelText('Início de atividade: de'), { target: { value: '2025-02-01' } })
  const values = new FormData(container.querySelector('form')!)
  expect(values.get('inicio_atividade_de')).toBe('2025-02-01')
  expect(values.get('cnaes')).toBe('0010100')
  expect(values.get('atividade_escopo')).toBe('principal')
  expect(changed).toHaveBeenCalledTimes(1)
  expect(submit).not.toHaveBeenCalled()
})
