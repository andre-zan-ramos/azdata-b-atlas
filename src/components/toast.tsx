import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 8000)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  return createPortal(<div className="toast" role="status" aria-live="polite">
    <span>{message}</span>
    <button type="button" aria-label="Fechar aviso" onClick={onClose}>×</button>
  </div>, document.body)
}
