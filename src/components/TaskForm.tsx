'use client'

import { useQueryClient } from '@tanstack/react-query'
import { getQueryKey } from '@trpc/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Notice } from './Notice'
import { DESCRICAO_MAX, TITULO_MAX, tarefaInputSchema } from '@/lib/schemas'
import { trpc, type Tarefa } from '@/trpc/client'

type FieldErrors = Partial<Record<'titulo' | 'descricao', string>>

// Same schema the server uses, so the messages match on both sides.
function validate(titulo: string, descricao: string): FieldErrors {
  const result = tarefaInputSchema.safeParse({ titulo, descricao })
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FieldErrors
    errors[field] ??= issue.message
  }
  return errors
}

// Create when `tarefa` is absent, edit otherwise.
export function TaskForm({ tarefa }: { tarefa?: Pick<Tarefa, 'id' | 'titulo' | 'descricao'> }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '')
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? '')
  const [submitted, setSubmitted] = useState(false)

  const errors = submitted ? validate(titulo, descricao) : {}

  const onSuccess = (status: 'criada' | 'atualizada') => {
    // The list page renders its first page on the server; drop the cached list so it starts from
    // that fresh data instead of the copy cached before this change.
    queryClient.removeQueries({ queryKey: getQueryKey(trpc.tarefas.listar) })
    router.push(`/?status=${status}`)
  }
  const criar = trpc.tarefas.criar.useMutation({ onSuccess: () => onSuccess('criada') })
  const atualizar = trpc.tarefas.atualizar.useMutation({ onSuccess: () => onSuccess('atualizada') })
  const mutation = tarefa ? atualizar : criar

  // Errors from the server: field errors next to the field, anything else in the banner.
  const serverFieldErrors = mutation.error?.data?.fieldErrors as Record<string, string[]> | null | undefined
  const tituloError = errors.titulo ?? serverFieldErrors?.titulo?.[0]
  const descricaoError = errors.descricao ?? serverFieldErrors?.descricao?.[0]

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const invalid = Object.keys(validate(titulo, descricao))
    if (invalid.length > 0) {
      // Take keyboard and screen reader users straight to the first field to fix.
      document.getElementById(invalid.includes('titulo') ? 'titulo' : 'descricao')?.focus()
      return
    }
    if (tarefa) atualizar.mutate({ id: tarefa.id, titulo, descricao })
    else criar.mutate({ titulo, descricao })
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {mutation.error && !serverFieldErrors && <Notice kind="error" text={mutation.error.message} />}

      <div className="field">
        <label htmlFor="titulo">
          Título <span aria-hidden="true">*</span>
        </label>
        <input
          id="titulo"
          value={titulo}
          maxLength={TITULO_MAX}
          onChange={(e) => setTitulo(e.target.value)}
          required
          aria-invalid={!!tituloError}
          aria-describedby={tituloError ? 'titulo-erro' : undefined}
          autoFocus
        />
        {tituloError && (
          <p id="titulo-erro" className="field-error">
            {tituloError}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          value={descricao}
          maxLength={DESCRICAO_MAX}
          onChange={(e) => setDescricao(e.target.value)}
          aria-invalid={!!descricaoError}
          aria-describedby={descricaoError ? 'descricao-erro' : 'descricao-dica'}
        />
        {descricaoError ? (
          <p id="descricao-erro" className="field-error">
            {descricaoError}
          </p>
        ) : (
          <p id="descricao-dica" className="field-hint">
            Opcional · {descricao.length}/{DESCRICAO_MAX}
          </p>
        )}
      </div>

      <div className="form-actions">
        <Link href="/" className="button secondary">
          Cancelar
        </Link>
        <button type="submit" className="button" disabled={mutation.isPending || mutation.isSuccess}>
          {mutation.isPending ? 'Salvando…' : tarefa ? 'Salvar alterações' : 'Criar tarefa'}
        </button>
      </div>
    </form>
  )
}
