import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/features/auth/authSlice'
import { Menu, LogOut, User } from 'lucide-react'

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-brand-600">Fleet Tracker Pro</h1>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
              <div className="text-sm">
                <p className="font-semibold text-gray-900">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'user'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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