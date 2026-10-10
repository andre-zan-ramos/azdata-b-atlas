import type { ReactNode } from 'react'
import { periodSummary, readPeriod } from '../utils/cnpj-period'
import { useQueryClient } from '@tanstack/react-query'
import type { CodeDescription } from '../api/receita-federal/cnpj/types'

const EXTRA_LABELS = [
  ['q', 'Nome do sócio'], ['q_modo', 'Correspondência'], ['cnpj_basico', 'CNPJ básico'],
  ['situacao_cadastral', 'Situação cadastral'], ['matriz_filial', 'Matriz/filial'],
  ['porte', 'Porte'], ['natureza_juridica', 'Natureza jurídica'],
] as const

export function CnpjOtherQueries({ search, dirty, blocked, children }: {
  search: URLSearchParams; dirty: boolean; blocked: boolean; children: ReactNode
}) {
  const client = useQueryClient()
  const codes = (search.get('cnaes') ?? '').split(',').filter(Boolean)
  const activities = codes.map(code => {
    const item = client.getQueryData<CodeDescription>(['cnpj', 'cnae-label', code])
    return `${code} · ${item?.descricao ?? 'Descrição ainda não consultada'}`
  })
  const applied = [
    codes.length ? `${codes.length} CNAEs: ${activities.join('; ')} · ${search.get('atividade_escopo') === 'principal' ? 'Somente principal' : 'Principal ou secundárias'}` : 'Nenhum CNAE aplicado.',
    periodSummary(readPeriod(search)),
    ...EXTRA_LABELS.flatMap(([key, label]) => search.has(key) ? [`${label}: ${search.get(key)}`] : []),
  ].join(' ')
  return <details className="cnpj-other-queries" open>
    <summary>
      <span className="cnpj-other-title">Demais consultas</span>
      <span className="cnpj-applied-summary" aria-label="Resumo dos filtros aplicados">{blocked ? 'Nenhum recorte aplicado. Revise as escolhas para consultar.' : `Aplicado: ${applied}`}</span>
      <span className="cnpj-draft-status" role="status">{dirty ? 'Alterações ainda não aplicadas.' : 'Sem alterações pendentes.'}</span>
    </summary>
    <div className="cnpj-other-fields">{children}</div>
  </details>
}
