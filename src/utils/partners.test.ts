import { describe, expect, it } from 'vitest'
import { partnerSearchPath } from './partners'

describe('partnerSearchPath', () => {
  it('cria uma busca pelo nome e reinicia a paginação', () => {
    expect(partnerSearchPath({ nome_socio_ou_razao_social: 'MARIA & FILHOS' }))
      .toBe('/receita-federal/cnpj/socios?q=MARIA+%26+FILHOS&page=1')
  })
})
