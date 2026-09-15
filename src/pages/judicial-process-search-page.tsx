import { useQuery } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { judicialApi } from '../api/judicial/client'
import { JudicialProcessList } from '../components/judicial-process-list'
import { QueryError } from '../components/query-state'

export function JudicialProcessSearchPage() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState<{ name: string; page: number } | null>(null)
  const query = useQuery({ queryKey: ['judicial', 'tjmg', 'party-name', search], enabled: Boolean(search), retry: false, queryFn: ({ signal }) => judicialApi.byPartyName(search!.name, { page: search!.page, page_size: 10 }, signal) })
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const name = input.trim().replace(/\s+/g, ' '); if (name.length >= 3) setSearch({ name, page: 1 }) }
  const localError = input.trim().length > 0 && input.trim().length < 3
  return <section className="search-page judicial-search-page"><header className="page-heading"><p className="eyebrow">CONSULTA PROCESSUAL</p><h1>Processos no TJMG</h1><p className="page-intro">Consulte processos públicos pelo nome de uma pessoa. Pessoas homônimas podem aparecer nos mesmos resultados.</p></header><form className="unified-search judicial-search-form" onSubmit={submit} role="search"><label htmlFor="judicial-party-name">Nome da pessoa</label><div className="search-row"><input id="judicial-party-name" value={input} onChange={event => setInput(event.target.value)} placeholder="Digite o nome completo ou parte dele" aria-invalid={localError} aria-describedby="judicial-search-help" /><button type="submit" disabled={input.trim().length < 3}>Pesquisar</button></div><p id="judicial-search-help" className={localError ? 'field-error' : undefined}>{localError ? 'Informe ao menos 3 caracteres.' : 'A consulta é feita sob demanda na fonte pública do TJMG e não comprova identidade civil.'}</p></form>{query.isPending && search ? <div className="state" role="status">Consultando processos no TJMG…</div> : null}{query.isError ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}{query.data ? <div className="judicial-search-results"><h2>{search?.name}</h2><JudicialProcessList data={query.data} onPage={page => setSearch(current => current ? { ...current, page } : current)} referenceNames={search ? [search.name] : []} /></div> : null}</section>
}
