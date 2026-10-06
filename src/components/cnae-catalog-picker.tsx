import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../api/errors'
import { cnaeApi } from '../api/ibge/cnae/client'
import type { CnaeResponse, CorrespondenceFilters, Level, NodeFilters, NodeReference, PageSize, TargetResolution } from '../api/ibge/cnae/types'
import { QueryError } from './query-state'
import { CnaeCatalogResults, CnaeMetadata } from './cnae-catalog-results'

type Request = { kind: 'nodes'; filters: NodeFilters } | { kind: 'correspondences'; filters: CorrespondenceFilters } | { kind: 'node'; node: NodeReference } | { kind: 'link'; link: string }
const queryOptions = { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false, staleTime: Infinity, gcTime: 0 } as const

function CatalogSession({ select }: { select: (node: NodeReference) => void }) {
  const scope = useId()
  const client = useQueryClient()
  const [epoch, setEpoch] = useState(0)
  const [changed, setChanged] = useState(false)
  const [request, setRequest] = useState<Request | null>(null)
  const [level, setLevel] = useState<Level>('subclasse')
  const [searchBy, setSearchBy] = useState<'codigo' | 'descricao'>('descricao')
  const [term, setTerm] = useState('')
  const [size, setSize] = useState<PageSize>(10)
  const [correspondenceCode, setCorrespondenceCode] = useState('')
  const [codeField, setCodeField] = useState<'source_code' | 'target_code'>('target_code')
  const [resolution, setResolution] = useState<TargetResolution | ''>('')
  const [codeState, setCodeState] = useState<'any' | 'null' | 'empty' | 'present'>('any')
  const heading = useRef<HTMLHeadingElement>(null)
  const prefix = ['ibge-cnae', scope, epoch]
  const catalog = useQuery({ ...queryOptions, queryKey: [...prefix, 'catalog'], enabled: !changed, queryFn: ({ signal }) => cnaeApi.catalog({}, signal) })
  const publication = catalog.data?.publication_id
  const version = catalog.data?.classification_version
  const result = useQuery({
    ...queryOptions, queryKey: [...prefix, version, publication, request], enabled: Boolean(publication && request && !changed),
    queryFn: async ({ signal }): Promise<CnaeResponse> => {
      if (!request || !publication) throw new Error('Escolha uma consulta CNAE.')
      const params = { classification_version: version, publication_id: publication }
      switch (request.kind) {
        case 'nodes': return cnaeApi.nodes({ ...request.filters, ...params }, signal)
        case 'correspondences': return cnaeApi.correspondences({ ...request.filters, ...params }, signal)
        case 'node': return cnaeApi.node(request.node.level, request.node.code, params, signal)
        case 'link': return cnaeApi.follow(request.link, publication, signal)
      }
    },
  })
  const error = catalog.error ?? result.error
  const mismatch = changed || (error instanceof ApiError && error.status === 409)
  useEffect(() => {
    if (!(error instanceof ApiError) || error.status !== 409) return
    setChanged(true)
    // Hide all old details/pages immediately; cancel pending work and remove this session.
    const key = ['ibge-cnae', scope, epoch]
    void client.cancelQueries({ queryKey: key }).then(() => client.removeQueries({ queryKey: key }))
  }, [error, client, scope, epoch])
  useEffect(() => { heading.current?.focus() }, [request, mismatch])
  const navigate = (next: Request) => setRequest(next)
  const searchNodes = () => navigate({ kind: 'nodes', filters: { nivel: level, page: 1, page_size: size, ...(term === '' ? {} : { [searchBy]: term }) } })
  const searchCorrespondences = () => navigate({ kind: 'correspondences', filters: {
    page: 1, page_size: size,
    ...(codeState === 'any' || codeState === 'present' ? (correspondenceCode === '' ? {} : { [codeField]: correspondenceCode }) : {}),
    ...(codeState === 'any' ? {} : { [`${codeField}_state`]: codeState }),
    ...(resolution ? { target_resolution: resolution } : {}),
  } })
  const restart = async () => {
    const key = ['ibge-cnae', scope, epoch]
    await client.cancelQueries({ queryKey: key })
    client.removeQueries({ queryKey: key })
    setRequest(null); setEpoch(value => value + 1); setChanged(false)
  }

  return <section className="cnae-catalog" aria-label="Consulta do catálogo oficial CNAE" onKeyDown={event => {
    // This panel belongs to the map filter form; Enter must not submit that form.
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); event.stopPropagation() }
  }}>
    <h3 ref={heading} tabIndex={-1}>Catálogo oficial CNAE/CONCLA</h3>
    <p>Consulta IBGE independente do domínio Receita e dos segmentos editoriais. A igualdade de código não certifica a versão histórica do CNPJ. Correspondências são informativas, sem conversão automática.</p>
    {mismatch ? <div role="alert"><p>A publicação CNAE mudou. As páginas e os detalhes anteriores foram descartados. Os códigos escolhidos continuam no formulário; revise-os antes de aplicar.</p><button type="button" onClick={() => void restart()}>Reiniciar com a publicação atual</button></div> : <>
      {catalog.isFetching ? <p role="status">Carregando publicação CNAE…</p> : null}
      {error ? <QueryError error={error} retry={() => void (catalog.isError ? catalog.refetch() : result.refetch())} /> : null}
      {catalog.data ? <>
        <CnaeMetadata catalog={catalog.data} />
        <label>Registros por página CNAE<select value={size} onChange={event => setSize(Number(event.target.value) as PageSize)}>{[10, 25, 50].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Nível oficial<select value={level} onChange={event => setLevel(event.target.value as Level)}><option value="subclasse">Subclasse (selecionável)</option><option value="classe">Classe</option><option value="grupo">Grupo</option><option value="divisao">Divisão</option><option value="secao">Seção</option></select></label>
        <label>Pesquisar CNAE por<select value={searchBy} onChange={event => setSearchBy(event.target.value as 'codigo' | 'descricao')}><option value="descricao">Descrição contendo</option><option value="codigo">Código literal exato</option></select></label>
        <label>Código ou descrição oficial<input value={term} onChange={event => setTerm(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); searchNodes() } }} /></label>
        <button type="button" onClick={searchNodes}>Consultar nós CNAE</button>
        <details><summary>Consultar correspondências informativas</summary>
          <label>Código de correspondência<select value={codeField} onChange={event => setCodeField(event.target.value as 'source_code' | 'target_code')}><option value="target_code">Destino</option><option value="source_code">Origem</option></select></label>
          <label>Código literal na correspondência<input value={correspondenceCode} disabled={codeState === 'null' || codeState === 'empty'} onChange={event => setCorrespondenceCode(event.target.value)} /></label>
          <label>Estado do código na fonte<select value={codeState} onChange={event => setCodeState(event.target.value as typeof codeState)}><option value="any">Sem filtro de estado</option><option value="null">NULL</option><option value="empty">String vazia</option><option value="present">Presente (inclui espaços)</option></select></label>
          <p>Campo em branco sem estado não filtra código. NULL e string vazia são estados distintos.</p>
          <label>Resolução do destino<select value={resolution} onChange={event => setResolution(event.target.value as TargetResolution | '')}><option value="">Todos os estados</option><option value="linked">Vinculado</option><option value="absent_from_structure">Ausente da estrutura</option><option value="no_target_code">Sem código de destino</option></select></label>
          <button type="button" onClick={searchCorrespondences}>Consultar correspondências</button>
        </details>
        {result.isFetching ? <p role="status">Carregando consulta CNAE…</p> : null}
        {result.data && !result.isError && !result.isFetching ? <CnaeCatalogResults data={result.data} inspect={node => navigate({ kind: 'node', node })} follow={link => navigate({ kind: 'link', link })} select={select} /> : null}
      </> : null}
    </>}
  </section>
}

export function CnaeCatalogPicker({ codes, onCodes }: { codes: string; onCodes: (codes: string) => void }) {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const panelId = useId()
  const toggle = useRef<HTMLButtonElement>(null)
  const select = (node: NodeReference) => {
    if (node.level !== 'subclasse') return
    // Leave manual tokens (including duplicates and invalid literals) intact for API validation.
    onCodes(codes === '' ? node.code : `${codes},${node.code}`)
    setNotice(`Código ${node.code} adicionado. Aplique os filtros para consultar o CNPJ.`)
  }
  return <div onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); toggle.current?.focus() } }}>
    <button ref={toggle} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>{open ? 'Fechar catálogo oficial CNAE' : 'Consultar catálogo oficial CNAE'}</button>
    {notice ? <p role="status">{notice}</p> : null}
    <div id={panelId}>{open ? <CatalogSession select={select} /> : null}</div>
    <p>O código IBGE pode não existir no domínio Receita. Nesse caso, o erro da API será apresentado e sua seleção será preservada.</p>
  </div>
}
