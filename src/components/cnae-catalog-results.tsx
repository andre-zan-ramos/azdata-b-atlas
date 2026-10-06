import type { Catalog, CnaeResponse, Correspondence, NodeReference, Relationship } from '../api/ibge/cnae/types'

export function CnaeMetadata({ catalog }: { catalog: Catalog }) {
  const flags = [['subclasses_complete', 'Subclasses'], ['structure_complete', 'Hierarquia completa'], ['correspondences_complete', 'Correspondências'], ['explanatory_notes_complete', 'Notas explicativas completas']] as const
  return <div className="cnae-metadata">
    <p><strong>{catalog.classification_version}</strong><br />Publicado em {catalog.loaded_at}<br />Publicação: <span className="cnae-publication">{catalog.publication_id}</span></p>
    <ul>{flags.map(([key, label]) => <li key={key}>{label}: {catalog.coverage[key] === true ? 'cobertura completa declarada' : catalog.coverage[key] === false ? 'cobertura parcial declarada' : 'cobertura não informada'}</li>)}</ul>
    <details><summary>Proveniência, cobertura e contagens globais</summary><pre>{JSON.stringify({ counts: catalog.counts, coverage: catalog.coverage, sources: catalog.sources }, null, 2)}</pre></details>
  </div>
}

const resolutionLabels = { linked: 'Destino vinculado à subclasse publicada', absent_from_structure: 'Destino ausente da estrutura publicada', no_target_code: 'Sem código de destino na fonte' }

export function CnaeCatalogResults({ data, inspect, follow, select }: {
  data: CnaeResponse
  inspect: (node: NodeReference) => void
  follow: (link: string) => void
  select: (node: NodeReference) => void
}) {
  const reference = (node: NodeReference) => <button type="button" onClick={() => inspect(node)}>{node.level} {node.code} · {node.description}</button>
  const choose = (node: NodeReference) => node.level === 'subclasse' ? <button type="button" onClick={() => select(node)}>Selecionar {node.code}</button> : null
  if ('links' in data) return <article>
    <h3>{data.level} {data.code} · {data.description}</h3>
    {choose(data)}
    <p>Níveis superiores servem para navegação; somente subclasses podem ser selecionadas.</p>
    <h4>Ancestrais publicados</h4><ul>{data.ancestors.map((node, index) => <li key={`${node.level}-${node.code}-${index}`}>{reference(node)}</li>)}</ul>
    {data.parent && data.links.parent ? <button type="button" onClick={() => follow(data.links.parent!)}>Consultar pai publicado</button> : <p>Sem pai publicado.</p>}
    <div className="cnae-actions"><button type="button" onClick={() => follow(data.links.children)}>Consultar filhos</button><button type="button" onClick={() => follow(data.links.relationships_as_child)}>Relações como filho</button><button type="button" onClick={() => follow(data.links.relationships_as_parent)}>Relações como pai</button></div>
    <details><summary>Observações e atividades literais</summary><pre>{JSON.stringify({ observations: data.observations, activities: data.activities }, null, 2)}</pre></details>
  </article>

  return <div>
    <p role="status">Página {data.page} · {data.count} {data.results[0] && 'ordinal' in data.results[0] ? 'linhas de correspondência' : 'registros'} no recorte. As contagens globais estão na proveniência.</p>
    {data.results.length === 0 ? <p>Nenhum resultado neste recorte do catálogo.</p> : null}
    <ul className="cnae-results">{data.results.map((item, index) => {
      if ('ordinal' in item) {
        const row: Correspondence = item
        return <li key={`${data.publication_id}-${row.ordinal}-${index}`}>
          <p>{row.source_version} {JSON.stringify(row.source_code)} → {row.target_version} {JSON.stringify(row.target_code)}</p>
          <p>{resolutionLabels[row.target_resolution]}</p>
          {row.target_resolution === 'linked' && row.target ? reference(row.target) : null}
          <details><summary>Linha {row.source_row} · ocorrência {row.ordinal}</summary><pre>{JSON.stringify(row, null, 2)}</pre></details>
        </li>
      }
      if ('occurrence_id' in item) {
        const row: Relationship = item
        return <li key={`${row.publication_id}-${row.occurrence_id}-${index}`}>{reference(row.child)}<span> Pai: </span>{reference(row.parent)}<p>Linha {row.source_row} · ocorrência {row.occurrence_id} (somente nesta publicação)</p></li>
      }
      return <li key={`${data.publication_id}-${item.level}-${item.code}-${index}`}>
        {reference(item)} {choose(item)}
        {item.parent ? <div>Pai explícito: {reference(item.parent)}</div> : null}
      </li>
    })}</ul>
    <nav className="cnae-actions" aria-label="Paginação do catálogo CNAE">
      <button type="button" disabled={!data.previous} onClick={() => data.previous && follow(data.previous)}>Página anterior CNAE</button>
      <button type="button" disabled={!data.next} onClick={() => data.next && follow(data.next)}>Próxima página CNAE</button>
    </nav>
  </div>
}
