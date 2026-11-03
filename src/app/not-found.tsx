import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Tarefa não encontrada</h1>
      <p>Ela pode ter sido excluída.</p>
      <Link href="/" className="button secondary">
        Voltar para a lista
      </Link>
    </div>
  )
}
