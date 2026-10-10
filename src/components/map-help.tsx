import { useRef } from 'react'

export function MapHelp({ applyLabel = 'Aplicar filtros', immediate = false }: { applyLabel?: string; immediate?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  return <>
    <button type="button" className="map-help-button" aria-label="Informações do mapa" title="Informações do mapa" onClick={() => dialog.current?.showModal()}>ⓘ</button>
    <dialog className="map-help-dialog" ref={dialog} aria-label="Informações do mapa">
      <h2>Como usar o mapa</h2>
      <p>{immediate ? 'Clique em uma UF ou município para consultar as obras dessa localidade.' : `Escolha a localidade e os filtros desejados. Clique em ${applyLabel} para atualizar o mapa e os resultados.`}</p>
      <p>Use a roda do mouse sobre o mapa para aproximar ou afastar. Fora do mapa, a roda rola a coluna.</p>
      <p>Clique nos marcadores para ver os registros. As localizações são aproximadas pelo CEP; registros sem localização continuam na lista.</p>
      <button type="button" onClick={() => dialog.current?.close()}>Fechar</button>
    </dialog>
  </>
}
