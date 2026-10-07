import { CnpjOtherQueries } from '../components/cnpj-other-queries'
import { canonicalFilters } from '../utils/cnpj-map-context'
import { mapEligibility, useMapDraft, useMunicipalities } from '../utils/cnpj-map-preparation'
import { B2B_FILTER_KEYS, CnpjB2BFilters, applyB2BForm, useActivityCapability } from '../components/cnpj-b2b-filters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, lazy, Suspense, useMemo, useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { listStates } from '../api/ibge/territories'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import { adaptPage, pageFromSearch } from '../api/receita-federal/cnpj/pagination'
import type { PartnerMapFilters } from '../api/receita-federal/cnpj/types'
import { Pagination } from '../components/pagination'
import { PartnerMapLinks } from '../components/partner-map-links'
import { Empty, QueryError } from '../components/query-state'
import { compatiblePartnerMap } from '../utils/partner-map'

const TerritoryMap = lazy(() => import('../components/partner-territory-map').then(module => ({ default: module.PartnerTerritoryMap })))
export const PARTNER_MAP_FILTER_KEYS = [...B2B_FILTER_KEYS, 'q', 'q_modo', 'uf', 'municipio', 'cnpj_basico', 'cnae', 'situacao_cadastral', 'matriz_filial', 'porte', 'natureza_juridica'] as const
const EXTRA_FILTERS = [['cnpj_basico', 'CNPJ básico da empresa'], ['situacao_cadastral', 'Situação cadastral (código)'], ['matriz_filial', 'Matriz/filial (código)'], ['porte', 'Porte (código)'], ['natureza_juridica', 'Natureza jurídica (código)']] as const

