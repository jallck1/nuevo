import { ROUTES, isPublicRoute, isAdminRoute, isBuyerRoute, getDefaultRoute } from './config/routes.js';
import { showNotification } from './utils/notifications.js';
import { AuthService } from './services/auth.service.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentPath = window.location.pathname;
    this.init();
  }

  init() {
    // Manejar clics en enlaces internos
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });

    // Manejar el botón de retroceso/avance del navegador
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.render();
    });

    // Escuchar cambios en la autenticación
    this.setupAuthListener();

    // Renderizar la ruta inicial
    this.render();
  }

  async setupAuthListener() {
    // Escuchar cambios de autenticación de Supabase
    const unsubscribe = AuthService.onAuthStateChange(async (event) => {
      console.log('Evento de autenticación:', event);
      
      if (event === 'SIGNED_IN') {
        const user = await AuthService.getCurrentUser();
        if (user) {
          const defaultRoute = getDefaultRoute(user.role);
          this.navigate(defaultRoute);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Forzar recarga completa para limpiar el estado
        window.location.href = ROUTES.LOGIN;
      }
    });
    
    // También escuchar nuestro evento personalizado de cierre de sesión
    const handleLogoutEvent = () => {
      console.log('Evento de cierre de sesión detectado');
      window.location.href = ROUTES.LOGIN;
    };
    
    window.addEventListener('auth:logout', handleLogoutEvent);
    window.addEventListener('auth:signout', handleLogoutEvent);
    
    // Limpiar listeners al destruir el router
    return () => {
      unsubscribe();
      window.removeEventListener('auth:logout', handleLogoutEvent);
      window.removeEventListener('auth:signout', handleLogoutEvent);
    };
  }

  async render() {
    try {
      // Obtener el usuario actual
      const user = await AuthService.getCurrentUser();
      const isAuthenticated = !!user;
      const userRole = user?.role;

      console.log('Renderizando ruta:', this.currentPath);
      console.log('Usuario autenticado:', isAuthenticated);
      console.log('Rol del usuario:', userRole);

      // Verificar si la ruta es pública
      if (!isPublicRoute(this.currentPath) && !isAuthenticated) {
        console.log('Redirigiendo a login: Ruta protegida sin autenticación');
        window.location.href = ROUTES.LOGIN;
        return;
      }

      // Si el usuario está autenticado, verificar permisos de ruta
      if (isAuthenticated) {
        console.log('Verificando permisos para usuario:', userRole);
        
        // Redirigir a la página de inicio si intenta acceder a login/register estando autenticado
        if ([ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD].includes(this.currentPath)) {
          console.log('Redirigiendo a dashboard: Usuario ya autenticado');
          const defaultRoute = getDefaultRoute(userRole);
          if (window.location.pathname !== defaultRoute) {
            window.location.href = defaultRoute;
          }
          return;
        }

        // Verificar permisos de ruta de administrador
        if (isAdminRoute(this.currentPath) && userRole !== 'admin') {
          console.log('Acceso denegado: Se requiere rol de administrador');
          showNotification({
            type: 'error',
            message: 'No tienes permisos para acceder a la sección de administración.'
          });
          window.location.href = getDefaultRoute(userRole);
          return;
        }

        // Verificar permisos de ruta de comprador
        if (isBuyerRoute(this.currentPath) && userRole !== 'buyer') {
          console.log('Acceso denegado: Se requiere rol de comprador');
          showNotification({
            type: 'error',
            message: 'No tienes permisos para acceder a esta sección.'
          });
          window.location.href = getDefaultRoute(userRole);
          return;
        }
      }
    } catch (error) {
      console.error('Error en el renderizado de la ruta:', error);
      // En caso de error, redirigir al login
      window.location.href = ROUTES.LOGIN;
    }

    // Cargar el componente correspondiente
    const routeHandler = this.routes[this.currentPath] || this.routes['/404'];
    if (routeHandler) {
      document.getElementById('app').innerHTML = '';
      await routeHandler();
    } else {
      this.navigate('/404');
    }
  }

  navigate(path, data = {}) {
    // Limpiar el path
    const cleanPath = path.split('?')[0];
    
    // Si la ruta actual es igual a la nueva ruta, no hacer nada
    if (this.currentPath === cleanPath) {
      return;
    }
    
    console.log('Navegando a:', cleanPath);
    
    // Si estamos cerrando sesión, forzar recarga completa
    if (path === ROUTES.LOGIN && this.currentPath !== '/') {
      window.location.href = path;
      return;
    }
    
    // Actualizar la URL sin recargar la página
    window.history.pushState({}, '', path);
    this.currentPath = cleanPath;
    
    // Renderizar la nueva ruta
    this.render();
  }

  addRoute(path, handler) {
    this.routes[path] = handler;
  }
}

// Exportar instancia del router
export const router = new Router();

// Exportar función de navegación para uso global
window.navigateTo = (path) => router.navigate(path);

// Función para manejar el cierre de sesión
window.handleLogout = async () => {
  const { error } = await AuthService.logout();
  if (!error) {
    showNotification({
      type: 'success',
      message: 'Sesión cerrada correctamente.'
    });
    router.navigate(ROUTES.HOME);
  }
};

export default router;
