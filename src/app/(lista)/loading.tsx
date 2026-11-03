import { TaskSkeletons } from '@/components/Skeleton'

// Shown by Next.js while the list page renders on the server. It lives in the (lista) route group so
// it wraps only the list: a loading boundary makes Next.js stream the response, which commits the
// 200 status early, and the edit page must still answer 404 for a missing task.
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando tarefas">
      <div className="page-header">
        <h1>Minhas tarefas</h1>
      </div>
      <TaskSkeletons count={5} />
    </div>
  )
}
