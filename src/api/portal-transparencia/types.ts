export type PortalScalar = string | number | boolean | null
export type PortalValue = PortalScalar | PortalValue[] | { [key: string]: PortalValue }
export type PortalRecord = { [key: string]: PortalValue }

export type PortalPage = {
  page: number
  returned_count: number
  total_count: number | null
  has_next: boolean | null
  has_previous: boolean
  results: PortalRecord[]
}

export type PortalResourcesParams = {
  mes_ano_inicio: string
  mes_ano_fim: string
  pagina?: number
}
