import { Fragment } from 'react'
import { Link } from 'react-router'
import type { WorkLink, WorkSummary } from '../api/receita-federal/cno/types'

export function officialText(value: string | number | null) { return value === null ? 'Não informado' : value === '' ? 'Vazio' : String(value) }
export const fieldLabels: Record<string, string> = {
  id: 'ID técnico', cno: 'CNO', nome: 'Nome', nome_empresarial: 'Nome empresarial', ni_responsavel: 'NI do responsável',
  qualificacao_responsavel: 'Qualificação do responsável', codigo_municipio: 'Código do município', municipio: 'Município', uf: 'UF',
  situacao: 'Situação', data_situacao: 'Data da situação', tipo_logradouro: 'Tipo de logradouro', logradouro: 'Logradouro', numero: 'Número',
  bairro: 'Bairro', complemento: 'Complemento', cep: 'CEP', codigo_pais: 'Código do país', pais: 'País',
  data_inicio_obra: 'Início da obra', data_inicio_responsabilidade: 'Início da responsabilidade', data_registro: 'Data de registro',
  data_inicio_obra_de: 'Início da obra — de', data_inicio_obra_ate: 'Início da obra — até',
  cno_vinculado: 'CNO vinculado', caixa_postal: 'Caixa postal', unidade_medida: 'Unidade de medida', area_total: 'Área total',
  codigo_localizacao: 'Código de localização', categoria: 'Categoria', destinacao: 'Destinação', tipo_construcao: 'Tipo de construção',
  tipo_area: 'Tipo de área', tipo_area_complementar: 'Tipo de área complementar', metragem: 'Metragem', cnae: 'CNAE',
  data_registro_cnae: 'Registro do CNAE', data_inicio_vinculo: 'Início do vínculo', data_fim_vinculo: 'Fim do vínculo',
  qualificacao_contribuinte: 'Qualificação do contribuinte',
}
export function OfficialFields({ entries }: { entries: [string, string | number | null][] }) {
  return <dl>{entries.map(([key, value]) => <Fragment key={key}><dt>{fieldLabels[key] ?? key}</dt><dd className="cno-text">{officialText(value)}</dd></Fragment>)}</dl>
}
export function WorkResults({ items, returnTo }: { items: WorkSummary[]; returnTo: string }) {
  return <div className="cards cno-results">{items.map(item => <article className="result-card cno-result" key={item.id}>
    <div><h2><Link to={`/receita-federal/cno/obras/${item.id}?return_to=${encodeURIComponent(returnTo)}`}>CNO {officialText(item.cno)}</Link></h2>
      <p className="cno-text">{officialText(item.nome)} · {officialText(item.nome_empresarial)}</p>
      <p className="cno-text">NI: {officialText(item.ni_responsavel)} · Qualificação: {officialText(item.qualificacao_responsavel)}</p>
      <p className="cno-text">{officialText(item.municipio)} / {officialText(item.uf)} · Situação: {officialText(item.situacao)} · {officialText(item.data_situacao)}</p>
      <p className="meta cno-text">{[item.tipo_logradouro, item.logradouro, item.numero, item.bairro, item.complemento, item.cep].map(officialText).join(' · ')}</p>
      <small className="meta">ID técnico: {item.id}</small>
    </div>
  </article>)}</div>
}
export function WorkTable({ items, returnTo }: { items: WorkSummary[]; returnTo: string }) {
  return <div className="cno-table-scroll"><table className="cno-table"><thead><tr><th>CNO</th><th>Obra</th><th>Início da obra</th><th>Município / UF</th><th>Situação</th><th>Responsável</th></tr></thead><tbody>{items.map(item => <tr key={item.id}>
    <td><Link to={`/receita-federal/cno/obras/${item.id}?return_to=${encodeURIComponent(returnTo)}`}>CNO {officialText(item.cno)}</Link><small>ID técnico: {item.id}</small></td>
    <td className="cno-text">{officialText(item.nome)}<small>{officialText(item.nome_empresarial)}</small></td>
    <td className="cno-text">{officialText(item.data_inicio_obra)}</td>
    <td className="cno-text">{officialText(item.municipio)} / {officialText(item.uf)}</td>
    <td className="cno-text">{officialText(item.situacao)}<small>{officialText(item.data_situacao)}</small></td>
    <td className="cno-text">{officialText(item.ni_responsavel)}<small>{officialText(item.qualificacao_responsavel)}</small></td>
  </tr>)}</tbody></table></div>
}

export function LinkResults({ items, returnTo }: { items: WorkLink[]; returnTo: string }) {
  return <div className="cards cno-results">{items.map(item => <article className="detail-card" key={item.id}>
    <h3>{item.cno !== null && item.cno !== '' ? <Link to={`/receita-federal/cno?cno=${encodeURIComponent(item.cno)}&return_to=${encodeURIComponent(returnTo)}`}>Pesquisar obras com CNO {item.cno}</Link> : `CNO: ${officialText(item.cno)}`}</h3>
    <OfficialFields entries={Object.entries(item)} />
  </article>)}</div>
}
