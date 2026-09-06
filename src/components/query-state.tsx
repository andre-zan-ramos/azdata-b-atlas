import { ApiError } from '../api/errors'
export function QueryError({ error, retry }: { error: Error; retry: () => void }) {
  const apiError = error instanceof ApiError ? error : undefined
  return <div className="state error" role="alert"><h2>{apiError?.status === 404 ? 'Registro não encontrado' : apiError?.status === 400 ? 'Não foi possível realizar a busca' : 'A consulta falhou'}</h2><p>{error.message}</p>{apiError?.fields && <ul>{Object.entries(apiError.fields).map(([field, messages]) => <li key={field}><strong>{field}:</strong> {messages.join(' ')}</li>)}</ul>}<button type="button" onClick={retry}>Tentar novamente</button></div>
}
export function Empty() { return <div className="state"><h2>Nenhum resultado</h2><p>Revise os filtros e tente uma nova busca.</p></div> }
