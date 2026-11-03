export interface NoticeState {
  kind: 'success' | 'error'
  text: string
}

export function Notice({ kind, text, onClose }: NoticeState & { onClose?: () => void }) {
  return (
    <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{text}</span>
      {onClose && (
        <button type="button" aria-label="Fechar aviso" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  )
}
