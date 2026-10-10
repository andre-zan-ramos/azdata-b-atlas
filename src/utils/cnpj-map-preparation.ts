import { PERIOD_KEYS, readPeriod, validatePeriod } from './cnpj-period'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { Municipality } from '../api/receita-federal/cnpj/types'

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))

export function useMunicipalityMapSelection(uf: string, municipalities: Municipality[] | undefined, ready: boolean, select: (uf: string, code: string) => void) {
  const [pending, setPending] = useState<{ uf: string; code: string; id: number } | null>(null)
  const dismissSelectionMessage = useCallback(() => setPending(null), [])
  useEffect(() => {
    if (!pending) return
    if (pending.uf !== uf) { setPending(null); return }
    if (!ready) return
    const matches = (municipalities ?? []).filter(item => item.uf === uf && item.codigo_ibge === pending.code)
    if (matches.length === 1) { select(uf, matches[0].codigo); setPending(null) }
  }, [pending, uf, municipalities, ready, select])
  return {
    selectMunicipality: (code: string) => setPending({ uf, code, id: Date.now() }),
    selectionMessageId: pending?.id,
    dismissSelectionMessage,
    selectionMessage: pending && pending.uf === uf
      ? ready ? 'Não foi possível selecionar esse município pelo mapa. Escolha-o no filtro Município.' : null
      : null,
  }
}
export function mapEligibility(search: URLSearchParams, municipalities: Municipality[] = [], complete = false, partner = false): string | null {
  for (const key of new Set(search.keys())) {
    if (search.getAll(key).length !== 1) return 'A URL contém parâmetros repetidos. Revise e aplique os filtros para consultar.'
  }
  if (search.has('cnae') || search.has('segmentos')) return 'Revise explicitamente a atividade da URL antiga antes de aplicar.'
  if (!UFS.has(search.get('uf') ?? '')) return 'Selecione uma UF válida e CNAE e/ou período para aplicar filtros.'
  const get = (key: string) => search.get(key) ?? ''
  for (const [key, value] of search) {
    if (['modo', 'return_to', 'q'].includes(key)) continue
    if (!value || value !== value.trim()) return `Parâmetro inválido: ${key}.`
  }
  const patterns: Record<string, RegExp> = { municipio: /^[0-9]{4}$/, cnae: /^[0-9]{7}$/, cnpj_basico: /^[0-9]{8}$/, situacao_cadastral: /^[0-9]+$/, matriz_filial: /^[12]$/, porte: /^[0-9]{1,2}$/, natureza_juridica: /^[0-9]{4}$/, page: /^[1-9][0-9]*$/ }
  for (const [key, pattern] of Object.entries(patterns)) if (search.has(key) && !pattern.test(get(key))) return `Parâmetro inválido: ${key}.`
  if (search.has('q_modo') && !['contendo', 'inicio', 'fim', 'exato'].includes(get('q_modo'))) return 'Correspondência inválida.'
  if (partner && ((search.has('q') && get('q').trim().length < 3) || (search.has('q_modo') && !search.has('q')))) return 'Informe nome com ao menos 3 caracteres para a correspondência.'
  if (search.has('page') && Number(get('page')) > 999999999) return 'Página inválida.'
  const activity = ['cnaes', 'segmentos', 'catalog_version', 'atividade_escopo'].some(key => search.has(key))
  if (activity && search.has('cnae')) return 'Não combine CNAE principal com os novos filtros de atividade.'
  if (activity && ((!get('cnaes') && !get('segmentos')) || !['principal', 'principal_ou_secundaria'].includes(get('atividade_escopo')))) return 'Revise os filtros de atividade e seu escopo.'
  if (search.has('cnaes') && (get('cnaes').split(',').length > 100 || !get('cnaes').split(',').every(code => /^[0-9]{7}$/.test(code)))) return 'Use até 100 CNAEs literais de sete dígitos.'
  if (search.has('segmentos') && (get('catalog_version') !== 'b2b-v1' || !get('segmentos').split(',').every(code => ['restaurantes', 'academias', 'lanchonetes', 'bares'].includes(code)))) return 'Segmento ou versão de catálogo inválido.'
  if (search.has('catalog_version') && !search.has('segmentos')) return 'Informe segmentos para a versão do catálogo.'
  const periodError = validatePeriod(readPeriod(search))
  if (periodError) return periodError
  const temporal = PERIOD_KEYS.some(key => Boolean(get(key)))
  if (!get('cnae') && !get('cnaes') && !get('segmentos') && !temporal) return 'Selecione CNAE e/ou pelo menos um limite temporal válido.'
  if (get('municipio') && (!complete || !municipalities.some(item => item.codigo === get('municipio') && item.uf === get('uf')))) return 'Confirme um município pertencente à UF no domínio Receita.'
  return null
}

// Explicitly traverse the published pages; never use business results as options.
export function useMunicipalities(uf: string) {
  return useQuery({ queryKey: ['cnpj', 'municipality-domain', uf], enabled: UFS.has(uf), retry: false, staleTime: 300000,
    queryFn: async ({ signal }) => {
      const results: Municipality[] = []
      let page = 1
      while (true) {
        const response = await cnpjApi.municipalities({ uf, page, page_size: 50 }, signal)
        results.push(...response.results)
        if (!response.next) return results
        page++
      }
    },
  })
}
export function useMapDraft(search: URLSearchParams) {
  const filterSearch = new URLSearchParams(search); filterSearch.delete('page')
  const serialized = filterSearch.toString()
  const [state, setState] = useState({ source: serialized, draft: new URLSearchParams(search), dirty: false })
  if (state.source !== serialized) setState({ source: serialized, draft: new URLSearchParams(search), dirty: false })
  const current = state.source === serialized ? state : { source: serialized, draft: new URLSearchParams(search), dirty: false }
  return { draft: current.draft, dirty: current.dirty, resetDraft: (next: URLSearchParams) => { const source = new URLSearchParams(next); source.delete('page'); setState({ source: source.toString(), draft: new URLSearchParams(next), dirty: false }) }, markDirty: () => setState(previous => ({ ...previous, dirty: true })), territory: (uf: string, municipio = '') => {
    const draft = new URLSearchParams(current.draft)
    if (uf) draft.set('uf', uf); else draft.delete('uf')
    if (municipio) draft.set('municipio', municipio); else draft.delete('municipio')
    setState({ source: serialized, draft, dirty: true })
  } }
}
