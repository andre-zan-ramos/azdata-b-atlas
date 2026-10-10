import { test, expect } from './fixtures'

for (const path of ['/receita-federal/cnpj', '/receita-federal/cnpj/socios']) {
  test(`Clique municipal usa o domínio carregado posteriormente: ${path}`, async ({ page, context, evidence }) => {
    await context.route('**/cnpj/dominios/municipios/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 800))
      await route.fulfill({ json: { count: 1, next: null, previous: null, results: [{ codigo: '4123', codigo_ibge: '3106200', descricao: 'Belo Horizonte', uf: 'MG' }] } })
    })
    await page.goto(`${path}?modo=mapa&uf=MG`)
    const municipality = page.getByRole('combobox', { name: 'Município', exact: true })
    await expect(municipality.locator('option[value="4123"]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Selecionar Belo Horizonte', exact: true }).click()
    await expect(municipality).toHaveValue('4123')
    await expect(page.getByRole('heading', { name: 'Belo Horizonte', exact: true })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('municipio')).toBeNull()
    expect(evidence.requests.filter(item => /\/(mapa|mapa\/resultados)\/$/.test(item.path))).toHaveLength(0)
  })
}

test('Estabelecimentos do recorte abrem em diálogo com fechamento e retorno do foco', async ({ page }) => {
  await page.goto('/receita-federal/cnpj?modo=mapa&uf=MG&inicio_atividade_de=2025-01-01')
  const dialog = page.getByRole('dialog', { name: 'Estabelecimentos do recorte' })
  const trigger = page.getByRole('button', { name: 'Ver estabelecimentos', exact: true })
  await expect(dialog).not.toBeVisible()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('tbody tr').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
