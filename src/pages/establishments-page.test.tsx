import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { BusinessSearchItem } from '../api/receita-federal/cnpj/types'
import { Providers } from '../app/providers'
import { EstablishmentsPage } from './establishments-page'

vi.mock('../api/receita-federal/cnpj/client', () => ({ cnpjApi: { search:vi.fn(), locationFacets:vi.fn() } }))
const searchMock = vi.mocked(cnpjApi.search)
const facetsMock = vi.mocked(cnpjApi.locationFacets)
const result: BusinessSearchItem = { id:1,cnpj:'00123456000199',cnpj_basico:'00123456',razao_social:'ATLAS LTDA',nome_fantasia:'ATLAS',identificador_matriz_filial:{codigo:'1',descricao:'Matriz'},situacao_cadastral:{codigo:'2',descricao:'Ativa'},uf:'MG',municipio:{codigo:'4123',descricao:'Belo Horizonte',uf:'MG'},cnae_principal:null,match_fields:['razao_social','nome_fantasia'] }
const page = { count:null,next:null,previous:null,page:1,page_size:10 as const,has_next:false,has_previous:false,results:[result] }
function LocationProbe(){const location=useLocation();return <output data-testid="location">{location.pathname}{location.search}</output>}
function renderPage(entry='/receita-federal/cnpj?q=atlas&page=1'){return render(<Providers><MemoryRouter initialEntries={[entry]}><Routes><Route path="/receita-federal/cnpj" element={<><EstablishmentsPage/><LocationProbe/></>}/><Route path="*" element={<LocationProbe/>}/></Routes></MemoryRouter></Providers>)}

describe('busca empresarial unificada',()=>{
  beforeEach(()=>{vi.clearAllMocks();searchMock.mockResolvedValue(page);facetsMock.mockResolvedValue({count:1,next:null,previous:null,results:[{uf:'MG',municipio:{codigo:'4123',descricao:'Belo Horizonte',uf:'MG'},estabelecimentos_count:7},{uf:'SP',municipio:null,estabelecimentos_count:2}]})})
  it('trata URL antiga sem q_modo como contendo',async()=>{renderPage();expect(await screen.findByText('ATLAS LTDA')).toBeInTheDocument();expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toHaveValue('contendo');expect(searchMock).toHaveBeenCalledTimes(1);expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',q_modo:'contendo',page:1,page_size:10}),expect.any(AbortSignal))})
  it('leva a linha inteira à empresa e preserva a busca no link',async()=>{renderPage();const link=await screen.findByRole('link',{name:'Ver empresa ATLAS LTDA'});expect(link).toHaveAttribute('href','/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%3Fq%3Datlas%26page%3D1')})
  it('mostra o erro oficial de q junto ao campo',async()=>{searchMock.mockRejectedValue(new ApiError('Revise os campos.',400,undefined,{q:['Informe um CNPJ válido.']}));renderPage('/receita-federal/cnpj?q=123&page=1');expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Encontre uma empresa'})).toHaveAttribute('aria-invalid','true')})
  it('restaura e muda o modo, reinicia a página e repete a busca',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?q=atlas&q_modo=inicio&page=3');await screen.findByText('ATLAS LTDA');expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toHaveValue('inicio');await user.selectOptions(screen.getByRole('combobox',{name:'Modo de correspondência'}),'exato');await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&q_modo=exato&page=1'));await waitFor(()=>expect(searchMock).toHaveBeenLastCalledWith(expect.objectContaining({q:'atlas',q_modo:'exato',page:1}),expect.any(AbortSignal)))})
  it('envia exatamente o mesmo modo para busca e faceta',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?q=atlas&q_modo=fim&cnae=6201501&page=3');await screen.findByText('ATLAS LTDA');await user.click(screen.getByRole('button',{name:'Filtrar por localidade'}));await screen.findByRole('button',{name:/Belo Horizonte/});expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',q_modo:'fim'}),expect.any(AbortSignal));expect(facetsMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',q_modo:'fim',cnae:'6201501',page:1,page_size:50}),expect.any(AbortSignal))})
  it('normaliza modo inválido sem enviá-lo e preserva filtros',async()=>{renderPage('/receita-federal/cnpj?q=atlas&q_modo=aproximado&cnae=6201501&page=2');await screen.findByText('ATLAS LTDA');await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&q_modo=contendo&cnae=6201501&page=2'));expect(searchMock.mock.calls.every(([params])=>params.q_modo==='contendo')).toBe(true)})
  it.each(['00123456','00123456000199'])('mantém CNPJ %s pesquisável com seletor visível',async q=>{renderPage(`/receita-federal/cnpj?q=${q}&page=1`);await screen.findByText('ATLAS LTDA');expect(screen.getByRole('combobox',{name:'Modo de correspondência'})).toBeVisible();expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q,q_modo:'contendo'}),expect.any(AbortSignal))})
})
