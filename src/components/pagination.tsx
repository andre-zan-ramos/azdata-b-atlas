export function Pagination({ page, count, pageSize, previous, next, onPage }: { page: number; count: number | null; pageSize: number; previous: boolean; next: boolean; onPage: (page: number) => void }) {
  return <div className="pagination"><button type="button" disabled={!previous} onClick={() => onPage(page - 1)}>Anterior</button><span>Página {page}{count !== null ? ` de ${Math.max(1, Math.ceil(count / pageSize))} · ${count} resultados` : ''}</span><button type="button" disabled={!next} onClick={() => onPage(page + 1)}>Próxima</button></div>
}
