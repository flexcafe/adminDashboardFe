import { NetworkStatusGate } from '@/components/NetworkStatusGate'
import { AuthProvider } from '@/core/presentation/hooks/useAuth'
import { AIAssistantProvider } from '@/features/aiAssistant/AIAssistantContext'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AppRouter } from './router/AppRouter'

export function App() {
  return (
    <ThemeProvider>
      <NetworkStatusGate>
        <AuthProvider>
          <AIAssistantProvider>
            <AppRouter />
          </AIAssistantProvider>
        </AuthProvider>
      </NetworkStatusGate>
    </ThemeProvider>
  )
}

