import { useRef, type ReactNode } from 'react'

export function MapResultsDialog({ title, children }: { title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()}>Ver estabelecimentos</button>
    <dialog className="map-results-dialog" ref={dialog} aria-label={title}>
      <header><h2>{title}</h2><button type="button" onClick={() => dialog.current?.close()}>Fechar</button></header>
      <div className="map-results-dialog-body">{children}</div>
    </dialog>
  </>
}
