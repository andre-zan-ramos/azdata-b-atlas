export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Level = 'secao' | 'divisao' | 'grupo' | 'classe' | 'subclasse'
export type PageSize = 10 | 25 | 50
export type Catalog = {
  classification_version: 'CNAE-Subclasses 2.3'
  publication_id: string
  loaded_at: string
  counts: Record<string, Json>
  coverage: Record<string, Json>
  sources: Array<Record<string, Json>>
}
export type NodeReference = { classification_version: Catalog['classification_version']; level: Level; code: string; description: string }
export type CnaeNode = NodeReference & { observations: Json; activities: Json; parent: NodeReference | null }
export type NodeDetail = Catalog & CnaeNode & {
  ancestors: NodeReference[]
  links: { self: string; parent: string | null; children: string; relationships_as_child: string; relationships_as_parent: string }
}
export type Relationship = { occurrence_id: number; publication_id: string; source_row: number; child: NodeReference; parent: NodeReference }
export type TargetResolution = 'linked' | 'absent_from_structure' | 'no_target_code'
export type Correspondence = {
  ordinal: number; source_version: string; target_version: string
  source_code: string | null; target_code: string | null; source_literal: string | null; target_literal: string | null
  source_member: string; source_sheet: string; source_row: number; source_cells: Json[]
  target: (NodeReference & { level: 'subclasse' }) | null; target_resolution: TargetResolution
}
export type CnaePage<T> = Catalog & { count: number; page: number; page_size: PageSize; next: string | null; previous: string | null; results: T[] }
export type PublicationParams = { classification_version?: Catalog['classification_version']; publication_id?: string }
export type CollectionParams = PublicationParams & { page?: number; page_size?: PageSize }
export type NodeFilters = CollectionParams & {
  nivel?: Level; codigo?: string; codigos?: string; descricao?: string
  descricao_modo?: 'contendo' | 'inicio' | 'iniciando' | 'fim' | 'terminando' | 'exato' | 'igual'
  pai_nivel?: Level; pai_codigo?: string
}
export type RelationshipFilters = CollectionParams & { filho_nivel?: Level; filho_codigo?: string; pai_nivel?: Level; pai_codigo?: string; source_row?: number }
export type CorrespondenceFilters = CollectionParams & {
  source_code?: string; target_code?: string; source_version?: string; target_version?: string
  source_member?: string; source_sheet?: string; source_row?: number
  source_code_state?: 'null' | 'empty' | 'present'; target_code_state?: 'null' | 'empty' | 'present'; target_resolution?: TargetResolution
}
export type CnaeResponse = NodeDetail | CnaePage<CnaeNode> | CnaePage<Relationship> | CnaePage<Correspondence>
