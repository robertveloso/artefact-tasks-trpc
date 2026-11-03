'use client'

import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { getQueryKey } from '@trpc/react-query'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Notice, type NoticeState } from './Notice'
import { TaskSkeletons } from './Skeleton'
import { PAGE_SIZE } from '@/lib/constants'
import { trpc, type PaginaTarefas } from '@/trpc/client'

// Fixed time zone: the server and the browser must format the date the same way, or React reports
// a hydration mismatch.
const formatDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

type Paginas = InfiniteData<PaginaTarefas>

export function TaskList({ primeiraPagina, busca, flash }: { primeiraPagina: PaginaTarefas; busca?: string; flash?: string }) {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<NoticeState | null>(flash ? { kind: 'success', text: flash } : null)

  const query = trpc.tarefas.listar.useInfiniteQuery(
    { limit: PAGE_SIZE, busca },
    {
      getNextPageParam: (pagina) => pagina.nextCursor,
      // Hydrate from the page rendered on the server.
      initialData: { pages: [primeiraPagina], pageParams: [null] }
    }
  )

  // Every cached list (the full one and each search) shares this key prefix.
  const listas = getQueryKey(trpc.tarefas.listar)

  // Optimistic delete: the task leaves the list at once; if the server fails, the lists are restored
  // from the snapshot and the task comes back.
  const deletar = trpc.tarefas.deletar.useMutation({
    onMutate: async ({ id }) => {
      // A page still loading must not overwrite the optimistic change when it arrives.
      await queryClient.cancelQueries({ queryKey: listas })
      const snapshot = queryClient.getQueriesData<Paginas>({ queryKey: listas })
      queryClient.setQueriesData<Paginas>({ queryKey: listas }, (data) =>
        data ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((t) => t.id !== id) })) } : data
      )
      // The focused button is gone: move focus to the list heading instead of the page body.
      document.getElementById('lista-titulo')?.focus()
      return { snapshot }
    },
    onSuccess: () => setNotice({ kind: 'success', text: 'Tarefa excluída.' }),
    onError: (error, _input, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data)
      setNotice({ kind: 'error', text: `Não foi possível excluir a tarefa: ${error.message}` })
    }
  })

  // Infinite scroll: load the next page when the sentinel below the list enters the viewport.
  const sentinel = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const tarefas = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <>
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}

      {tarefas.length === 0 ? (
        <p className="empty">
          {busca ? `Nenhuma tarefa encontrada para “${busca}”.` : 'Nenhuma tarefa ainda. Que tal criar a primeira?'}
        </p>
      ) : (
        <ul className="task-list" aria-labelledby="lista-titulo" aria-busy={isFetchingNextPage}>
          {tarefas.map((t) => (
            <li key={t.id} className="task">
              <div>
                <h2>{t.titulo}</h2>
                {t.descricao && <p>{t.descricao}</p>}
                <time dateTime={t.dataCriacao.toISOString()}>Criada em {formatDate.format(t.dataCriacao)}</time>
              </div>
              <div className="task-actions">
                <Link href={`/tarefas/${t.id}/editar`} className="button secondary small" aria-label={`Editar “${t.titulo}”`}>
                  Editar
                </Link>
                <button
                  type="button"
                  className="button danger small"
                  aria-label={`Excluir “${t.titulo}”`}
                  onClick={() => {
                    if (window.confirm(`Excluir "${t.titulo}"?`)) deletar.mutate({ id: t.id })
                  }}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isFetchingNextPage && <TaskSkeletons count={2} />}
      <div ref={sentinel} />
      <div className="list-footer" aria-live="polite">
        {isFetchingNextPage ? (
          <span className="visually-hidden">Carregando mais tarefas…</span>
        ) : query.isFetchNextPageError ? (
          <>
            Erro ao carregar mais tarefas.{' '}
            <button type="button" className="button secondary small" onClick={() => void fetchNextPage()}>
              Tentar de novo
            </button>
          </>
        ) : hasNextPage ? (
          // Fallback for keyboards and browsers where the observer does not fire.
          <button type="button" className="button secondary small" onClick={() => void fetchNextPage()}>
            Carregar mais
          </button>
        ) : (
          tarefas.length > 0 && 'Você chegou ao fim da lista.'
        )}
      </div>
    </>
  )
}
