import { test, expect } from './fixtures'

for (const path of ['/receita-federal/cnpj', '/receita-federal/cnpj/socios', '/receita-federal/cno']) {
  test(`Ajuda sob demanda e nome municipal completo: ${path}`, async ({ page, context }) => {
    // This municipality is absent from the Receita/CNO filter fixtures.
    await context.route('**/api/v4/malhas/**', route => route.fulfill({ json: {
      type: 'FeatureCollection', features: [{ type: 'Feature', properties: { codarea: '3127701' },
        geometry: { type: 'Polygon', coordinates: [[[-45, -21], [-43, -21], [-43, -19], [-45, -19], [-45, -21]]] } }],
    } }))
    await page.goto(`${path}?modo=mapa&uf=MG`)
    const municipality = page.getByRole('button', { name: 'Selecionar Governador Valadares', exact: true })
    await expect(municipality).toBeVisible()
    await municipality.hover()
    await expect(page.locator('.leaflet-tooltip')).toHaveText('Governador Valadares')
    const help = page.getByRole('button', { name: 'Informações do mapa', exact: true })
    const dialog = page.getByRole('dialog', { name: 'Informações do mapa', exact: true })
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText(/snapshot transacional/)).toHaveCount(0)
    await help.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/roda do mouse/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(help).toBeFocused()
  })
}
