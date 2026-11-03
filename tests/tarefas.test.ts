import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCaller } from '@/server/routers/_app'
import { getStore } from '@/server/store'

const api = createCaller({})

beforeEach(() => getStore().clear())

describe('tarefas router', () => {
  it('creates, lists, updates and deletes a task', async () => {
    const criada = await api.tarefas.criar({ titulo: '  Estudar tRPC  ', descricao: 'Ler a documentação' })
    expect(criada).toMatchObject({ titulo: 'Estudar tRPC', descricao: 'Ler a documentação' })
    expect(criada.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(criada.dataCriacao).toBeInstanceOf(Date)

    expect((await api.tarefas.listar({ limit: 10 })).items.map((t) => t.id)).toEqual([criada.id])

    const atualizada = await api.tarefas.atualizar({ id: criada.id, titulo: 'Estudar tRPC v11', descricao: '' })
    expect(atualizada).toMatchObject({ id: criada.id, titulo: 'Estudar tRPC v11', descricao: undefined })
    expect(atualizada.dataCriacao).toEqual(criada.dataCriacao)

    await api.tarefas.deletar({ id: criada.id })
    expect((await api.tarefas.listar({ limit: 10 })).items).toEqual([])
  })

  it('rejects a task without a title', async () => {
    await expect(api.tarefas.criar({ titulo: '   ' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect((await api.tarefas.listar({ limit: 10 })).items).toHaveLength(0)
  })

  it('returns NOT_FOUND for a task that does not exist', async () => {
    const id = '00000000-0000-4000-8000-000000000000'
    for (const call of [
      () => api.tarefas.obter({ id }),
      () => api.tarefas.atualizar({ id, titulo: 'x' }),
      () => api.tarefas.deletar({ id })
    ]) {
      const error = await call().catch((e: unknown) => e)
      expect(error).toBeInstanceOf(TRPCError)
      expect((error as TRPCError).code).toBe('NOT_FOUND')
    }
  })

  it('pages newest first without repeating or skipping tasks', async () => {
    const store = getStore()
    const base = Date.now()
    for (let i = 0; i < 25; i++) store.create({ titulo: `Tarefa ${i}` }, new Date(base + i * 1000))

    const vistos: string[] = []
    let cursor: string | null = null
    let paginas = 0
    do {
      const pagina: Awaited<ReturnType<typeof api.tarefas.listar>> = await api.tarefas.listar({ limit: 10, cursor })
      vistos.push(...pagina.items.map((t) => t.titulo))
      cursor = pagina.nextCursor
      paginas++
    } while (cursor)

    expect(paginas).toBe(3)
    expect(vistos).toEqual(Array.from({ length: 25 }, (_, i) => `Tarefa ${24 - i}`))
  })

  it('keeps the cursor valid when the last item seen is deleted', async () => {
    const store = getStore()
    const base = Date.now()
    for (let i = 0; i < 6; i++) store.create({ titulo: `Tarefa ${i}` }, new Date(base + i * 1000))

    const primeira = await api.tarefas.listar({ limit: 3 })
    await api.tarefas.deletar({ id: primeira.items[2].id })
    const segunda = await api.tarefas.listar({ limit: 3, cursor: primeira.nextCursor })
    expect(segunda.items.map((t) => t.titulo)).toEqual(['Tarefa 2', 'Tarefa 1', 'Tarefa 0'])
  })

  it('searches titles ignoring case and accents, and pages through the results', async () => {
    const store = getStore()
    const base = Date.now()
    for (let i = 0; i < 7; i++) store.create({ titulo: `Revisão ${i}` }, new Date(base + i * 1000))
    store.create({ titulo: 'Outra coisa' }, new Date(base + 10_000))

    const primeira = await api.tarefas.listar({ limit: 5, busca: '  REVISAO ' })
    expect(primeira.items.map((t) => t.titulo)).toEqual(['Revisão 6', 'Revisão 5', 'Revisão 4', 'Revisão 3', 'Revisão 2'])
    const segunda = await api.tarefas.listar({ limit: 5, busca: 'revisao', cursor: primeira.nextCursor })
    expect(segunda).toEqual({ items: [expect.objectContaining({ titulo: 'Revisão 1' }), expect.objectContaining({ titulo: 'Revisão 0' })], nextCursor: null })

    expect((await api.tarefas.listar({ limit: 5, busca: 'inexistente' })).items).toEqual([])
    // An empty search is no filter.
    expect((await api.tarefas.listar({ limit: 50, busca: '   ' })).items).toHaveLength(8)
  })
})
