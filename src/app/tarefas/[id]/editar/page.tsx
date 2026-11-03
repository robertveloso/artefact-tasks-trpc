import { TRPCError } from '@trpc/server'
import { notFound } from 'next/navigation'
import { TaskForm } from '@/components/TaskForm'
import { serverCaller } from '@/server/caller'

export const dynamic = 'force-dynamic'

export default async function EditarTarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tarefa = await serverCaller.tarefas.obter({ id }).catch((error: unknown) => {
    // A missing task or a malformed id both mean "this page does not exist".
    if (error instanceof TRPCError && (error.code === 'NOT_FOUND' || error.code === 'BAD_REQUEST')) notFound()
    throw error
  })

  return (
    <>
      <div className="page-header">
        <h1>Editar tarefa</h1>
      </div>
      <TaskForm tarefa={{ id: tarefa.id, titulo: tarefa.titulo, descricao: tarefa.descricao }} />
    </>
  )
}
