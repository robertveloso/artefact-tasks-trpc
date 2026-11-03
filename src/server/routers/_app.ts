import { createCallerFactory, router } from '../trpc'
import { tarefasRouter } from './tarefas'

export const appRouter = router({
  tarefas: tarefasRouter
})

// The client only imports this type, never the server code.
export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
