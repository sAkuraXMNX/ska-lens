import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authStore } from '../lib/auth'

export function ProtectedRoute() {
  const location = useLocation()

  if (!authStore.isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
