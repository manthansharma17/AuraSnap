import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import StaffDetailsPage from './pages/StaffDetailsPage'
import NetworkPage from './pages/NetworkPage'
import HomePage from './pages/HomePage'
import TourButton from './components/TourButton'

// Flow: Login -> Staff details -> Network (CCTV) -> Home
function Protected({ children }) {
  let loggedIn = false
  try { loggedIn = !!localStorage.getItem('aura_session') } catch { /* storage blocked */ }
  return loggedIn ? <>{children}<TourButton /></> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/staff" element={<Protected><StaffDetailsPage /></Protected>} />
      <Route path="/network" element={<Protected><NetworkPage /></Protected>} />
      <Route path="/home" element={<Protected><HomePage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}