export type JudicialStatusGroup = 'in_progress' | 'suspended' | 'closed' | 'unknown'
export type JudicialLastEvent = { date: string | null; description: string | null; event: string | null }
export type JudicialProcessSummary = {
  cnj_number: string; external_id: string | null; court: string; source: string
  source_system: string | null; observed_source_systems: string[]
  status_raw: string | null; status_group: JudicialStatusGroup; class_name: string | null
  subjects: string[]; plaintiff_names: string[]; defendant_names: string[]; other_party_names: string[]
  filing_date: string | null; court_unit: string | null; district: string | null
  claim_value: number | string | null; last_event: JudicialLastEvent | null; justice_type: string | null
  legal_priority: boolean | null; confidential: boolean | null
}
export type JudicialProcessPage = {
  source_total: number; page: number; page_size: 10 | 20; has_next: boolean; has_previous: boolean
  returned_count: number; duplicates_removed: number; results: JudicialProcessSummary[]
}
