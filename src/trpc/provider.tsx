'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState, type ReactNode } from 'react'
import superjson from 'superjson'
import { trpc } from './client'

export function TRPCProvider({ children }: { children: ReactNode }) {
  // One client per browser session (useState keeps it stable across renders).
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }))
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })] })
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
