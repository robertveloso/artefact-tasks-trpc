import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { TRPCProvider } from '@/trpc/provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tarefas',
  description: 'Gerenciador de tarefas simples com Next.js e tRPC'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <TRPCProvider>
          <header className="topbar">
            <Link href="/" className="brand">
              Tarefas
            </Link>
          </header>
          <main id="conteudo" className="container">{children}</main>
        </TRPCProvider>
      </body>
    </html>
  )
}
