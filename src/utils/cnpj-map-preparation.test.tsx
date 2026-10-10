import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mapEligibility, useMunicipalities, useMunicipalityMapSelection } from './cnpj-map-preparation'
import { Providers } from '../app/providers'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { municipalities: vi.fn() } }))
describe('shared map preparation', () => {
  it('retains a map click until the Receita domain arrives', async () => {
    const select = vi.fn()
    const rows = [{ codigo: '0001', uf: 'MG', descricao: 'Literal', codigo_ibge: '3106200' }]
    const { result, rerender } = renderHook(({ ready }) => useMunicipalityMapSelection('MG', ready ? rows : undefined, ready, select), { initialProps: { ready: false } })
    act(() => result.current.selectMunicipality('3106200'))
    expect(select).not.toHaveBeenCalled()
    rerender({ ready: true })
    await waitFor(() => expect(select).toHaveBeenCalledWith('MG', '0001'))
    expect(result.current.selectionMessage).toBeNull()
  })
  it('explains a missing crosswalk without guessing from the name', () => {
    const select = vi.fn()
    const { result } = renderHook(() => useMunicipalityMapSelection('MG', [{ codigo: '0001', uf: 'MG', descricao: 'Belo Horizonte', codigo_ibge: null }], true, select))
    act(() => result.current.selectMunicipality('3106200'))
    expect(select).not.toHaveBeenCalled()
    expect(result.current.selectionMessage).toContain('Escolha-o no filtro Município')
  })
  it.each(['uf=MG&cnaes=0010100&atividade_escopo=principal', 'uf=MG&inicio_atividade_de=2025-01-01', 'uf=MG&cnaes=5611201&atividade_escopo=principal&situacao_evento_ate=2025-01-01', 'uf=MG&municipio=0001&cnaes=0010100&atividade_escopo=principal'])('accepts explicit complete cuts %s', query => {
    expect(mapEligibility(new URLSearchParams(query), [{codigo:'0001', uf:'MG', descricao:'Literal', codigo_ibge:null}], true)).toBeNull()
  })
  it('does not infer municipality membership or require coordinates', () => {
    const query = new URLSearchParams('uf=MG&municipio=0001&cnaes=0010100&atividade_escopo=principal')
    expect(mapEligibility(query, [{codigo:'0001',uf:'SP',descricao:'Literal'}],true)).not.toBeNull()
  })
  it('traverses explicit domain pages and retains published references and codes', async () => {
    vi.mocked(cnpjApi.municipalities).mockImplementation(async ({page}) => ({count:null,next:page===1?'next':null,previous:null,page:page!,page_size:50,has_next:page===1,has_previous:false,results:[{codigo:page===1?'0001':'0002',uf:'MG',descricao:'Same name',codigo_ibge:page===1?'3106200':null}]}))
    const {result} = renderHook(() => useMunicipalities('MG'), {wrapper:Providers})
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cnpjApi.municipalities).toHaveBeenCalledTimes(2)
    expect(cnpjApi.municipalities).toHaveBeenLastCalledWith({uf:'MG',page:2,page_size:50},expect.any(AbortSignal))
    expect(result.current.data?.map(item=>item.codigo)).toEqual(['0001','0002'])
  })
})
