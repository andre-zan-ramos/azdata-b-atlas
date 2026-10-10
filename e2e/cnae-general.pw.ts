import { test, expect, openOtherQueries } from './fixtures'

for (const area of ['', '/socios']) for (const width of [375, 1440]) {
  test(`CNAE geral ${area || 'Empresas'} ${width}: edição isolada, páginas e teclado`, async ({ page, evidence }) => {
    await page.setViewportSize({ width, height: 900 })
    const calls: URL[] = []
    await page.route('**/dominios/cnaes/**', route => {
      const url = new URL(route.request().url()); calls.push(url)
      const second = url.searchParams.get('page') === '2'
      return route.fulfill({ json: { count: null, next: second ? null : 'next', previous: second ? 'previous' : null, results: [{ codigo: second ? '6201501' : '0010100', descricao: second ? 'Desenvolvimento de software' : 'Literal Receita fora dos segmentos' }] }, headers: { 'access-control-allow-origin': '*' } })
    })
    const entry = `/receita-federal/cnpj${area}?modo=mapa&uf=MG&return_to=%2Fdestino`
    await page.goto(entry)
    const businessCalls = () => evidence.requests.filter(row => /\/(mapa|mapa\/resultados)\/$/.test(row.path))
    const trigger = page.getByRole('button', { name: 'Selecionar CNAEs', exact: true })
    await openOtherQueries(page)
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Selecionar CNAEs' })
    await expect(dialog.getByLabel('Buscar descrição Receita')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Limpar', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(dialog.getByLabel('Buscar descrição Receita')).toBeFocused()
    await dialog.getByRole('checkbox', { name: /0010100/ }).check()
    await dialog.getByRole('button', { name: 'Próxima página Receita' }).click()
    await dialog.getByRole('checkbox', { name: /6201501/ }).check()
    await dialog.getByLabel('Buscar descrição Receita').fill('software')
    await dialog.getByLabel('Buscar descrição Receita').press('Enter')
    await expect.poll(() => calls.at(-1)?.searchParams.get('descricao')).toBe('software')
    expect(calls.every(url => !url.searchParams.has('codigo'))).toBe(true)
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(trigger).toBeFocused()
    await expect(page).toHaveURL(entry)
    await expect(page.getByText('Alterações ainda não aplicadas.')).toBeVisible()
    await openOtherQueries(page)
    await trigger.click()
    await expect(dialog.getByRole('button', { name: 'Remover 6201501' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Limpar', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(page.getByRole('button', { name: 'Remover 0010100' })).toBeVisible()
    expect(businessCalls()).toHaveLength(0)
    const dimensions = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth])
    expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1)
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect.poll(() => businessCalls().length).toBe(2)
    for (const call of businessCalls()) {
      expect(call.params.cnaes).toBe('0010100,6201501')
      expect(call.params.atividade_escopo).toBe('principal')
      expect(call.params.situacao_cadastral).toBeUndefined()
      expect(call.params.municipio).toBeUndefined()
    }
  })
}
