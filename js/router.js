import { ROUTES } from './config/routes.js';
import { AuthService } from './services/auth.service.js';

class Router {
  constructor() {
    this.currentPath = window.location.pathname;
    this.routes = [];
    this.init();
  }

  init() {
    // Manejar clics en enlaces internos
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });

    // Manejar el botón de retroceso/avance del navegador
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.handleNavigation();
    });

    // Manejar la navegación inicial
    this.handleNavigation();
  }

  async handleNavigation() {
    try {
      // Usar el manejador de navegación de AuthService
      await AuthService.handleNavigation(this);
    } catch (error) {
      console.error('Error en la navegación:', error);
      // En caso de error, redirigir a la página de inicio
      window.location.href = ROUTES.HOME;
    }
  }

  redirectToDefault(role) {
    const defaultRoute = getDefaultRoute(role);
    console.log('Redirigiendo a ruta por defecto para rol', role, ':', defaultRoute);
    
    // Usar replaceState para evitar que el usuario pueda volver atrás a la ruta no autorizada
    if (window.location.pathname !== defaultRoute) {
      // Forzar recarga completa para limpiar cualquier estado
      window.location.replace(defaultRoute);
    }
  }

  async navigate(path) {
    // Limpiar el path
    const cleanPath = path.split('?')[0];
    
    // Si la ruta actual es igual a la nueva ruta, no hacer nada
    if (this.currentPath === cleanPath) {
      return;
    }
    
    console.log('Navegando a:', cleanPath);
    
    // Actualizar la URL
    window.history.pushState({}, '', path);
    this.currentPath = cleanPath;
    
    // Manejar la navegación con verificación de autenticación
    await this.handleNavigation();
  }

  renderCurrentRoute() {
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path) || 
                 this.routes.find(r => r.path === ROUTES.HOME);
    
    if (route) {
      route.component();
    } else {
      console.error('No se pudo encontrar la ruta:', path);
      this.redirectToDefault();
    }
  }

  addRoute(path, component) {
    this.routes.push({ path, component });
    return this;
  }
}

export const router = new Router();

export function initRouter() {
  return router;
}
