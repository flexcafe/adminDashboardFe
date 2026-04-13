import { AuthProvider } from '@/core/presentation/hooks/useAuth'
import { AppRouter } from './router/AppRouter'

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

