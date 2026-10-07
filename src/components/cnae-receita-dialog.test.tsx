import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { Providers } from '../app/providers'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { CnaeReceitaDialog } from './cnae-receita-dialog'
import { cnaeApi } from '../api/ibge/cnae/client'
import { cnaeCatalog, cnaeNode, cnaePage } from '../test/cnae-fixtures'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { cnaes: vi.fn() } }))
vi.mock('../api/ibge/cnae/client', () => ({ cnaeApi: { catalog: vi.fn(), nodes: vi.fn() } }))
beforeEach(() => { vi.mocked(cnpjApi.cnaes).mockReset(); vi.mocked(cnpjApi.cnaes).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ codigo: '0010100', descricao: 'Literal Receita' }] }) })

it('shows 100 limit without truncating and retains selection on domain errors', async () => {
  const user = userEvent.setup(), confirm = vi.fn()
  const initial = Array.from({ length: 100 }, (_, index) => ({ codigo: String(index).padStart(7, '0'), descricao: 'Publicado' }))
  render(<Providers><CnaeReceitaDialog initial={initial} scope="principal" secondary={false} confirm={confirm} close={vi.fn()} /></Providers>)
  await user.click(await screen.findByRole('checkbox', { name: /0010100/ }))
  expect(screen.getByRole('alert')).toHaveTextContent('Limite de 100')
  vi.mocked(cnpjApi.cnaes).mockRejectedValue(new Error('Receita indisponível'))
  await user.type(screen.getByLabelText('Buscar descrição Receita'), 'nova{Enter}')
  await screen.findByText('Receita indisponível')
  expect(screen.getAllByRole('button', { name: /Remover / })).toHaveLength(100)
  expect(screen.getByRole('option', { name: 'Principal ou secundárias' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(confirm).toHaveBeenCalledWith(initial, 'principal')
})

it('clear and cancel only edit the internal session; Enter never confirms', async () => {
  const user = userEvent.setup(), confirm = vi.fn(), close = vi.fn()
  render(<Providers><CnaeReceitaDialog initial={[{ codigo: '0010100', descricao: 'Receita' }]} scope="principal" secondary={false} confirm={confirm} close={close} /></Providers>)
  await user.type(screen.getByLabelText('Código exato (sete dígitos)'), '6201501{Enter}')
  expect(confirm).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Limpar' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(close).toHaveBeenCalledTimes(1)
  expect(confirm).not.toHaveBeenCalled()
})

it('keeps the auxiliary IBGE description identified and never reports success after rejecting an addition', async () => {
  const user = userEvent.setup(), confirm = vi.fn()
  vi.mocked(cnaeApi.catalog).mockResolvedValue(cnaeCatalog)
  vi.mocked(cnaeApi.nodes).mockResolvedValue(cnaePage([cnaeNode]))
  render(<Providers><CnaeReceitaDialog initial={[]} scope="principal" secondary={false} confirm={confirm} close={vi.fn()} /></Providers>)
  await user.click(screen.getByRole('button', { name: 'Consultar catálogo oficial CNAE' }))
  await user.click(await screen.findByRole('button', { name: 'Consultar nós CNAE' }))
  await user.click(await screen.findByRole('button', { name: 'Selecionar 0010100' }))
  await user.click(screen.getByRole('button', { name: 'Selecionar 0010100' }))
  expect(screen.getByText('Código não adicionado. Revise a seleção e o limite de CNAEs.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(confirm).toHaveBeenCalledWith([{ codigo: '0010100', descricao: `IBGE/CONCLA: ${cnaeNode.description} — existência a validar na Receita` }], 'principal')
})
