export function internalReturnTo(value: string | null, fallback = '/receita-federal/cnpj') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  const path = value.split(/[?#]/, 1)[0]
  const cnpj = /^\/receita-federal\/cnpj(?:\/(?:estabelecimentos(?:\/[0-9]+)?|empresas(?:\/[0-9]+)?|socios(?:\/detalhes)?))?\/?$/
  const cno = /^\/receita-federal\/cno(?:\/vinculos|\/obras\/[0-9]+)?\/?$/
  return cnpj.test(path) || cno.test(path) ? value : fallback
}