export function PartnerMapMode() {
  const [search, setSearch] = useSearchParams()
  const queryClient = useQueryClient()
  const { draft, dirty, markDirty, territory, resetDraft } = useMapDraft(search)
  const municipalities = useMunicipalities(draft.get('uf') ?? '')
  const appliedMunicipalities = useMunicipalities(search.get('uf') ?? '')
  const capability = useActivityCapability()
  const secondaryError = search.get("atividade_escopo") === "principal_ou_secundaria" && capability.data !== true ? "Secundarias sem certificacao publicada para a release." : null
  const eligibilityError = secondaryError ?? mapEligibility(search, appliedMunicipalities.data, appliedMunicipalities.isSuccess, true)
  const blocked = Boolean(eligibilityError)
  const [formReset, setFormReset] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)
  useEffect(() => setValidationError(null), [search])
  const clearFilters = () => {
    void queryClient.cancelQueries({ predicate: query => ['establishment-map', 'map-results', 'partner-map', 'partner-map-results'].includes(String(query.queryKey[1])) })
    const next = new URLSearchParams(draft)
    for (const key of PARTNER_MAP_FILTER_KEYS) next.delete(key)
    next.delete('page'); setValidationError(null); setFormReset(value => value + 1); resetDraft(next); setSearch(next)
  }
  const location = useLocation()
  const filters = Object.fromEntries(PARTNER_MAP_FILTER_KEYS.flatMap(key => { const value = search.get(key); return value !== null && (value !== '' || (B2B_FILTER_KEYS as readonly string[]).includes(key)) ? [[key, value]] : [] })) as PartnerMapFilters
  const page = pageFromSearch(search.get('page'))
  const listParams = { ...filters, page, page_size: 10 as const }
  const states = useQuery({ queryKey: ['ibge', 'partner-states'], queryFn: ({ signal }) => listStates(signal), staleTime: 86400000, retry: false })
  const map = useQuery({ queryKey: ['cnpj', 'partner-map', filters], enabled: !blocked, queryFn: ({ signal }) => cnpjApi.partnerMap(filters, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const list = useQuery({ queryKey: ['cnpj', 'partner-map-results', listParams], enabled: !blocked, queryFn: ({ signal }) => cnpjApi.partnerMapResults(listParams, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const view = !blocked && list.data ? adaptPage(list.data, page, 10) : undefined
  const stateNames = useMemo(() => new Map((states.data ?? []).map(state => [String(state.id), state.nome])), [states.data])
  const territories = municipalities.data ?? []
  const municipalityNames = useMemo(() => new Map(territories.flatMap(item => item.codigo_ibge ? [[item.codigo_ibge, item.descricao] as const] : [])), [territories])
  const selectedMunicipality = territories.find(item => item.codigo === draft.get('municipio'))
  const compatible = Boolean(!blocked && !map.isError && !list.isError && map.data && list.data && compatiblePartnerMap(map.data, list.data) && canonicalFilters(map.data.filters) === canonicalFilters(filters))
  const points = compatible ? (map.data?.points ?? []).filter(item => item.identity.release === map.data?.release) : []
  const returnTo = location.pathname + location.search
  const applyTerritory = (uf: string, municipio = '') => territory(uf, municipio)
  const selectState = (code: string) => {
    const state = states.data?.find(item => String(item.id) === code)
    if (state?.sigla) applyTerritory(state.sigla)
  }
  const selectMunicipality = (code: string) => {
    const matches = territories.filter(item => item.codigo_ibge === code)
    if (draft.get('uf') && matches.length === 1) applyTerritory(draft.get('uf')!, matches[0].codigo)
  }
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const next = new URLSearchParams(draft)
    for (const key of ['q', 'q_modo', ...EXTRA_FILTERS.map(([key]) => key)]) {
      const value = String(data.get(key) ?? '').trim()
      if (value) next.set(key, value); else next.delete(key)
    }
    applyB2BForm(data, next)
    if (!next.has('q')) next.delete('q_modo')
    next.set('page', '1')
    const error = next.get("atividade_escopo") === "principal_ou_secundaria" && capability.data !== true ? "Secundarias sem certificacao publicada para a release." : mapEligibility(next, municipalities.data, municipalities.isSuccess, true)
    setValidationError(error)
    if (!error) { resetDraft(next); setSearch(next) }
  }
  const changePage = (value: number) => { if (blocked) return; const next = new URLSearchParams(search); next.set('page', String(value)); setSearch(next) }
  return <div className="cno-explorer">
    {eligibilityError ? <p role="status">{eligibilityError}</p> : null}{validationError ? <p role="alert">{validationError}</p> : null}
    <aside className="filter-card partner-map-filters"><h1>Mapa de Sócios</h1><p>Explore participações por estabelecimento.</p>
      <label>UF<select aria-label="UF" value={draft.get('uf') ?? ''} onChange={event => applyTerritory(event.target.value)}><option value="">Brasil</option>{draft.get('uf') && states.isSuccess && !states.data.some(item => item.sigla === draft.get('uf')) ? <option value={draft.get('uf')!}>{draft.get('uf')} (UF inválida)</option> : null}{(states.data ?? []).map(state => <option key={state.id} value={state.sigla}>{state.sigla} · {state.nome}</option>)}</select></label>
      {municipalities.isError ? <QueryError error={municipalities.error} retry={() => void municipalities.refetch()} /> : null}{states.isError ? <QueryError error={states.error} retry={() => void states.refetch()} /> : null}
      <label>Município<select aria-label="Município" value={draft.get('municipio') ?? ''} disabled={!draft.get('uf') || municipalities.isFetching} onChange={event => applyTerritory(draft.get('uf') ?? '', event.target.value)}><option value="">Todos</option>{draft.get('municipio') && !territories.some(item => item.codigo === draft.get('municipio')) ? <option value={draft.get('municipio')!}>{draft.get('municipio')} (confirmar no domínio Receita)</option> : null}{territories.map(item => <option key={item.codigo} value={item.codigo}>{item.descricao}</option>)}</select></label>
      <form key={formReset + PARTNER_MAP_FILTER_KEYS.map(key => filters[key]).join('|')} onChange={markDirty} onSubmit={submitFilters}>
        <CnpjOtherQueries search={search} dirty={dirty} blocked={blocked}><CnpjB2BFilters search={search} onDraftChange={markDirty} />
        <label>Nome do sócio (opcional)<input name="q" defaultValue={filters.q ?? ''} /></label>
        <label>Correspondência<select name="q_modo" defaultValue={filters.q_modo ?? 'contendo'}><option value="contendo">Contendo</option><option value="inicio">Início</option><option value="fim">Fim</option><option value="exato">Exato</option></select></label>
        <div className="cnpj-extra-fields">{EXTRA_FILTERS.map(([key, label]) => <label key={key}>{label}<input name={key} defaultValue={filters[key] ?? ''} /></label>)}</div></CnpjOtherQueries>
        <button>Aplicar filtros</button><button type="button" onClick={clearFilters}>Limpar filtros</button>
      </form>
    </aside>
    <div>
      <p className="hint">A localização pertence exclusivamente ao estabelecimento. Nome e documento mascarado não comprovam uma identidade civil única. Cada relação publicada é preservada.</p>
      <section className="cno-map-card" aria-label="Explorar participações por estabelecimento no mapa">
        <div className="cno-map-heading"><div><h2>{selectedMunicipality?.descricao ?? (draft.get('uf') ? `Municípios de ${draft.get('uf')}` : 'Explore o Brasil')}</h2><p>Clique em {draft.get('uf') ? 'um município' : 'uma UF'} para editar o rascunho; depois aplique os filtros.</p></div>{draft.get('uf') ? <button type="button" onClick={clearFilters}>Voltar ao Brasil</button> : null}</div>
        {!blocked && map.isFetching ? <p role="status">Carregando cobertura cartográfica…</p> : null}
        {!blocked && map.isError ? <QueryError error={map.error} retry={() => { if (!blocked) void map.refetch() }} /> : null}
        {!blocked && map.data?.release === null ? <p role="status">Publicação CNPJ indisponível para o mapa.</p> : null}
        {!blocked && map.data && list.data && map.data.release !== null && !compatible ? <p role="alert">Mapa e resultados têm publicações ou filtros incompatíveis. <button type="button" onClick={() => { if (!blocked) { void map.refetch(); void list.refetch() } }}>Atualizar mapa e resultados</button></p> : null}
        <Suspense fallback={<p role="status">Carregando mapa…</p>}><TerritoryMap uf={draft.get('uf') ?? ''} names={draft.get('uf') ? municipalityNames : stateNames} selectedMunicipalityIbge={selectedMunicipality?.codigo_ibge ?? null} points={points} returnTo={returnTo} onState={selectState} onMunicipality={selectMunicipality} /></Suspense>
        {!blocked && map.data ? <p className="cno-map-coverage">{map.data.coverage.points_total} relações com coordenadas entre {map.data.coverage.results_total} relações participação/estabelecimento · {map.data.coverage.without_coordinates_total} sem coordenadas válidas · release {map.data.release ?? 'indisponível'}.{map.data.coverage.truncated ? ` Exibindo ${map.data.coverage.returned_points} de ${map.data.coverage.points_total} relações no mapa (limite ${map.data.coverage.limit}; máximo ${map.data.coverage.maximum_limit}).` : ' Nenhuma relação com coordenadas foi truncada.'} {compatible ? 'Mapa e lista têm filtros e publicação compatíveis.' : 'Compatibilidade entre mapa e lista ainda não confirmada.'}</p> : null}
        {!blocked && map.data && compatible && points.length === 0 ? <p role="status">Nenhum estabelecimento com coordenadas válidas neste recorte.</p> : null}
        <p className="cno-map-caption">Localização aproximada pelo CEP. Um marcador pode reunir várias relações no mesmo local; abra o popup para ver todas. Relações sem coordenadas permanecem na lista. Compatibilidade de release e filtros não garante snapshot transacional: CNPJ não possui versionamento por linha.</p>
        {!blocked && map.data ? <details><summary>Filtros efetivamente aplicados</summary><dl>{Object.entries(map.data.filters).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></details> : null}
      </section>
      <section className="cno-results-panel" aria-label="Resultados de participações por estabelecimento"><h2>Participações por estabelecimento do recorte</h2>
        {list.isPending && !blocked ? <p role="status">Carregando resultados…</p> : null}
        {!blocked && list.isError ? <QueryError error={list.error} retry={() => { if (!blocked) void list.refetch() }} /> : null}
        {view?.results.length === 0 ? <Empty /> : null}
        {view && view.results.length > 0 ? <><div className="table-wrap" tabIndex={0} role="region" aria-label="Resultados textuais"><table><thead><tr><th>Sócio na fonte</th><th>Empresa / estabelecimento</th><th>CNPJ completo</th><th>Município/UF</th><th>Participação / localização</th><th>Navegação</th></tr></thead><tbody>{view.results.map((item, index) => <tr key={`${item.identity.release}-${item.identity.participation_id}-${item.identity.establishment_id}-${index}`}>
          <td>{item.partner.nome_socio_ou_razao_social}<br /><small>{item.partner.cnpj_cpf_socio ?? 'Documento não informado'}</small></td>
          <td>{item.company.razao_social}<br />{item.establishment.nome_fantasia}</td><td>{item.establishment.cnpj}</td>
          <td>{item.establishment.municipio?.descricao ?? 'Município não informado'} / {item.establishment.uf}</td>
          <td>Participação {item.participation.id} · {item.participation.qualificacao_socio?.descricao}<br />{item.establishment.geolocation.status === 'available' ? 'Localização aproximada pelo CEP' : 'Sem coordenadas válidas'}</td>
          <td><PartnerMapLinks item={item} returnTo={returnTo} /></td>
        </tr>)}</tbody></table></div><Pagination page={view.page} pageSize={view.pageSize} count={view.count} previous={view.hasPrevious} next={view.hasNext} onPage={changePage} /></> : null}
      </section>
    </div>
  </div>
}
