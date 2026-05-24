import { useSelector } from 'react-redux';

/**
 * Hook para leer el rol del usuario autenticado.
 * Uso: const { isAdmin, isInvitado, rol } = useRole()
 */
export function useRole() {
  const { user } = useSelector((state) => state.auth);
  const rol = user?.rol ?? null;

  return {
    rol,
    isAdmin:    rol === 'ADMIN',
    isInvitado: rol === 'INVITADO',
  };
}
