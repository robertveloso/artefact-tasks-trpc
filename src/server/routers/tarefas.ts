import { TRPCError } from '@trpc/server'
import { listarInputSchema, tarefaIdSchema, tarefaInputSchema } from '@/lib/schemas'
import { getStore } from '../store'
import { publicProcedure, router } from '../trpc'

const naoEncontrada = (id: string) => new TRPCError({ code: 'NOT_FOUND', message: `Tarefa ${id} não encontrada.` })

export const tarefasRouter = router({
  listar: publicProcedure.input(listarInputSchema).query(({ input }) => getStore().list(input)),

  obter: publicProcedure.input(tarefaIdSchema).query(({ input }) => {
    const tarefa = getStore().get(input.id)
    if (!tarefa) throw naoEncontrada(input.id)
    return tarefa
  }),

  criar: publicProcedure.input(tarefaInputSchema).mutation(({ input }) => getStore().create(input)),

  atualizar: publicProcedure.input(tarefaInputSchema.extend(tarefaIdSchema.shape)).mutation(({ input: { id, ...dados } }) => {
    const tarefa = getStore().update(id, dados)
    if (!tarefa) throw naoEncontrada(id)
    return tarefa
  }),

  deletar: publicProcedure.input(tarefaIdSchema).mutation(({ input }) => {
    if (!getStore().delete(input.id)) throw naoEncontrada(input.id)
    return { id: input.id }
  })
})
