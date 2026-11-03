import { randomUUID } from 'node:crypto'

export interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  dataCriacao: Date
}

export interface Pagina {
  items: Tarefa[]
  nextCursor: string | null
}

// Newest first; the id breaks ties so the order is total and stable.
const compare = (a: Tarefa, b: Tarefa) => b.dataCriacao.getTime() - a.dataCriacao.getTime() || b.id.localeCompare(a.id)

// Keyset cursor ("time:id" of the last item sent). Unlike an offset, it does not skip or repeat
// items when tasks are created or deleted while the user is scrolling.
const toCursor = (t: Tarefa) => `${t.dataCriacao.getTime()}:${t.id}`
function fromCursor(cursor: string): Tarefa | null {
  const sep = cursor.indexOf(':')
  const time = Number(cursor.slice(0, sep))
  if (sep < 0 || Number.isNaN(time)) return null
  return { id: cursor.slice(sep + 1), titulo: '', dataCriacao: new Date(time) }
}

// Case- and accent-insensitive: "acao" finds "Ação".
const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export class TarefaStore {
  private tarefas = new Map<string, Tarefa>()

  // The search filters before the cursor is applied, so paging through search results keeps the
  // same no-skip/no-repeat guarantee as the full list.
  list({ limit, cursor, busca }: { limit: number; cursor?: string | null; busca?: string }): Pagina {
    const termo = busca ? normalize(busca) : null
    const matching = termo ? [...this.tarefas.values()].filter((t) => normalize(t.titulo).includes(termo)) : [...this.tarefas.values()]
    const sorted = matching.sort(compare)
    const after = cursor ? fromCursor(cursor) : null
    const rest = after ? sorted.filter((t) => compare(after, t) < 0) : sorted
    const items = rest.slice(0, limit)
    return { items, nextCursor: rest.length > limit ? toCursor(items[items.length - 1]) : null }
  }

  get(id: string): Tarefa | undefined {
    return this.tarefas.get(id)
  }

  create(input: { titulo: string; descricao?: string }, dataCriacao = new Date()): Tarefa {
    const tarefa: Tarefa = { id: randomUUID(), titulo: input.titulo, descricao: input.descricao, dataCriacao }
    this.tarefas.set(tarefa.id, tarefa)
    return tarefa
  }

  // Returns undefined when the task does not exist; the router turns that into NOT_FOUND.
  update(id: string, input: { titulo: string; descricao?: string }): Tarefa | undefined {
    const current = this.tarefas.get(id)
    if (!current) return undefined
    const updated: Tarefa = { ...current, titulo: input.titulo, descricao: input.descricao }
    this.tarefas.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    return this.tarefas.delete(id)
  }

  clear(): void {
    this.tarefas.clear()
  }
}

// Fictitious sample tasks, so the list (and the infinite scroll) has something to show on first run.
const EXEMPLOS = [
  'Revisar pull request do módulo de pagamentos',
  'Escrever testes para o endpoint de relatórios',
  'Atualizar dependências do projeto',
  'Preparar apresentação da sprint',
  'Corrigir layout da página de login no mobile',
  'Documentar variáveis de ambiente',
  'Configurar alertas de erro em produção',
  'Planejar migração do banco de dados',
  'Reunião de alinhamento com o time de produto',
  'Revisar métricas de performance da API',
  'Criar checklist de deploy',
  'Mapear débitos técnicos do frontend'
]

function seed(store: TarefaStore, count = 24): void {
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const titulo = `${EXEMPLOS[i % EXEMPLOS.length]}${i >= EXEMPLOS.length ? ' (parte 2)' : ''}`
    const descricao = i % 3 === 0 ? undefined : 'Tarefa de exemplo gerada na inicialização.'
    store.create({ titulo, descricao }, new Date(now - (i + 1) * 60 * 60 * 1000))
  }
}

// One store per server process. Kept on globalThis so Next.js dev hot reloads do not wipe it, and so
// the API route and the Server Components read the same data.
const globalStore = globalThis as unknown as { __tarefaStore?: TarefaStore }

export function getStore(): TarefaStore {
  if (!globalStore.__tarefaStore) {
    globalStore.__tarefaStore = new TarefaStore()
    if (process.env.SEED_TAREFAS !== 'false') seed(globalStore.__tarefaStore)
  }
  return globalStore.__tarefaStore
}
