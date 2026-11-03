'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { BUSCA_MAX } from '@/lib/schemas'

const DEBOUNCE_MS = 300

// The search lives in the URL (?q=), so the server renders the filtered first page, the result can
// be shared as a link, and the back button works.
export function SearchBox({ inicial }: { inicial: string }) {
  const router = useRouter()
  const [valor, setValor] = useState(inicial)
  const [buscando, startTransition] = useTransition()
  const enviado = useRef(inicial)

  const buscar = (texto: string) => {
    const termo = texto.trim()
    if (termo === enviado.current) return
    enviado.current = termo
    startTransition(() => router.replace(termo ? `/?q=${encodeURIComponent(termo)}` : '/', { scroll: false }))
  }

  // Search as the user types, once they pause.
  useEffect(() => {
    const timer = setTimeout(() => buscar(valor), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [valor])

  // The URL changed from outside (back/forward button): show that search in the box.
  useEffect(() => {
    if (inicial !== enviado.current) {
      enviado.current = inicial
      setValor(inicial)
    }
  }, [inicial])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    buscar(valor)
  }

  return (
    <form role="search" className="search" onSubmit={handleSubmit}>
      <label htmlFor="busca" className="visually-hidden">
        Buscar tarefas por título
      </label>
      <input
        id="busca"
        type="search"
        placeholder="Buscar por título…"
        value={valor}
        maxLength={BUSCA_MAX}
        onChange={(e) => setValor(e.target.value)}
        aria-busy={buscando}
      />
      <span className="search-status" aria-live="polite">
        {buscando ? 'Buscando…' : ''}
      </span>
    </form>
  )
}
