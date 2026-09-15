import { describe, expect, it } from 'vitest'
import { partnerDetailPath, partnerSearchPath } from './partners'

describe('partnerSearchPath', () => {
  it('cria uma busca pelo nome e reinicia a paginação', () => {
    expect(partnerSearchPath({ nome_socio_ou_razao_social: 'MARIA & FILHOS' }))
      .toBe('/receita-federal/cnpj/socios?q=MARIA+%26+FILHOS&page=1')
  })
})

describe('partnerDetailPath', () => {
  it('preserva a identidade agrupada e o retorno', () => {
    expect(partnerDetailPath({ nome_socio_ou_razao_social: 'MARIA & FILHOS', cnpj_cpf_socio: '***123**' }, '/receita-federal/cnpj/socios?q=maria&page=1'))
      .toBe('/receita-federal/cnpj/socios/detalhes?nome=MARIA+%26+FILHOS&documento=***123**&return_to=%2Freceita-federal%2Fcnpj%2Fsocios%3Fq%3Dmaria%26page%3D1')
  })
})
