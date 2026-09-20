import { describe, expect, it } from 'vitest'
import { internalReturnTo } from './navigation'

describe('retorno interno', () => {
  it.each(['/receita-federal/cno?cno=001&page=3', '/receita-federal/cno/vinculos?ni_responsavel=0-X', '/receita-federal/cno/obras/42?areas_page=2', '/receita-federal/cnpj?q=atlas&page=2', '/receita-federal/cnpj/empresas/00123456', '/receita-federal/cnpj/estabelecimentos/00123456000199', '/receita-federal/cnpj/socios/detalhes?nome=ANA'])('preserva %s', path => expect(internalReturnTo(path)).toBe(path))
  it.each(['https://evil.example', '//evil.example', '/receita-federal/cnpj-evil', '/receita-federal/cno/../cnpj', '/receita-federal/cno/%2e%2e', '/receita-federal/cno\\evil', '/receita-federal/cno/obras/abc', '/receita-federal/cno\n', '/desconhecida', null])('recusa %s', path => expect(internalReturnTo(path, '/receita-federal/cno')).toBe('/receita-federal/cno'))
})
