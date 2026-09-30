import { Link, useNavigate } from 'react-router-dom'
import { Droplets, Home, LogOut } from 'lucide-react'

const getSession = () => {
  try { return JSON.parse(localStorage.getItem('aura_session')) } catch { return null }
}

// Shared header: brand on the left, Home icon + account on the right (used on every page after login)
export default function TopBar() {
  const navigate = useNavigate()
  const session = getSession()

  const logout = () => {
    try { localStorage.removeItem('aura_session') } catch { /* ignore */ }
    navigate('/')
  }

  const iconBtn = 'grid h-10 w-10 place-items-center rounded-xl text-slate transition-colors hover:bg-mint hover:text-ink'

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white">
            <Droplets size={20} className="text-brand-deep" aria-hidden="true" />
          </span>
          <span className="font-extrabold tracking-tight">AURA-Snap</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link to="/home" aria-label="Home" title="Home" className={iconBtn}>
            <Home size={20} />
          </Link>
          {session && (
            <span className="hidden max-w-[11rem] truncate px-2 text-sm font-semibold sm:block">{session.name}</span>
          )}
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className={iconBtn}>
            <LogOut size={18} />
          </button>
        </nav>
      </div>
    </header>
  )
}