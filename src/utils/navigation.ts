export function internalReturnTo(value: string | null, fallback = '/receita-federal/cnpj') {
  return value?.startsWith('/receita-federal/cnpj') && !value.startsWith('//') ? value : fallback
}
