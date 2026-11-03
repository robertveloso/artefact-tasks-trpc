import { z } from 'zod'

// Shared by the tRPC procedures (server-side validation) and the form (client-side validation),
// so both sides enforce the same rules and show the same messages.
export const TITULO_MAX = 120
export const DESCRICAO_MAX = 1000

export const tituloSchema = z
  .string()
  .trim()
  .min(1, 'O título é obrigatório.')
  .max(TITULO_MAX, `O título deve ter no máximo ${TITULO_MAX} caracteres.`)

// An empty description is stored as "no description".
export const descricaoSchema = z
  .string()
  .trim()
  .max(DESCRICAO_MAX, `A descrição deve ter no máximo ${DESCRICAO_MAX} caracteres.`)
  .optional()
  .transform((v) => (v ? v : undefined))

export const tarefaInputSchema = z.object({
  titulo: tituloSchema,
  descricao: descricaoSchema
})

export const tarefaIdSchema = z.object({ id: z.uuid('Identificador de tarefa inválido.') })

export const BUSCA_MAX = 100

// Search text for the list: trimmed, and an empty search means "no filter".
export const buscaSchema = z
  .string()
  .trim()
  .max(BUSCA_MAX, `A busca deve ter no máximo ${BUSCA_MAX} caracteres.`)
  .optional()
  .transform((v) => (v ? v : undefined))

export const listarInputSchema = z.object({
  limit: z.number().int().min(1).max(50),
  busca: buscaSchema,
  // Filled in by useInfiniteQuery: the cursor returned by the previous page.
  cursor: z.string().nullish()
})

export type TarefaInput = z.input<typeof tarefaInputSchema>
