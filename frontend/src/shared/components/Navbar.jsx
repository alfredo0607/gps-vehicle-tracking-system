import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/features/auth/authSlice'
import { Menu, LogOut, User, Shield, Eye } from 'lucide-react'

const ROL_CONFIG = {
  ADMIN:    { label: 'Administrador', icon: Shield, color: 'text-brand-900 bg-brand-500' },
  INVITADO: { label: 'Invitado',      icon: Eye,    color: 'text-brand-900 bg-brand-300' },
}

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const rolCfg = ROL_CONFIG[user?.rol] ?? { label: user?.rol ?? 'Usuario', icon: User, color: 'text-gray-600 bg-gray-50' }
  const RolIcon = rolCfg.icon

  return (
    <nav className="bg-brand-900 shadow-md sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-brand-800 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-brand-400" />
            </button>
            <h1 className="text-2xl font-bold text-brand-500">Fleet Tracker Pro</h1>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-800 rounded-lg">
              <User className="w-5 h-5 text-brand-400" />
              <div className="text-sm">
                <p className="font-semibold text-white leading-tight">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ml-1 ${rolCfg.color}`}>
                <RolIcon className="w-3 h-3" />
                {rolCfg.label}
              </span>
            </div>

            <button
              onClick={() => dispatch(logout())}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-brand-800 hover:text-white rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
