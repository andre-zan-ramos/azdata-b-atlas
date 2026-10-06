import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const areas = [
  { name: 'Empresas', path: '/receita-federal/cnpj', query: 'atlas', label: 'Encontre uma empresa', marker: 'Estabelecimento CNPJ 00123456000100. Abrir popup' },
  { name: 'Sócios', path: '/receita-federal/cnpj/socios', query: 'maria', label: 'Encontre um sócio', marker: '2 relações por estabelecimento neste local. Abrir popup' },
  { name: 'Obras', path: '/receita-federal/cno', query: '000001', label: 'Encontre uma obra', marker: 'Ocorrência 41, CNO 000001. Abrir popup' },
] as const

async function checkPageWidth(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content, 'Document must not overflow horizontally').toBeLessThanOrEqual(dimensions.width + 1)
}

async function openResults(page: Page) {
  const summary = page.locator('.cno-results-disclosure > summary')
  if (await summary.count()) await summary.click()
  await expect(page.getByRole('region', { name: 'Resultados textuais' })).toBeVisible()
}

for (const width of [1440, 375]) {
  for (const area of areas) {
    test(`${area.name}: Busca/Mapa a ${width}px, resultados e largura`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${area.path}?modo=busca&q=${area.query}&page=1`)
      await expect(page.getByRole('textbox', { name: area.label })).toHaveValue(area.query)
      if (area.name === 'Sócios') await page.getByRole('button', { name: /MARIA TESTE.*2 participações/ }).click()
      await expect(page.locator('tbody tr').first()).toBeVisible()
      await checkPageWidth(page)
      await testInfo.attach('busca', { body: await page.screenshot(), contentType: 'image/png' })

      await page.getByRole('link', { name: 'Mapa', exact: true }).click()
      await page.getByRole('combobox', { name: 'UF', exact: true }).selectOption('MG')
      if (area.name === 'Obras') await page.getByRole('button', { name: 'Pesquisar', exact: true }).click()
      await expect(page.getByRole('button', { name: area.marker, exact: true })).toBeVisible()
      await openResults(page)
      const results = page.getByRole('region', { name: 'Resultados textuais' })
      await expect(results.locator('tbody tr').first()).toBeVisible()
      await checkPageWidth(page)
      if (width === 375) {
        // Horizontal scrolling belongs to the table region, never the whole document.
        await results.focus()
        await expect(results).toBeFocused()
        await results.evaluate(element => { element.scrollLeft = element.scrollWidth })
        expect(await results.evaluate(element => element.scrollWidth <= element.clientWidth || element.scrollLeft > 0)).toBe(true)
      }
      await page.locator('.leaflet-container').scrollIntoViewIfNeeded()
      await testInfo.attach('mapa', { body: await page.screenshot(), contentType: 'image/png' })
    })
  }
}

for (const area of areas) {
  test(`${area.name}: teclado real no marcador e seleção territorial`, async ({ page, evidence }) => {
    await page.goto(`${area.path}?modo=mapa&uf=MG&page=1`)
    const marker = page.getByRole('button', { name: area.marker, exact: true })
    await expect(marker).toBeVisible()
    await marker.focus()
    await expect(marker).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(marker).not.toBeFocused()
    for (const key of ['Enter', 'Space']) {
      await marker.focus()
      await page.keyboard.press(key)
      const popup = page.locator('.leaflet-popup')
      await expect(popup).toBeVisible()
      expect(await popup.evaluate(element => element.contains(document.activeElement))).toBe(true)
      if (area.name === 'Sócios') await expect(popup.locator('article')).toHaveCount(2)
      await page.keyboard.press('Escape')
      await expect(popup).toHaveCount(0)
      await expect(marker).toBeFocused()
    }
    const municipality = page.getByRole('button', { name: 'Selecionar Belo Horizonte', exact: true })
    await expect(municipality).toBeVisible()
    await municipality.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => new URL(page.url()).searchParams.get(area.name === 'Obras' ? 'codigo_municipio' : 'municipio')).toBe('4123')
    await expect(page.getByRole('heading', { name: 'Belo Horizonte', exact: true })).toBeVisible()
    expect(evidence.requests.every(request => request.method === 'GET')).toBe(true)
    expect(evidence.requests.filter(request => request.path.endsWith('/mapa/')).every(request => !('page' in request.params) && !('include_total' in request.params))).toBe(true)
  })
}

test('Obras: detalhe, retorno, histórico e recarga preservam o recorte; nenhum POST automático', async ({ page, evidence }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  const entry = '/receita-federal/cno?modo=mapa&uf=MG&codigo_municipio=4123&page=1&page_size=10'
  await page.goto(entry)
  await openResults(page)
  await page.getByRole('region', { name: 'Resultados textuais' }).getByRole('link', { name: 'CNO 000001', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'CNO 000001', exact: true })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('return_to')).toBe(entry)
  await page.getByRole('link', { name: 'Voltar à consulta anterior', exact: true }).click()
  await expect(page).toHaveURL(entry)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'CNO 000001', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(entry)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'UF', exact: true })).toHaveValue('MG')
  await expect(page.getByRole('combobox', { name: 'Município', exact: true })).toHaveValue('Belo Horizonte')
  await expect(page.getByRole('button', { name: areas[2].marker, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Solicitar localizações da página (até 50)', exact: true })).toBeEnabled()
  expect(evidence.requests.every(request => request.method === 'GET')).toBe(true)
})

test('Sócios: pagina somente a lista e preserva estado separado de Busca/Mapa', async ({ page, evidence }) => {
  await page.goto('/receita-federal/cnpj/socios?modo=mapa&uf=MG&page=1')
  await expect(page.getByRole('button', { name: areas[1].marker, exact: true })).toBeVisible()
  const mapCalls = () => evidence.requests.filter(request => request.path.endsWith('/socios/mapa/')).length
  expect(mapCalls()).toBe(1)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible()
  expect(mapCalls()).toBe(1)
  await page.getByRole('link', { name: 'Busca', exact: true }).click()
  await page.getByRole('textbox', { name: areas[1].label }).fill('maria')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sócios encontrados', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Mapa', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'UF', exact: true })).toHaveValue('MG')
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Busca', exact: true }).click()
  await expect(page.getByRole('textbox', { name: areas[1].label })).toHaveValue('maria')
  expect(evidence.requests.some(request => /\/participacoes\/|\/empresas\//.test(request.path))).toBe(false)
})

test('Sócios: falha do mapa mantém resultados textuais sem repetir a consulta', async ({ page, evidence }) => {
  evidence.failPartnerMap = true
  await page.goto('/receita-federal/cnpj/socios?modo=mapa&uf=MG&page=1')
  await expect(page.getByText('Mapa indisponível no teste.', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resultados textuais' }).locator('tbody tr')).toHaveCount(2)
  await expect(page.getByRole('button', { name: areas[1].marker, exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByText('Página 2', { exact: true })).toBeVisible()
  expect(evidence.requests.filter(request => request.path.endsWith('/socios/mapa/'))).toHaveLength(1)
})
