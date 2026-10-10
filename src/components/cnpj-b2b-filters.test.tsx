import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { Providers } from '../app/providers'
import { applyB2BForm, CnpjB2BFilters } from './cnpj-b2b-filters'

// Real popup, remote search and keyboard behavior are covered in Chromium.
vi.mock('./cnae-multiselect', async () => {
 const { useState } = await import('react')
 const { cnpjApi: api } = await import('../api/receita-federal/cnpj/client')
 return { CnaeMultiselect: ({ items, onChange, label }: { label: string; items: { codigo: string; descricao: string }[]; onChange: (items: { codigo: string; descricao: string }[]) => void }) => {
   const [options, setOptions] = useState<{ codigo: string; descricao: string }[]>([])
   return <><input role="combobox" aria-label={label} onFocus={() => { void api.cnaes({ page: 1, page_size: 10 }).then(result => setOptions(result.results)) }} />{options.map(item => <button key={item.codigo} type="button" role="option" onClick={() => onChange([...items, item])}>{item.descricao}</button>)}</>
 } }
})

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { segments: vi.fn(), cnaes: vi.fn() } }))
beforeEach(() => {
  vi.mocked(cnpjApi.cnaes).mockResolvedValue({ count: 1, results: [{ codigo: '6201501', descricao: 'Desenvolvimento de software' }], next: null, previous: null })
  vi.mocked(cnpjApi.segments).mockResolvedValue({ catalog_version: 'b2b-v1', classification_version: 'CNAE-Subclasses 2.3', reviewed_at: '2026-10-05', source: 'official', secondary_available: false, segments: [
    { id: 'restaurantes', label: 'Restaurantes', codes: ['5611201'], scope: 'Restaurantes e similares.', activities: [{ codigo: '5611201', descricao: 'Restaurantes e similares' }] },
    { id: 'academias', label: 'Academias', codes: ['9313100'], scope: 'Condicionamento físico.', activities: [{ codigo: '9313100', descricao: 'Atividades de condicionamento físico' }] },
  ] })
})

it('uses the full Receita domain in the primary field without a second CNAE selector', async () => {
 const user = userEvent.setup(), change = vi.fn(), submit = vi.fn(event => event.preventDefault())
 render(<Providers><form onSubmit={submit}><CnpjB2BFilters search={new URLSearchParams('uf=MG')} onDraftChange={change} /></form></Providers>)
 const input = screen.getByRole('combobox', { name: 'Tipo de estabelecimento' })
 expect(cnpjApi.cnaes).not.toHaveBeenCalled()
 await user.type(input, 'software')
 await user.click(await screen.findByRole('option', { name: /Desenvolvimento de software/ }))
 await user.keyboard('{Escape}')
 expect(document.querySelector('input[name="cnaes"]')).toHaveValue('6201501')
 expect(change).toHaveBeenCalledTimes(1)
 expect(submit).not.toHaveBeenCalled()
 await user.click(screen.getByText('Demais consultas', { exact: true }))
 expect(screen.getAllByRole('combobox', { name: 'Tipo de estabelecimento' })).toHaveLength(1)
 expect(screen.queryByRole('combobox', { name: 'CNAEs específicos' })).not.toBeInTheDocument()
})

it('reviews old segment URLs on demand and confirms only the draft', async () => {
 const user = userEvent.setup(), change = vi.fn()
 render(<Providers><form><CnpjB2BFilters search={new URLSearchParams('segmentos=restaurantes&catalog_version=b2b-v1&atividade_escopo=principal')} onDraftChange={change} /></form></Providers>)
 await user.click(screen.getByRole('button', {name:/Resolver segmentos/}))
 await screen.findByText('5611201', {exact:false})
 await user.click(screen.getByRole('button', {name:/Confirmar revis/}))
 expect(change).toHaveBeenCalledTimes(1)
 expect(document.querySelector('input[name="cnaes"]')).toHaveValue('5611201')
 expect(document.querySelector('input[name="segmentos"]')).toBeNull()
})
it('does not silently resolve divergent versions and preserves isolated legacy literals', async () => {
 const user = userEvent.setup()
 render(<Providers><form><CnpjB2BFilters search={new URLSearchParams('cnae=0010100&return_to=abc')} /></form></Providers>)
 await user.click(screen.getByRole('button', {name:/Normalizar CNAE/}))
 const next = new URLSearchParams('uf=MG&return_to=abc')
 applyB2BForm(new FormData(document.querySelector('form')!), next)
 expect(next.get('cnaes')).toBe('0010100')
 expect(next.get('atividade_escopo')).toBe('principal')
 expect(next.has('cnae')).toBe(false)
 expect(next.get('return_to')).toBe('abc')
})

it.each(['segmentos=restaurantes&catalog_version=old', 'segmentos=desconhecido&catalog_version=b2b-v1'])('blocks unreviewable segments %s', async query => {
 const user = userEvent.setup()
 render(<Providers><CnpjB2BFilters search={new URLSearchParams(query)} /></Providers>)
 await user.click(screen.getByRole('button', {name:/Resolver segmentos/}))
 expect(await screen.findByRole('button', {name:/Confirmar revisão/})).toBeDisabled()
 expect(screen.getByText(/Segmento desconhecido, versão divergente/)).toBeInTheDocument()
 expect(document.querySelector('input[name="segmentos"]')).not.toBeNull()
})
