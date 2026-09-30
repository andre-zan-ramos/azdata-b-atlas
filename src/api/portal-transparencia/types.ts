export type PortalScalar = string | number | boolean | null
export type PortalValue = PortalScalar | PortalValue[] | { [key: string]: PortalValue }
export type PortalRecord = { [key: string]: PortalValue }

export type PortalIndicator = {
  key: string
  label: string
  description: string
  value: boolean | null
  present: boolean
  source_scope: string
  reference_date: string | null
}

export type PortalPage = {
  page: number
  returned_count: number
  total_count: number | null
  has_next: boolean | null
  has_previous: boolean
  results: PortalRecord[]
}

export type PortalResourcesParams = {
  mes_ano_inicio?: string
  mes_ano_fim?: string
  pagina?: number
  quantidade?: '3' | '10' | '25' | 'todos'
}
