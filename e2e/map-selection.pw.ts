import { test, expect } from './fixtures'

test('UF e município permitem pesquisa sem acentos e seleção pelo teclado', async ({ page, context, evidence }) => {
  await context.route('**/localidades/estados', route => route.fulfill({ json: [
    { id: 31, sigla: 'MG', nome: 'Minas Gerais' },
    { id: 23, sigla: 'CE', nome: 'Ceará' },
    { id: 12, sigla: 'AC', nome: 'Acre' },
  ] }))
  await page.goto('/receita-federal/cnpj?modo=mapa', { waitUntil: 'domcontentloaded' })
  const uf = page.getByRole('combobox', { name: 'UF', exact: true })
  const municipality = page.getByRole('combobox', { name: 'Município', exact: true })
  await expect(municipality).toBeDisabled()
  await uf.click()
  await expect(page.getByRole('option')).toHaveText(['Brasil', 'Acre (AC)', 'Ceará (CE)', 'Minas Gerais (MG)'])
  await uf.fill('ceara')
  await expect(page.getByRole('option')).toHaveText(['Ceará (CE)'])
  await uf.fill('minas')
  await uf.press('Enter')
  await expect(uf).toHaveValue('Minas Gerais (MG)')
  await page.getByRole('button', { name: 'Abrir opções de UF', exact: true }).click()
  await expect(uf).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await uf.click()
  await expect(uf).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(municipality).toBeEnabled()
  await municipality.fill('belo')
  await expect(page.getByRole('option', { name: 'Belo Horizonte', exact: true })).toBeVisible()
  await municipality.press('Enter')
  await expect(municipality).toHaveValue('Belo Horizonte')
  await expect(page.locator('.cnpj-other-queries')).not.toHaveAttribute('open')
  expect(evidence.requests.filter(item => /\/(mapa|mapa\/resultados)\/$/.test(item.path))).toHaveLength(0)
})

for (const path of ['/receita-federal/cnpj', '/receita-federal/cnpj/socios']) {
  test(`Clique municipal usa o domínio carregado posteriormente: ${path}`, async ({ page, context, evidence }) => {
    await context.route('**/cnpj/dominios/municipios/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 800))
      await route.fulfill({ json: { count: 1, next: null, previous: null, results: [{ codigo: '4123', codigo_ibge: '3106200', descricao: 'Belo Horizonte', uf: 'MG' }] } })
    })
    await page.goto(`${path}?modo=mapa&uf=MG`, { waitUntil: 'domcontentloaded' })
    const municipality = page.getByRole('combobox', { name: 'Município', exact: true })
    await municipality.click()
    await expect(page.getByRole('option', { name: 'Belo Horizonte', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Selecionar Belo Horizonte', exact: true }).click()
    await expect(municipality).toHaveValue('Belo Horizonte')
    await expect(page.getByRole('heading', { name: 'Belo Horizonte', exact: true })).toBeVisible()
    const map = await page.locator('.cno-map').boundingBox()
    const workspace = await page.locator('.map-workspace').boundingBox()
    expect(map).not.toBeNull()
    expect(workspace).not.toBeNull()
    expect(Math.abs(map!.y + map!.height + 17 - (workspace!.y + workspace!.height))).toBeLessThan(3)
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
