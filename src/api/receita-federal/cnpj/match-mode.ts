import type { TextMatchMode } from './types'

export const TEXT_MATCH_MODES: readonly TextMatchMode[] = ['contendo', 'inicio', 'fim', 'exato']

export function textMatchModeFromSearch(value: string | null): TextMatchMode {
  return TEXT_MATCH_MODES.includes(value as TextMatchMode) ? value as TextMatchMode : 'contendo'
}

export function isInvalidTextMatchMode(value: string | null) {
  return value !== null && !TEXT_MATCH_MODES.includes(value as TextMatchMode)
}
