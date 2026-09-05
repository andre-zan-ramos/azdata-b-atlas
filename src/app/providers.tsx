import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { useState, type ReactNode } from 'react'
import { ApiError } from '../api/errors'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          if (axios.isCancel(error)) return false
          if (!(error instanceof ApiError)) return false
          return failureCount < 1 && (error.status === undefined || error.status >= 500)
        },
      },
      mutations: { retry: false },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
