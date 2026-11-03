import { createTRPCReact, type inferReactQueryProcedureOptions } from '@trpc/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>
export type Tarefa = RouterOutputs['tarefas']['obter']
export type PaginaTarefas = RouterOutputs['tarefas']['listar']
