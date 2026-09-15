import { describe, expect, it } from 'vitest'
import { isInvalidTextMatchMode, textMatchModeFromSearch } from './match-mode'

describe('modo de correspondência textual', () => {
  it.each(['contendo', 'inicio', 'fim', 'exato'] as const)('restaura %s pela URL', mode => {
    expect(textMatchModeFromSearch(mode)).toBe(mode)
  })

  it('trata ausência e valor inválido como contendo', () => {
    expect(textMatchModeFromSearch(null)).toBe('contendo')
    expect(textMatchModeFromSearch('aproximado')).toBe('contendo')
    expect(isInvalidTextMatchMode(null)).toBe(false)
    expect(isInvalidTextMatchMode('aproximado')).toBe(true)
  })
})
