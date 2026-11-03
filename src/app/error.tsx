'use client'

import Link from 'next/link'
import { useEffect } from 'react'

// Error boundary for every page: an unexpected server or render failure shows this instead of a
// blank screen, and "Tentar de novo" re-renders the route.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="empty" role="alert">
      <h1>Algo deu errado</h1>
      <p>Não foi possível carregar esta página. Tente de novo em instantes.</p>
      <div className="form-actions centered">
        <button type="button" className="button" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/" className="button secondary">
          Voltar para a lista
        </Link>
      </div>
    </div>
  )
}
