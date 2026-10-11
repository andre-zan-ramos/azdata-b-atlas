import { test, expect } from './fixtures'

for (const area of ['', '/socios']) for (const width of [375, 1440]) {
  test(`CNAE geral ${area || 'Empresas'} ${width}: edição isolada, páginas e teclado`, async ({ page, evidence }) => {
    await page.setViewportSize({ width, height: 900 })
    const calls: URL[] = []
    await page.route('**/dominios/cnaes/**', route => {
      const url = new URL(route.request().url()); calls.push(url)
      const second = url.searchParams.get('page') === '2'
      return route.fulfill({ json: { count: 11, next: second ? null : 'next', previous: second ? 'previous' : null, results: [{ codigo: second ? '6201501' : '0010100', descricao: second ? 'Desenvolvimento de software' : 'Literal Receita fora dos segmentos' }] }, headers: { 'access-control-allow-origin': '*' } })
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
    await page.getByRole('button', { name: 'Anterior', exact: true }).click()
    await expect(page.locator('.cnae-combobox-pagination')).toHaveText(/Anterior1Próxima/)
    await expect(page.getByRole('option', { name: /Literal Receita fora dos segmentos/ })).toBeVisible()
    await input.fill('software')
    await expect.poll(() => calls.at(-1)?.searchParams.get('descricao')).toBe('software')
    expect(calls.at(-1)?.searchParams.get('page')).toBe('1')
    await input.fill('0010100')
    await expect.poll(() => calls.at(-1)?.searchParams.get('descricao')).toBe('0010100')
    expect(calls.every(url => url.searchParams.get('page_size') === '10')).toBe(true)
    expect(calls.every(url => !url.searchParams.has('codigo'))).toBe(true)
    await input.press('Escape')
    await expect(page).toHaveURL(entry)
    await expect(page.getByRole('button', { name: 'Remover 0010100' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remover 6201501' })).toBeVisible()
    await input.click()
    await expect(page.getByRole('option', { name: /0010100/ })).toBeVisible()
    await input.press('Escape')
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

for (const area of ['', '/socios']) {
  test(`CNAE geral ${area || 'Empresas'}: limite explícito sem truncar seleção`, async ({ page, evidence }) => {
    const codes = Array.from({ length: 100 }, (_, index) => String(index).padStart(7, '0'))
    await page.goto(`/receita-federal/cnpj${area}?modo=mapa&uf=MG&cnaes=${codes.join(',')}&atividade_escopo=principal_ou_secundaria`)
    const input = page.getByRole('combobox', { name: 'Tipo de estabelecimento', exact: true })
    await input.click()
    await page.getByRole('option', { name: /0010100/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Selecione até 100 CNAEs.' })).toBeVisible()
    await input.press('Escape')
    await expect(page.getByRole('button', { name: /^Remover / })).toHaveCount(100)
    await expect(page.locator('input[name="cnaes"]')).toHaveValue(codes.join(','))
    expect(evidence.requests.filter(row => /\/(mapa|mapa\/resultados)\/$/.test(row.path))).toHaveLength(0)
  })
}
