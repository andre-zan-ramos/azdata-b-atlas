import { test, expect } from './fixtures'

for (const area of ['', '/socios']) for (const width of [375, 1440]) {
  test(`Tipos do domínio completo ${area || 'Empresas'} ${width}`, async ({ page, evidence }) => {
    await page.setViewportSize({ width, height: 900 })
    const domains: URL[] = []
    await page.route('**/dominios/cnaes/**', route => {
      domains.push(new URL(route.request().url()))
      return route.fulfill({ json: { count: null, next: null, previous: null, results: [{ codigo: '6201501', descricao: 'Desenvolvimento de programas de computador sob encomenda' }] }, headers: { 'access-control-allow-origin': '*' } })
    })
    await page.goto(`/receita-federal/cnpj${area}?modo=mapa&uf=MG`)
    const calls = () => evidence.requests.filter(row => /\/(mapa|mapa\/resultados)\/$/.test(row.path))
    const type = page.getByRole('combobox', { name: 'Tipo de estabelecimento', exact: true })
    await expect(type).toBeVisible()
    expect(domains).toHaveLength(0)
    await type.fill('programas')
    await expect.poll(() => domains.at(-1)?.searchParams.get('descricao')).toBe('programas')
    await page.getByRole('option', { name: /6201501/ }).click()
    await type.press('Escape')
    await expect(page.getByRole('button', { name: 'Remover 6201501' })).toBeVisible()
    expect(calls()).toHaveLength(0)
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
    await expect.poll(() => calls().length).toBe(2)
    for (const call of calls()) {
      expect(call.params).toMatchObject({ cnaes: '6201501', atividade_escopo: 'principal' })
      expect(call.params.segmentos).toBeUndefined()
      expect(call.params.catalog_version).toBeUndefined()
    }
    await page.getByText('Demais consultas', { exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Tipo de estabelecimento', exact: true })).toHaveCount(1)
    await expect(page.getByRole('combobox', { name: 'CNAEs específicos', exact: true })).toHaveCount(0)
    await page.getByText('Demais consultas', { exact: true }).click()
    await page.getByRole('button', { name: 'Remover 6201501' }).click()
    expect(calls()).toHaveLength(2)
    await page.getByLabel('Início de atividade: de', { exact: true }).fill('2025-01-01')
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
    await expect.poll(() => calls().length).toBe(4)
    expect(calls().at(-1)?.params.cnaes).toBeUndefined()
    const dimensions = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth])
    expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1)
    await page.screenshot({ path: `test-results/activity-${area ? 'socios' : 'empresas'}-${width}.png`, fullPage: true })
  })
}
