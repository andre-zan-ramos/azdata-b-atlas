import type { TextMatchMode } from '../api/receita-federal/cnpj/types'

const OPTIONS: Array<{ value: TextMatchMode; label: string }> = [
  { value: 'contendo', label: 'Contendo' },
  { value: 'inicio', label: 'Começa com' },
  { value: 'fim', label: 'Termina com' },
  { value: 'exato', label: 'Correspondência exata' },
]

export function TextMatchModeSelect({ value, onChange }: { value: TextMatchMode; onChange: (value: TextMatchMode) => void }) {
  return <label className="match-mode-control" title="Define a correspondência para textos. CNPJ básico ou completo continua sendo pesquisado de forma exata.">
    <span>Modo de correspondência</span>
    <select aria-label="Modo de correspondência" name="q_modo" value={value} onChange={event => onChange(event.target.value as TextMatchMode)}>
      {OPTIONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>
}
