import { test, expect } from './fixtures'

const cuts = [
  { name: 'UF + CNAEs', filters: { uf: 'MG', cnaes: '0010100,6201501', atividade_escopo: 'principal' } },
  { name: 'UF + períodos abertos', filters: { uf: 'MG', inicio_atividade_de: '2025-01-01', situacao_evento_ate: '2025-12-31' } },
  { name: 'UF + CNAEs + dois períodos', filters: { uf: 'MG', cnaes: '0010100,6201501', atividade_escopo: 'principal', inicio_atividade_ate: '2025-12-31', situacao_evento_de: '2025-06-01' } },
  { name: 'UF/município + CNAEs', filters: { uf: 'MG', municipio: '4123', cnaes: '0010100,6201501', atividade_escopo: 'principal' } },
]

for (const area of ['', '/socios']) for (const cut of cuts) {
  test(`Validação final ${area || 'Empresas'}: ${cut.name}`, async ({ page, evidence }) => {
    const filters = Object.fromEntries(Object.entries(cut.filters)) as Record<string, string>
    await page.goto(`/receita-federal/cnpj${area}?${new URLSearchParams({ modo: 'mapa', ...filters })}`)
    const calls = () => evidence.requests.filter(row => /\/(mapa|mapa\/resultados)\/$/.test(row.path))
    await expect.poll(() => calls().length).toBe(2)
    // Assert the entire filter set: literal OR codes travel together, and each
    // independent AND constraint reaches both endpoints without implicit values.
    for (const call of calls()) {
      const actual = Object.fromEntries(Object.entries(call.params).filter(([key]) => !['page', 'page_size', 'include_total', 'limit'].includes(key)))
      expect(actual).toEqual(filters)
    }
    await expect(page.getByLabel('Resumo dos filtros aplicados')).toContainText('Aplicado:')
    // Focus/reconnection must not repeat the heavy queries, even for eligible URLs.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('offline'))
      window.dispatchEvent(new Event('online'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    // Allow queued query notifications/network work before clearing eligibility.
    await page.waitForTimeout(300)
    expect(calls()).toHaveLength(2)
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
    await expect(page.getByLabel('Resumo dos filtros aplicados')).toContainText('Nenhum recorte aplicado')
    expect(calls()).toHaveLength(2)
  })
}
