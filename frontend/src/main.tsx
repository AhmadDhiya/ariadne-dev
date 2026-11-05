import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/api/queryClient'
import { App } from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/motion.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemen #root tidak ditemukan di index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
