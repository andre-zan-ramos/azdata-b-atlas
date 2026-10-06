import type { Catalog, CnaeNode, CnaePage, Correspondence, NodeDetail, Relationship } from '../api/ibge/cnae/types'

export const publication = 'a'.repeat(64)
export const cnaeCatalog: Catalog = {
  classification_version: 'CNAE-Subclasses 2.3', publication_id: publication, loaded_at: '2026-10-05T21:03:04Z',
  counts: { secao: 21, divisao: 87, grupo: 283, classe: 671, subclasse: 1332 },
  coverage: { subclasses_complete: true, structure_complete: false, correspondences_complete: false, explanatory_notes_complete: false, observations_present: false,
    source_discrepancies: { targets_absent_from_json: ['1822900', '9609201'], json_subclasses_absent_from_correspondences: ['8430200'] }, extra: [null, '', '  espaço  ', '001', '001'] },
  sources: [{ role: 'structure', literal: '  fonte  ', cells: [null, '', '001'] }, { role: 'structure', literal: '  fonte  ', cells: [null, '', '001'] }],
}
// Deliberately different prefixes: navigation must use the supplied FKs.
export const cnaeParent = { classification_version: cnaeCatalog.classification_version, level: 'classe' as const, code: '99999', description: '  Pai explícito  ' }
export const cnaeNode: CnaeNode & { level: 'subclasse' } = { classification_version: cnaeCatalog.classification_version, level: 'subclasse', code: '0010100', description: '  Atividade oficial  ', observations: [null, '', '  espaço  ', '001', '001'], activities: ['001', '001', ''], parent: cnaeParent }
export const cnaeDetail: NodeDetail = { ...cnaeCatalog, ...cnaeNode, ancestors: [cnaeParent], links: {
  self: `/api/v1/ibge/cnae/nos/subclasse/0010100/?publication_id=${publication}`,
  parent: `/api/v1/ibge/cnae/nos/classe/99999/?publication_id=${publication}`,
  children: `/api/v1/ibge/cnae/nos/?pai_nivel=subclasse&pai_codigo=0010100&publication_id=${publication}`,
  relationships_as_child: `/api/v1/ibge/cnae/relacoes/?filho_nivel=subclasse&filho_codigo=0010100&publication_id=${publication}`,
  relationships_as_parent: `/api/v1/ibge/cnae/relacoes/?pai_nivel=subclasse&pai_codigo=0010100&publication_id=${publication}`,
} }
export function cnaePage<T>(results: T[], extra: Partial<CnaePage<T>> = {}): CnaePage<T> {
  return { ...cnaeCatalog, count: results.length, page: 1, page_size: 10, next: null, previous: null, results, ...extra }
}
export const cnaeRelationship: Relationship = { occurrence_id: 7, publication_id: publication, source_row: 5, child: cnaeNode, parent: cnaeParent }
export const cnaeCorrespondence: Correspondence = { ordinal: 0, source_version: 'CNAE-Subclasses 2.2', target_version: 'CNAE-Subclasses 2.3', source_code: '0010100', target_code: '0010100', source_literal: '  00101-0/00  ', target_literal: '', source_member: 'tabela.ods', source_sheet: '  Planilha  ', source_row: 7, source_cells: [null, '', '001', '001', '  espaço  '], target_resolution: 'linked', target: cnaeNode }
