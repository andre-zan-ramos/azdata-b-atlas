import { test, expect } from './fixtures'

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
    const input = page.getByRole('combobox', { name: 'Tipo de estabelecimento', exact: true })
    await input.click()
    await expect(page.getByRole('option', { name: /0010100/ })).toBeVisible()
    await input.press('ArrowDown')
    await input.press('Enter')
    await expect(page.getByRole('button', { name: 'Remover 0010100' })).toBeVisible()
    await input.click()
    await page.getByRole('button', { name: 'Pr\u00f3xima', exact: true }).click()
    await page.getByRole('option', { name: /6201501/ }).click()
    await input.fill('software')
    await expect.poll(() => calls.at(-1)?.searchParams.get('descricao')).toBe('software')
    expect(calls.every(url => !url.searchParams.has('codigo'))).toBe(true)
    await input.press('Escape')
    await expect(page).toHaveURL(entry)
    await expect(page.getByRole('button', { name: 'Remover 0010100' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover 6201501' })).toBeVisible()
    await page.getByText('Demais consultas', { exact: true }).click()
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
