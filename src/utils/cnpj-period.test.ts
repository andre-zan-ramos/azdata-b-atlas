import { expect, it } from 'vitest'
import { PERIOD_KEYS, readPeriod, validatePeriod, periodSummary } from './cnpj-period'
import { mapEligibility } from './cnpj-map-preparation'
it.each(PERIOD_KEYS)('accepts each open bound %s without CNAE', key => {
  const search = new URLSearchParams({ uf: 'MG', [key]: '2024-02-29' })
  expect(validatePeriod(readPeriod(search))).toBeNull()
  expect(mapEligibility(search)).toBeNull()
  expect(periodSummary(readPeriod(search))).toContain('29/02/2024')
})
it.each(['2025-02-29', '2025-04-31', '0000-01-01', '2025-1-01', '01/01/2025', '2025-01-01 ', 'invalid'])('rejects unreal or malformed dates %s in either group', value => {
  for (const key of PERIOD_KEYS) expect(validatePeriod(readPeriod(new URLSearchParams({ [key]: value })))).not.toBeNull()
})
it.each(['inicio_atividade', 'situacao_evento'])('rejects inverted %s and accepts equal bounds', prefix => {
  expect(validatePeriod(readPeriod(new URLSearchParams({ [`${prefix}_de`]: '2025-02-01', [`${prefix}_ate`]: '2025-01-01' })))).not.toBeNull()
  expect(validatePeriod(readPeriod(new URLSearchParams({ [`${prefix}_de`]: '2025-01-01', [`${prefix}_ate`]: '2025-01-01' })))).toBeNull()
})
it('summarizes both intervals and leaves empty periods ineligible', () => {
  expect(periodSummary(readPeriod(new URLSearchParams('inicio_atividade_de=2025-01-01&inicio_atividade_ate=2025-12-31&situacao_evento_ate=2025-06-01')))).toBe('Início de atividade: 01/01/2025 a 31/12/2025; Evento da situação cadastral: até 01/06/2025')
  expect(mapEligibility(new URLSearchParams('uf=MG'))).not.toBeNull()
  expect(mapEligibility(new URLSearchParams('uf=MG&inicio_atividade_de=2025-01-01&inicio_atividade_de=2025-02-01'))).not.toBeNull()
})
