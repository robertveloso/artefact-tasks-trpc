import Link from 'next/link'
import { SearchBox } from '@/components/SearchBox'
import { TaskList } from '@/components/TaskList'
import { PAGE_SIZE } from '@/lib/constants'
import { buscaSchema } from '@/lib/schemas'
import { serverCaller } from '@/server/caller'

// The list lives in memory and changes on every mutation, so it is rendered on each request (SSR)
// instead of being cached at build time.
export const dynamic = 'force-dynamic'

const FLASH: Record<string, string> = {
  criada: 'Tarefa criada com sucesso.',
  atualizada: 'Tarefa atualizada com sucesso.'
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams
  // An invalid search (e.g. too long, edited by hand in the URL) is ignored instead of breaking the page.
  const busca = buscaSchema.safeParse(q).data
  // First page fetched on the server: the HTML arrives with the tasks already in it, and the client
  // query starts from this data (no loading spinner, no second request).
  const primeiraPagina = await serverCaller.tarefas.listar({ limit: PAGE_SIZE, busca })

  return (
    <>
      <div className="page-header">
        <h1 id="lista-titulo" tabIndex={-1}>
          Minhas tarefas
        </h1>
        <Link href="/tarefas/nova" className="button">
          + Nova tarefa
        </Link>
      </div>
      <SearchBox inicial={busca ?? ''} />
      <TaskList key={busca ?? ''} primeiraPagina={primeiraPagina} busca={busca} flash={status ? FLASH[status] : undefined} />
    </>
  )
}
