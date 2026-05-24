import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Car, Cpu, Map, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useRole } from '@/features/auth/useRole'

const ALL_NAV = [
  { name: 'Dashboard',        href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'INVITADO'] },
  { name: 'Vehículos',        href: '/vehicles',  icon: Car,             roles: ['ADMIN', 'INVITADO'] },
  { name: 'Dispositivos GPS', href: '/gps',        icon: Cpu,             roles: ['ADMIN'] },
  { name: 'Mapa en Vivo',     href: '/tracking',  icon: Map,             roles: ['ADMIN', 'INVITADO'] },
]

export default function Sidebar({ isOpen }) {
  const { rol } = useRole()

  const navigation = ALL_NAV.filter((item) => !rol || item.roles.includes(rol))

  return (
    <aside
      className={clsx(
        'fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white transition-all duration-300 z-40 overflow-hidden',
        isOpen ? 'w-64 shadow-lg' : 'w-0'
      )}
    >
      <div className="w-64">
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-4 py-3 rounded-lg transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-brand-500 text-brand-900'
                    : 'text-gray-600 hover:bg-brand-50 hover:text-brand-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon className={clsx('w-5 h-5 shrink-0', isActive ? 'text-brand-900' : 'text-gray-400')} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
