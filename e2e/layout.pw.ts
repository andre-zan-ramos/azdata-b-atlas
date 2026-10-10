import { test, expect } from './fixtures'

const areas = [
  { name: 'Empresas', path: '/receita-federal/cnpj', search: 'Encontre uma empresa' },
  { name: 'Sócios', path: '/receita-federal/cnpj/socios', search: 'Encontre um sócio' },
  { name: 'Obras', path: '/receita-federal/cno', search: 'Encontre uma obra' },
]

for (const width of [1366, 375]) {
  for (const area of areas) {
    test(`${area.name}: header centralizado e rolagens independentes a ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 600 })
      await page.goto(`${area.path}?modo=mapa`)
      const header = page.locator('.app-header')
      await expect(header.getByRole('navigation', { name: 'Modo de visualização' })).toBeVisible()
      await expect(page.locator('main .area-mode-switcher')).toHaveCount(0)
      await expect(page.locator('.leaflet-container')).toBeVisible()
      const filters = page.getByRole('region', { name: 'Filtros do mapa', exact: true })
      const map = page.getByRole('region', { name: 'Mapa e resultados', exact: true })
      if (area.name === 'Obras') await page.locator('.cno-advanced > summary').click()
      const switchBox = (await header.locator('.area-mode-switcher').boundingBox())!
      expect(Math.abs(switchBox.x + switchBox.width / 2 - width / 2)).toBeLessThan(2)
      await page.screenshot({ path: testInfo.outputPath('layout.png') })
      const filterBox = (await filters.boundingBox())!
      const mapBox = (await map.boundingBox())!
      const headerBox = (await header.boundingBox())!
      expect(filterBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height)
      if (width > 850) {
        expect(Math.abs(filterBox.width - mapBox.width)).toBeLessThan(2)
        expect(Math.abs(filterBox.y - mapBox.y)).toBeLessThan(2)
        const territory = page.locator('.leaflet-overlay-pane path').first()
        await expect(territory).toBeAttached()
        const initialWidth = (await territory.boundingBox())!.width
        const canvasBox = (await page.locator('.leaflet-container').boundingBox())!
        await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + 80)
        await page.mouse.wheel(0, -120)
        await expect.poll(async () => (await territory.boundingBox())!.width).toBeGreaterThan(initialWidth * 1.2)
        expect(await map.evaluate(element => element.scrollTop)).toBe(0)
        expect(await filters.evaluate(element => element.scrollTop)).toBe(0)
      }
      await filters.hover()
      await page.mouse.wheel(0, 400)
      await expect.poll(() => filters.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      expect(await map.evaluate(element => element.scrollTop)).toBe(0)
      const filterScroll = await filters.evaluate(element => element.scrollTop)
      // Wheel over the column padding, outside Leaflet's zoom interaction.
      await page.mouse.move(mapBox.x + 2, mapBox.y + 20)
      await page.mouse.wheel(0, 400)
      if (await map.evaluate(element => element.scrollHeight > element.clientHeight)) {
        await expect.poll(() => map.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      } else expect(await map.evaluate(element => element.scrollTop)).toBe(0)
      expect(await filters.evaluate(element => element.scrollTop)).toBe(filterScroll)
      expect(await page.locator('main').evaluate(element => element.scrollTop)).toBe(0)
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await header.getByRole('link', { name: 'Busca', exact: true }).click()
      await expect(page.getByRole('textbox', { name: area.search })).toBeVisible()
      await header.getByRole('link', { name: 'Mapa', exact: true }).click()
      await expect(filters).toBeVisible()
    })
  }
}
