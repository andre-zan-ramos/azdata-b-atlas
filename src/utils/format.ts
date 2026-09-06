export const digits = (value: string) => value.replace(/\D/g, '')
export function formatCnpj(value: string) { const v = digits(value); return v.length === 14 ? v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value }
export function formatDate(value?: string | null) { if (!value) return 'Não informado'; const [year, month, day] = value.split('-'); return day && month && year ? `${day}/${month}/${year}` : value }
export function formatMoney(value?: string | null) { if (!value) return 'Não informado'; const number = Number(value); return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number) : value }
export const display = (value: unknown) => value === null || value === undefined || value === '' ? 'Não informado' : String(value)
export function codedChoice(value?: string | null) { if (!value) return 'Não informado'; const normalized = value.toUpperCase(); if (['S', 'SIM', '1'].includes(normalized)) return 'Sim'; if (['N', 'NAO', 'NÃO', '0'].includes(normalized)) return 'Não'; return `Código ${value}` }
