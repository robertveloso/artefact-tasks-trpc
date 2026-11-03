import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

type Issue = { message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }

const t = initTRPC.create({
  // superjson keeps `dataCriacao` a real Date on the client instead of a string.
  transformer: superjson,
  // Validation errors reach the client as a readable message plus per-field errors, instead of the
  // raw list of schema issues.
  errorFormatter({ shape, error }) {
    const issues = (error.cause as { issues?: Issue[] } | undefined)?.issues
    if (error.code !== 'BAD_REQUEST' || !Array.isArray(issues)) return { ...shape, data: { ...shape.data, fieldErrors: null } }
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of issues) {
      const head = issue.path?.[0]
      const field = String(typeof head === 'object' && head !== null ? head.key : (head ?? 'form'))
      ;(fieldErrors[field] ??= []).push(issue.message)
    }
    return { ...shape, message: issues[0]?.message ?? shape.message, data: { ...shape.data, fieldErrors } }
  }
})

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory
