import { useMutation, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
import type { EstablishmentGeolocation, GeolocationReason } from '../api/receita-federal/cnpj/types'

const ApproximatePostalMap = lazy(() => import('./approximate-postal-map'))

const reasonMessages: Record<GeolocationReason, string> = {
  cep_missing: 'O cadastro oficial não informa um CEP para esta tentativa.',
  cep_invalid: 'O CEP do cadastro oficial não está em um formato válido para esta tentativa.',
  not_found: 'O CEP do cadastro oficial não foi localizado pelo provedor.',
  no_coordinates: 'O provedor não retornou coordenadas para o CEP cadastrado.',
  context_mismatch: 'A referência geográfica divergiu do contexto cadastral atual.',
  load_in_progress: 'A base CNPJ está em atualização. A referência poderá ser solicitada futuramente.',
  producer_unavailable: 'O serviço de enriquecimento está temporariamente indisponível.',
  provider_unavailable: 'O provedor geográfico está temporariamente indisponível.',
  feature_disabled: 'A localização aproximada está desabilitada no momento.',
}

function reasonMessage(reason: GeolocationReason | null, fallback: string) { return reason ? reasonMessages[reason] : fallback }

function GeolocationState({ geolocation, requesting, failed }: { geolocation: EstablishmentGeolocation; requesting: boolean; failed: boolean }) {
  if (requesting) return <p role="status">Solicitação de localização em andamento…</p>
  if (failed) return <p role="alert">Não foi possível solicitar a localização agora. O cadastro oficial permanece disponível.</p>
  if (geolocation.status === 'not_requested') return <p>Ainda não houve tentativa de localização aproximada para este estabelecimento.</p>
  if (geolocation.status === 'pending') return <p>O processamento da localização está em andamento. Esta página não fará consultas repetidas.</p>
  if (geolocation.status === 'available') {
    if (!geolocation.stale && geolocation.reason !== 'context_mismatch' && geolocation.latitude !== null && geolocation.longitude !== null && geolocation.precision === 'postal_code_approximation') return <><p><strong>Localização aproximada pelo CEP.</strong> O ponto não representa o endereço exato.</p><Suspense fallback={<p role="status">Carregando mapa…</p>}><ApproximatePostalMap latitude={geolocation.latitude} longitude={geolocation.longitude} /></Suspense></>
    return <p>A referência disponível não contém uma coordenada postal compatível para exibição.</p>
  }
  if (geolocation.status === 'unavailable') return <p>{reasonMessage(geolocation.reason, 'Não foi possível obter uma referência aproximada para o CEP cadastrado.')}</p>
  if (geolocation.status === 'temporary_error') return <p>{reasonMessage(geolocation.reason, 'A localização aproximada está temporariamente indisponível. Uma nova tentativa poderá ser feita futuramente.')}</p>
  if (geolocation.status === 'stale') return <p>{reasonMessage(geolocation.reason, 'A referência geográfica precisa ser atualizada antes de ser exibida.')}</p>
  return <p>{reasonMessage(geolocation.reason, 'A localização aproximada está desabilitada no momento.')}</p>
}

export function EstablishmentGeolocationSection({ cnpj, geolocation, refetch }: { cnpj: string; geolocation: EstablishmentGeolocation; refetch: () => Promise<unknown> }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationKey: ['cnpj', 'geolocation-request', cnpj], mutationFn: () => cnpjApi.requestEstablishmentGeolocation(cnpj), retry: false })
  const { mutate } = mutation
  useEffect(() => {
    const attemptKey = ['cnpj', 'geolocation-request-attempt', cnpj] as const
    if (geolocation.status !== 'not_requested' || queryClient.getQueryData(attemptKey)) return
    queryClient.setQueryData(attemptKey, true)
    mutate(undefined, { onSettled: () => { void refetch() } })
  }, [cnpj, geolocation.status, mutate, queryClient, refetch])
  const current = mutation.data ?? geolocation
  return <section className="detail-card establishment-geolocation" aria-labelledby="establishment-geolocation-title"><h2 id="establishment-geolocation-title">Localização aproximada pelo CEP</h2><GeolocationState geolocation={current} requesting={mutation.isPending} failed={mutation.isError} /></section>
}
