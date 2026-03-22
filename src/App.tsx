import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/query-client'
import { useAuthListener } from '@/hooks/use-auth'
import { Toaster } from '@/components/ui/toaster'

import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'

// App pages
import DashboardPage from '@/pages/dashboard/DashboardPage'
import FinancesPage from '@/pages/finances/FinancesPage'
import ShoppingPage from '@/pages/shopping/ShoppingPage'
import DietPage from '@/pages/diet/DietPage'
import WorkoutsPage from '@/pages/workouts/WorkoutsPage'
import ChildrenPage from '@/pages/children/ChildrenPage'
import PetsPage from '@/pages/pets/PetsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function AppWithAuth() {
  useAuthListener()
  return (
    <>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/financas" element={<FinancesPage />} />
            <Route path="/compras" element={<ShoppingPage />} />
            <Route path="/dieta" element={<DietPage />} />
            <Route path="/treinos" element={<WorkoutsPage />} />
            <Route path="/filhos" element={<ChildrenPage />} />
            <Route path="/pets" element={<PetsPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithAuth />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
