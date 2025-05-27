// Importar estilos
import '../src/styles/main.css';

// Importar configuraciones
import { supabase } from './config/supabase.js';
import { ROUTES } from './config/routes.js';

// Importar servicios
import { AuthService } from './services/auth.service.js';

// Importar componentes
import { renderHome } from './components/Home.js';
import { renderLogin } from './components/Login.js';
import { renderRegister } from './components/Register.js';

// Configurar el enrutador
async function setupRouter() {
  // Obtener la ruta actual
  let path = window.location.pathname;
  
  // Si es la ruta raíz, redirigir según autenticación
  if (path === '/') {
    const isAuthenticated = await AuthService.isAuthenticated();
    if (isAuthenticated) {
      const user = await AuthService.getCurrentUser();
      const defaultRoute = getDefaultRoute(user.role);
      window.history.replaceState({}, '', defaultRoute);
      path = defaultRoute;
    } else {
      window.history.replaceState({}, '', ROUTES.HOME);
      path = ROUTES.HOME;
    }
  }
  
  // Renderizar la vista correspondiente
  renderView(path);
}

// Función para renderizar la vista según la ruta
async function renderView(path) {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Limpiar el contenedor
  app.innerHTML = '';
  
  // Renderizar la vista correspondiente
  switch (path) {
    case ROUTES.HOME:
      await renderHome();
      break;
    case ROUTES.LOGIN:
      await renderLogin();
      break;
    case ROUTES.REGISTER:
      await renderRegister();
      break;
    // Agregar más rutas aquí
    default:
      // Verificar si es una ruta de admin o buyer
      if (path.startsWith('/admin/')) {
        // Verificar autenticación y rol
        const isAuthenticated = await AuthService.isAuthenticated();
        if (!isAuthenticated) {
          window.location.href = ROUTES.LOGIN;
          return;
        }
        
        const user = await AuthService.getCurrentUser();
        if (user.role !== 'admin') {
          window.location.href = getDefaultRoute(user.role);
          return;
        }
        
        // Renderizar panel de administración
        app.innerHTML = `<h1>Panel de Administración - ${path}</h1>`;
      } else if (path.startsWith('/buyer/')) {
        // Verificar autenticación
        const isAuthenticated = await AuthService.isAuthenticated();
        if (!isAuthenticated) {
          window.location.href = ROUTES.LOGIN;
          return;
        }
        
        // Renderizar panel de comprador
        app.innerHTML = `<h1>Panel de Comprador - ${path}</h1>`;
      } else {
        // Página no encontrada
        app.innerHTML = `
          <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="text-center">
              <h1 class="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p class="text-xl text-gray-600 mb-8">Página no encontrada</p>
              <a href="/" class="text-blue-600 hover:text-blue-800">Volver al inicio</a>
            </div>
          </div>
        `;
      }
  }
}

// Función auxiliar para obtener la ruta por defecto según el rol
function getDefaultRoute(role) {
  return role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.BUYER_DASHBOARD;
}

// Manejar navegación del navegador (atrás/adelante)
window.addEventListener('popstate', () => {
  renderView(window.location.pathname);
});

// Función para verificar autenticación en rutas protegidas
async function checkAuth() {
  const isPublicRoute = [ROUTES.HOME, ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD].includes(window.location.pathname);
  
  if (isPublicRoute) return true;
  
  const isAuthenticated = await AuthService.isAuthenticated();
  if (!isAuthenticated) {
    window.location.href = ROUTES.LOGIN;
    return false;
  }
  
  return true;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación antes de configurar el router
  const isAuthValid = await checkAuth();
  if (!isAuthValid) return;
  
  // Configurar el router
  setupRouter();
  
  // Configurar manejadores globales
  window.navigateTo = (path) => {
    window.history.pushState({}, '', path);
    renderView(path);
  };
  
  // Escuchar eventos de cierre de sesión
  window.addEventListener('auth:logout', () => {
    console.log('Evento de cierre de sesión recibido en main.js');
    window.location.href = ROUTES.LOGIN;
  });
  
  window.addEventListener('auth:signout', () => {
    console.log('Evento de signout recibido en main.js');
    window.location.href = ROUTES.LOGIN;
  });
  
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[data-route]');
    if (link) {
      e.preventDefault();
      const path = link.getAttribute('href');
      window.history.pushState({}, '', path);
      await renderView(path);
    }
  });
  
  // Hacer que la función de navegación esté disponible globalmente
  window.navigateTo = (path) => {
    window.history.pushState({}, '', path);
    renderView(path);
  };
});

// Manejar cierre de sesión global
window.handleLogout = async () => {
  try {
    const { error } = await AuthService.logout();
    if (error) throw error;
    
    // Redirigir a la página de inicio
    window.location.href = ROUTES.HOME;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showError('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
  }
};
