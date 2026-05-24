import { Navigate } from 'react-router-dom';
import { useRole } from './useRole';

/**
 * Protege una ruta según el rol del usuario.
 * Si el rol no está en la lista `roles`, redirige a /dashboard.
 *
 * Uso:
 *   <RoleRoute roles={['ADMIN']}>
 *     <VehicleForm />
 *   </RoleRoute>
 */
export default function RoleRoute({ children, roles }) {
  const { rol } = useRole();

  if (!roles.includes(rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
