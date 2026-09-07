import { render, screen } from '@testing-library/react'
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
const result: BusinessSearchItem = { id:1,cnpj:'00123456000199',cnpj_basico:'00123456',razao_social:'ATLAS LTDA',nome_fantasia:'ATLAS',identificador_matriz_filial:{codigo:'1',descricao:'Matriz'},situacao_cadastral:{codigo:'2',descricao:'Ativa'},uf:'MG',municipio:{codigo:4123,descricao:'Belo Horizonte',uf:'MG'},cnae_principal:null,match_fields:['razao_social','nome_fantasia'] }
const page = { count:null,next:null,previous:null,page:1,page_size:10 as const,has_next:false,has_previous:false,results:[result] }
function LocationProbe(){const location=useLocation();return <output data-testid="location">{location.pathname}{location.search}</output>}
function renderPage(entry='/receita-federal/cnpj?q=atlas&page=1'){return render(<Providers><MemoryRouter initialEntries={[entry]}><Routes><Route path="/receita-federal/cnpj" element={<><EstablishmentsPage/><LocationProbe/></>}/><Route path="*" element={<LocationProbe/>}/></Routes></MemoryRouter></Providers>)}

describe('busca empresarial unificada',()=>{
  beforeEach(()=>{vi.clearAllMocks();searchMock.mockResolvedValue(page);facetsMock.mockResolvedValue({count:1,next:null,previous:null,results:[{uf:'MG',municipio:{codigo:4123,descricao:'Belo Horizonte',uf:'MG'},estabelecimentos_count:7},{uf:'SP',municipio:null,estabelecimentos_count:2}]})})
  it('faz uma única busca e apresenta a razão social sem expor match_fields',async()=>{renderPage();expect(await screen.findByText('ATLAS LTDA')).toBeInTheDocument();expect(screen.getByRole('columnheader',{name:'Razão social'})).toBeInTheDocument();expect(screen.queryByText('Razão social e Nome fantasia')).not.toBeInTheDocument();expect(searchMock).toHaveBeenCalledTimes(1);expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',page:1,page_size:10}),expect.any(AbortSignal))})
  it('leva a linha inteira à empresa e preserva a busca no link',async()=>{renderPage();const link=await screen.findByRole('link',{name:'Ver empresa ATLAS LTDA'});expect(link).toHaveAttribute('href','/receita-federal/cnpj/empresas/00123456?return_to=%2Freceita-federal%2Fcnpj%3Fq%3Datlas%26page%3D1')})
  it('mostra o erro oficial de q junto ao campo',async()=>{searchMock.mockRejectedValue(new ApiError('Revise os campos.',400,undefined,{q:['Informe um CNPJ válido.']}));renderPage('/receita-federal/cnpj?q=123&page=1');expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Encontre uma empresa'})).toHaveAttribute('aria-invalid','true')})
  it('abre a faceta sob demanda, preserva filtros e seleciona localidade na URL',async()=>{const user=userEvent.setup();renderPage('/receita-federal/cnpj?q=atlas&cnae=6201501&page=3');await screen.findByText('ATLAS LTDA');expect(facetsMock).not.toHaveBeenCalled();await user.click(screen.getByRole('button',{name:'Filtrar por localidade'}));expect(await screen.findByRole('button',{name:/Belo Horizonte/})).toBeInTheDocument();expect(screen.getByText(/Município não informado/)).toBeInTheDocument();expect(facetsMock).toHaveBeenCalledWith(expect.objectContaining({q:'atlas',cnae:'6201501',page:1,page_size:50}),expect.any(AbortSignal));await user.click(screen.getByRole('button',{name:/Belo Horizonte/}));expect(screen.getByTestId('location')).toHaveTextContent('/receita-federal/cnpj?q=atlas&cnae=6201501&page=1&uf=MG&municipio=4123')})
})
