import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';

export function renderLayout(content = '', user = null) {
  // Si no hay usuario, intentar obtenerlo
  if (!user) {
    user = AuthService.getCurrentUser().then(u => u).catch(() => ({}));
  }

  return `
    <div class="min-h-screen flex flex-col">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <!-- Logo y navegación principal -->
            <div class="flex items-center">
              <a href="${ROUTES.HOME}" class="text-xl font-bold text-primary-600">Horizont</a>
              <nav class="hidden md:ml-6 md:flex md:space-x-8">
                <a href="${ROUTES.HOME}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Inicio
                </a>
                <a href="${ROUTES.BUYER_CATALOG}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Catálogo
                </a>
                <a href="${ROUTES.BUYER_ORDERS}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Mis Pedidos
                </a>
              </nav>
            </div>

            <!-- Controles de usuario -->
            <div class="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              ${user ? `
                <div class="ml-3 relative">
                  <div>
                    <button type="button" class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                      <span class="sr-only">Abrir menú de usuario</span>
                      <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                        ${user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span class="ml-2 hidden lg:inline">${user.name || user.email || 'Usuario'}</span>
                    </button>
                  </div>
                  <!-- Menú desplegable -->
                  <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                    <a href="${ROUTES.BUYER_PROFILE}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Tu perfil</a>
                    <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Configuración</a>
                    <a href="#" onclick="return handleLogout(event)" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Cerrar sesión</a>
                  </div>
                </div>
              ` : `
                <div class="space-x-4">
                  <a href="${ROUTES.LOGIN}" class="text-sm font-medium text-gray-700 hover:text-gray-900">Iniciar sesión</a>
                  <a href="${ROUTES.REGISTER}" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Regístrate
                  </a>
                </div>
              `}
            </div>

            <!-- Botón móvil -->
            <div class="-mr-2 flex items-center md:hidden">
              <button type="button" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500" id="mobile-menu-button" aria-expanded="false">
                <span class="sr-only">Abrir menú principal</span>
                <svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Menú móvil -->
        <div class="md:hidden hidden" id="mobile-menu">
          <div class="pt-2 pb-3 space-y-1">
            <a href="${ROUTES.HOME}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Inicio</a>
            <a href="${ROUTES.BUYER_CATALOG}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Catálogo</a>
            <a href="${ROUTES.BUYER_ORDERS}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Mis Pedidos</a>
            ${user ? `
              <div class="pt-4 pb-3 border-t border-gray-200">
                <div class="flex items-center px-4">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                      ${user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-base font-medium text-gray-800">${user.name || 'Usuario'}</div>
                    <div class="text-sm font-medium text-gray-500">${user.email || ''}</div>
                  </div>
                </div>
                <div class="mt-3 space-y-1">
                  <a href="${ROUTES.BUYER_PROFILE}" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Tu perfil</a>
                  <a href="#" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Configuración</a>
                  <a href="#" onclick="return handleLogout(event)" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Cerrar sesión</a>
                </div>
              </div>
            ` : `
              <div class="pt-4 pb-3 border-t border-gray-200">
                <div class="space-y-1">
                  <a href="${ROUTES.LOGIN}" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Iniciar sesión</a>
                  <a href="${ROUTES.REGISTER}" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Regístrate</a>
                </div>
              </div>
            `}
          </div>
        </div>
      </header>

      <!-- Contenido principal -->
      <main class="flex-grow">
        ${content}
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-gray-200 mt-12">
        <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div class="md:flex md:items-center md:justify-between">
            <div class="flex justify-center space-x-6 md:order-2">
              <a href="#" class="text-gray-400 hover:text-gray-500">
                <span class="sr-only">Facebook</span>
                <i class="fab fa-facebook h-6 w-6"></i>
              </a>
              <a href="#" class="text-gray-400 hover:text-gray-500">
                <span class="sr-only">Instagram</span>
                <i class="fab fa-instagram h-6 w-6"></i>
              </a>
              <a href="#" class="text-gray-400 hover:text-gray-500">
                <span class="sr-only">Twitter</span>
                <i class="fab fa-twitter h-6 w-6"></i>
              </a>
            </div>
            <div class="mt-8 md:mt-0 md:order-1">
              <p class="text-center text-base text-gray-400">
                &copy; ${new Date().getFullYear()} Horizont. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;
}

// Inicializar menús desplegables
export function initLayout() {
  // Menú de usuario
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenu = document.querySelector('#user-menu-button + div');
  
  if (userMenuButton && userMenu) {
    userMenuButton.addEventListener('click', () => {
      const expanded = userMenuButton.getAttribute('aria-expanded') === 'true';
      userMenuButton.setAttribute('aria-expanded', !expanded);
      userMenu.classList.toggle('hidden');
    });
  }
  
  // Menú móvil
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
      mobileMenuButton.setAttribute('aria-expanded', !expanded);
      mobileMenu.classList.toggle('hidden');
      
      // Cambiar ícono
      const menuIcon = mobileMenuButton.querySelector('.block');
      const closeIcon = mobileMenuButton.querySelector('.hidden');
      
      if (menuIcon && closeIcon) {
        menuIcon.classList.toggle('hidden');
        menuIcon.classList.toggle('block');
        closeIcon.classList.toggle('hidden');
        closeIcon.classList.toggle('block');
      }
    });
  }
}

// Función global para manejar el cierre de sesión
window.handleLogout = async function(event) {
  // Prevenir el comportamiento predeterminado del enlace
  if (event) {
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación del evento
  }
  
  // Mostrar confirmación
  const confirmLogout = confirm('¿Estás seguro de que deseas cerrar sesión?');
  if (!confirmLogout) {
    return false;
  }
  
  try {
    console.log('Iniciando cierre de sesión...');
    
    // Mostrar mensaje de carga
    if (window.showNotification) {
      window.showNotification({
        type: 'info',
        message: 'Cerrando sesión...',
        duration: 2000
      });
    }
    
    // Llamar al servicio de autenticación
    const { success, error } = await AuthService.logout();
    
    if (success) {
      console.log('Cierre de sesión exitoso, redirigiendo...');
      
      // Forzar recarga completa para limpiar el estado
      window.location.href = ROUTES.LOGIN;
      
      // Recargar la página para asegurar que todo el estado se limpie
      window.location.reload();
      
    } else {
      console.error('Error al cerrar sesión:', error);
      
      // Mostrar notificación de error
      if (window.showNotification) {
        window.showNotification({
          type: 'error',
          message: 'Error al cerrar sesión. Por favor, inténtalo de nuevo.'
        });
      }
    }
  } catch (error) {
    console.error('Error inesperado al cerrar sesión:', error);
    
    // Forzar recarga para limpiar el estado en caso de error
    window.location.href = ROUTES.LOGIN;
    window.location.reload();
  }
  
  return false; // Prevenir comportamiento predeterminado
};
