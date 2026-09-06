import { useInfiniteQuery } from '@tanstack/react-query'
import { cnpjApi } from '../api/receita-federal/cnpj/client'
function nextPage(last: { next: string | null }, pages: unknown[]) { return last.next ? pages.length + 1 : undefined }
export function MunicipalitySelect({ uf, defaultValue }: { uf: string; defaultValue: string }) {
  const query=useInfiniteQuery({queryKey:['cnpj','municipalities',uf],queryFn:({pageParam,signal})=>cnpjApi.municipalities({uf:uf||undefined,page:pageParam,page_size:50},signal),initialPageParam:1,getNextPageParam:nextPage})
  const items=query.data?.pages.flatMap(page=>page.results)??[]
  return <label>Código do município<select name="municipio" defaultValue={defaultValue} key={`${uf}-${defaultValue}`} disabled={!uf||query.isPending}><option value="">{uf?'Todos':'Selecione uma UF'}</option>{items.map(item=><option key={item.codigo} value={item.codigo}>{item.descricao} · {item.codigo}</option>)}</select>{query.hasNextPage&&<button className="load-more" type="button" onClick={()=>query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage?'Carregando…':'Carregar mais municípios'}</button>}</label>
}
export function CnaeSelect({ defaultValue }: { defaultValue: string }) {
  const query=useInfiniteQuery({queryKey:['cnpj','cnaes'],queryFn:({pageParam,signal})=>cnpjApi.cnaes({page:pageParam,page_size:50},signal),initialPageParam:1,getNextPageParam:nextPage});const items=query.data?.pages.flatMap(page=>page.results)??[]
  return <label>CNAE principal<select name="cnae" defaultValue={defaultValue} key={defaultValue}><option value="">Todos</option>{defaultValue&&!items.some(i=>i.codigo===defaultValue)&&<option value={defaultValue}>{defaultValue}</option>}{items.map(item=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.descricao}</option>)}</select>{query.hasNextPage&&<button className="load-more" type="button" onClick={()=>query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage?'Carregando…':'Carregar mais CNAEs'}</button>}</label>
}
