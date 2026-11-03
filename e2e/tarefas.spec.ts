import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Unique titles, so each test finds its own tasks among the seeded ones and the other tests' tasks.
const unico = (prefixo: string) => `${prefixo} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const lista = (page: Page) => page.getByRole('list', { name: 'Minhas tarefas' })
const itens = (page: Page) => lista(page).getByRole('listitem')
const item = (page: Page, titulo: string) => itens(page).filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })

async function criarTarefa(page: Page, titulo: string, descricao = '') {
  await page.goto('/tarefas/nova')
  await page.getByLabel('Título').fill(titulo)
  if (descricao) await page.getByLabel('Descrição').fill(descricao)
  await page.getByRole('button', { name: 'Criar tarefa' }).click()
  await expect(page).toHaveURL('/?status=criada')
}

test('a lista chega renderizada do servidor, sem buscar os dados de novo no navegador', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  expect(html.match(/class="task"/g)).toHaveLength(10)

  const buscasDaLista: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('tarefas.listar')) buscasDaLista.push(r.url())
  })
  await page.goto('/')
  await expect(itens(page)).toHaveCount(10)
  await page.waitForLoadState('networkidle')
  expect(buscasDaLista).toEqual([])
})

test('rolar até o fim carrega as próximas páginas, sem repetir tarefas', async ({ page }) => {
  await page.goto('/')
  await expect(itens(page)).toHaveCount(10)

  const fim = page.getByText('Você chegou ao fim da lista.')
  await expect(async () => {
    await page.mouse.wheel(0, 10_000)
    await expect(fim).toBeVisible({ timeout: 1_000 })
  }).toPass()

  const titulos = await lista(page).getByRole('heading').allTextContents()
  expect(titulos.length).toBeGreaterThan(10)
  expect(new Set(titulos).size).toBe(titulos.length)
})

test('não deixa criar tarefa sem título', async ({ page }) => {
  const criacoes: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('tarefas.criar')) criacoes.push(r.url())
  })
  await page.goto('/tarefas/nova')

  await page.getByLabel('Título').fill('   ')
  await page.getByRole('button', { name: 'Criar tarefa' }).click()

  await expect(page.getByText('O título é obrigatório.')).toBeVisible()
  await expect(page.getByLabel('Título')).toBeFocused()
  await expect(page.getByLabel('Título')).toHaveAttribute('aria-invalid', 'true')
  expect(criacoes).toEqual([])
})

test('cria uma tarefa e ela aparece no topo da lista', async ({ page }) => {
  const titulo = unico('Criar tarefa')
  await criarTarefa(page, titulo, 'Descrição de teste')

  await expect(page.getByText('Tarefa criada com sucesso.')).toBeVisible()
  await expect(itens(page).first().getByRole('heading')).toHaveText(titulo)
  await expect(itens(page).first()).toContainText('Descrição de teste')
})

test('edita uma tarefa', async ({ page }) => {
  const titulo = unico('Editar tarefa')
  await criarTarefa(page, titulo)

  await page.getByRole('link', { name: `Editar “${titulo}”` }).click()
  await expect(page.getByLabel('Título')).toHaveValue(titulo)
  await page.getByLabel('Título').fill(`${titulo} (editada)`)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(page).toHaveURL('/?status=atualizada')
  await expect(page.getByText('Tarefa atualizada com sucesso.')).toBeVisible()
  await expect(item(page, `${titulo} (editada)`)).toHaveCount(1)
  await expect(item(page, titulo)).toHaveCount(0)
})

test('exclui uma tarefa da lista', async ({ page }) => {
  const titulo = unico('Excluir tarefa')
  await criarTarefa(page, titulo)

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: `Excluir “${titulo}”` }).click()

  await expect(item(page, titulo)).toHaveCount(0)
  await expect(page.getByText('Tarefa excluída.')).toBeVisible()
  // The focused button is gone, so focus moves to the list heading.
  await expect(page.locator('#lista-titulo')).toBeFocused()

  await page.reload()
  await expect(item(page, titulo)).toHaveCount(0)
})

test('se a exclusão falha, a tarefa volta para a lista e o erro aparece', async ({ page }) => {
  const titulo = unico('Rollback')
  await criarTarefa(page, titulo)

  // Hold the request for a moment (so the optimistic removal is visible), then fail it.
  await page.route(/tarefas\.deletar/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    await route.abort('failed')
  })
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: `Excluir “${titulo}”` }).click()

  await expect(item(page, titulo)).toHaveCount(0)
  await expect(item(page, titulo)).toHaveCount(1)
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível excluir a tarefa' })).toBeVisible()

  await page.unroute(/tarefas\.deletar/)
  await page.reload()
  await expect(item(page, titulo)).toHaveCount(1)
})

test('busca por título no servidor, sem diferenciar acentos', async ({ page, request }) => {
  const sufixo = Date.now().toString(36)
  const titulo = `Ação de busca ${sufixo}`
  await criarTarefa(page, titulo)

  const busca = page.getByRole('searchbox', { name: 'Buscar tarefas por título' })
  await busca.fill(`acao de busca ${sufixo}`)
  await expect(page).toHaveURL(new RegExp(`\\?q=acao%20de%20busca%20${sufixo}$`))
  await expect(itens(page)).toHaveCount(1)
  await expect(itens(page).getByRole('heading')).toHaveText(titulo)

  // The filtered list is rendered on the server too, so the URL can be shared.
  const html = await (await request.get(`/?q=${encodeURIComponent(`acao de busca ${sufixo}`)}`)).text()
  expect(html).toContain(titulo)

  await busca.fill(`nada-${sufixo}`)
  await expect(page.getByText(`Nenhuma tarefa encontrada para “nada-${sufixo}”.`)).toBeVisible()

  await busca.fill('')
  await expect(page).toHaveURL('/')
  await expect(itens(page)).toHaveCount(10)
})

test('tarefa inexistente mostra a página de não encontrada', async ({ page }) => {
  for (const id of ['00000000-0000-4000-8000-000000000000', 'nao-e-um-uuid']) {
    const response = await page.goto(`/tarefas/${id}/editar`)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Tarefa não encontrada' })).toBeVisible()
  }
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sem problemas de acessibilidade detectáveis (tema ${colorScheme === 'light' ? 'claro' : 'escuro'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    for (const path of ['/', '/tarefas/nova']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([])
    }
  })
}
