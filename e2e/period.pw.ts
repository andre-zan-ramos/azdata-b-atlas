import { test, expect } from './fixtures'

for (const area of ['', '/socios']) for (const width of [375, 1440]) {
  test(`Datas visíveis ${area || 'Empresas'} ${width}: rascunho e aplicação`, async ({ page, evidence }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/receita-federal/cnpj${area}?modo=mapa&uf=MG`)
    const calls = () => evidence.requests.filter(row => /\/(mapa|mapa\/resultados)\/$/.test(row.path))
    const start = page.getByLabel('Início de atividade: de', { exact: true })
    const end = page.getByLabel('Início de atividade: até', { exact: true })
    await expect(page.locator('.cnpj-other-queries')).not.toHaveAttribute('open')
    await expect(start).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Tipo de estabelecimento', exact: true })).toBeVisible()
    await start.fill('2025-01-01')
    await end.fill('2024-12-31')
    await expect(page.getByRole('alert').filter({ hasText: 'posterior' })).toBeVisible()
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
    expect(calls()).toHaveLength(0)
    await end.fill('')
    await page.getByLabel('Evento da situação cadastral: até', { exact: true }).fill('2025-12-31')
    expect(calls()).toHaveLength(0)
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click()
    await expect.poll(() => calls().length).toBe(2)
    for (const call of calls()) {
      expect(call.params.inicio_atividade_de).toBe('2025-01-01')
      expect(call.params.situacao_evento_ate).toBe('2025-12-31')
      expect(call.params.inicio_atividade_ate).toBeUndefined()
    }
    await start.fill('2024-01-01')
    expect(calls()).toHaveLength(2)
    await expect(start).toHaveValue('2024-01-01')
    const dimensions = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth])
    expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1)
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
    await expect(start).toHaveValue('')
    expect(calls()).toHaveLength(2)
  })
}
