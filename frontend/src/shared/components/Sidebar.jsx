import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  Cpu,
  Map,
  Navigation,
  ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Vehículos', href: '/vehicles', icon: Car },
  { name: 'Dispositivos GPS', href: '/gps', icon: Cpu },
  { name: 'Mapa en Vivo', href: '/tracking', icon: Map },
]

export default function Sidebar({ isOpen }) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-lg transition-all duration-300 z-40',
        isOpen ? 'w-64' : 'w-0'
      )}
    >
      <nav className="p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-between px-4 py-3 rounded-lg transition group',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-5 h-5" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}