import { test, expect, openOtherQueries } from './fixtures'

test('CNAE: painel em 375px, seleção literal e reinício consciente após 409', async ({ page, evidence }, testInfo) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/receita-federal/cnpj?modo=mapa&uf=MG&municipio=4123&cnaes=5611201,5611201&atividade_escopo=principal&page=1')
  await openOtherQueries(page)
  await page.getByRole('button', { name: 'Selecionar CNAEs', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Selecionar CNAEs' })
  await page.getByRole('button', { name: 'Consultar catálogo oficial CNAE', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Consulta do catálogo oficial CNAE' })
  await expect(panel.getByText('CNAE-Subclasses 2.3', { exact: true })).toBeVisible()
  await panel.getByText('Proveniência, cobertura e contagens globais', { exact: true }).click()
  await expect(panel.getByText('a'.repeat(64), { exact: true })).toBeVisible()
  await panel.getByText('Proveniência, cobertura e contagens globais', { exact: true }).click()
  await panel.getByRole('button', { name: 'Consultar nós CNAE' }).click()
  await panel.getByRole('button', { name: 'Selecionar 0010100' }).click()
  await expect(dialog.getByRole('button', { name: 'Remover 5611201', exact: true })).toHaveCount(2)
  await expect(dialog.getByRole('button', { name: 'Remover 0010100', exact: true })).toBeVisible()
  const dimension = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimension.content).toBeLessThanOrEqual(dimension.width + 1)
  await panel.scrollIntoViewIfNeeded()
  await testInfo.attach('cnae-375', { body: await page.screenshot(), contentType: 'image/png' })
  const catalogCalls = () => evidence.requests.filter(row => row.path.endsWith('/cnae/catalogo/')).length
  const nodeCalls = () => evidence.requests.filter(row => row.path.endsWith('/cnae/nos/')).length
  evidence.cnaeChanged = true
  await panel.getByRole('button', { name: 'Próxima página CNAE' }).click()
  await expect(panel.getByRole('alert')).toContainText('A publicação CNAE mudou')
  await expect(panel.getByRole('button', { name: 'Selecionar 0010100' })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Remover 0010100', exact: true })).toBeVisible()
  expect(catalogCalls()).toBe(1)
  expect(nodeCalls()).toBe(2)
  await panel.getByRole('button', { name: 'Reiniciar com a publicação atual' }).click()
  await expect(panel.getByText('b'.repeat(64), { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Selecionar 0010100' })).toHaveCount(0)
  expect(catalogCalls()).toBe(2)
  expect(nodeCalls()).toBe(2)
  await expect(dialog.getByRole('button', { name: 'Remover 0010100', exact: true })).toBeVisible()
  expect(evidence.requests.filter(row => row.path.endsWith('/mapa/'))).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Consultar catálogo oficial CNAE', exact: true })).toBeFocused()
  expect(evidence.requests.every(row => row.method === 'GET')).toBe(true)
})

for (const area of ['Empresas', 'Sócios'] as const) {
  test(`${area}: detalhe técnico e retorno preservam filtros, página e recarga`, async ({ page, evidence }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    const entry = `/receita-federal/cnpj${area === 'Sócios' ? '/socios' : ''}?modo=mapa&uf=MG&municipio=4123&inicio_atividade_de=2026-01-01&page=2`
    await page.goto(entry)
    const resultsTrigger = page.getByRole('button', { name: 'Ver estabelecimentos', exact: true })
    if (await resultsTrigger.count()) await resultsTrigger.click()
    const rows = page.getByRole('region', { name: 'Resultados textuais' })
    await rows.getByRole('link', { name: area === 'Empresas' ? 'ATLAS TESTE' : 'Abrir participação do sócio', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: area === 'Empresas' ? 'ATLAS TESTE' : 'MARIA TESTE', exact: true })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('return_to')).toBe(entry)
    if (area === 'Sócios') {
      expect(new URL(page.url()).searchParams.get('participacao')).toBe('7')
      expect(new URL(page.url()).searchParams.get('release')).toBe('browser-fixture')
      await expect(page.getByText('***123456**', { exact: true }).first()).toBeVisible()
    }
    await page.locator('.back-link').click()
    await expect(page).toHaveURL(entry)
    await page.reload()
    if (await resultsTrigger.count()) await resultsTrigger.click()
    await expect(page.getByRole('combobox', { name: 'Município', exact: true })).toHaveValue('Belo Horizonte')
    await expect(page.getByText('Página 2', { exact: true })).toBeVisible()
    expect(evidence.requests.filter(row => row.path.startsWith('/api/v1/receita-federal/')).every(row => row.method === 'GET')).toBe(true)
    expect(evidence.requests.some(row => row.path.includes('geolocation/request'))).toBe(false)
  })
}

for (const state of ['empty', 'unavailable', 'truncated'] as const) {
  test(`Empresas: estado ${state} explicita cobertura sem inventar pontos`, async ({ page, evidence }) => {
    evidence.mapState = state
    await page.goto('/receita-federal/cnpj?modo=mapa&uf=MG&municipio=4123&inicio_atividade_de=2025-01-01&page=1')
    const resultsTrigger = page.getByRole('button', { name: 'Ver estabelecimentos', exact: true })
    if (await resultsTrigger.count()) await resultsTrigger.click()
    if (state === 'truncated') {
      await expect(page.getByText(/Exibindo 1 de 2 pontos/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Estabelecimento CNPJ 00123456000100. Abrir popup', exact: true })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Resultados textuais' }).locator('tbody tr')).toHaveCount(2)
    } else {
      await expect(page.getByRole('heading', { name: 'Nenhum resultado', exact: true })).toBeVisible()
      await expect(page.getByText('Nenhum estabelecimento com coordenadas válidas neste recorte.', { exact: true })).toBeVisible()
      await expect(page.getByText('Publicação CNPJ indisponível para o mapa.', { exact: true })).toHaveCount(state === 'unavailable' ? 1 : 0)
      await expect(page.getByRole('button', { name: /Estabelecimento CNPJ .*Abrir popup/ })).toHaveCount(0)
    }
    expect(evidence.requests.filter(row => row.path.endsWith('/estabelecimentos/mapa/'))).toHaveLength(1)
  })
}
