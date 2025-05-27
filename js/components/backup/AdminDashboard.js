import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';

export async function renderAdminDashboard() {
  const app = document.getElementById('app');
  
  // Verificar autenticación y rol
  const isAuthenticated = await AuthService.isAuthenticated();
  if (!isAuthenticated) {
    window.location.href = ROUTES.LOGIN;
    return;
  }
  
  const user = await AuthService.getCurrentUser();
  if (user.role !== 'admin') {
    window.location.href = ROUTES.HOME;
    return;
  }
  
  // Renderizar el dashboard de administrador
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Barra de navegación -->
      <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <div class="flex-shrink-0 flex items-center">
                <span class="text-xl font-bold text-primary-600">Horizont Admin</span>
              </div>
              <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="${ROUTES.ADMIN_DASHBOARD}" class="border-primary-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" aria-current="page">
                  Panel
                </a>
                <a href="${ROUTES.ADMIN_ORDERS}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Pedidos
                </a>
                <a href="${ROUTES.ADMIN_PRODUCTS}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Productos
                </a>
                <a href="${ROUTES.ADMIN_USERS}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Usuarios
                </a>
                <a href="${ROUTES.ADMIN_SUPPLIERS}" class="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Proveedores
                </a>
              </div>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:items-center">
              <div class="ml-3 relative">
                <div>
                  <button type="button" class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                    <span class="sr-only">Abrir menú de usuario</span>
                    <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                      ${user.email ? user.email.charAt(0).toUpperCase() : 'A'}
                    </div>
                  </button>
                </div>
                <!-- Menú desplegable -->
                <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-0">Tu perfil</a>
                  <a href="#" onclick="handleLogout()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-2">Cerrar sesión</a>
                </div>
              </div>
            </div>
            <!-- Botón móvil -->
            <div class="-mr-2 flex items-center sm:hidden">
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
        <div class="sm:hidden hidden" id="mobile-menu">
          <div class="pt-2 pb-3 space-y-1">
            <a href="${ROUTES.ADMIN_DASHBOARD}" class="bg-primary-50 border-primary-500 text-primary-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium" aria-current="page">Panel</a>
            <a href="${ROUTES.ADMIN_ORDERS}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Pedidos</a>
            <a href="${ROUTES.ADMIN_PRODUCTS}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Productos</a>
            <a href="${ROUTES.ADMIN_USERS}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Usuarios</a>
            <a href="${ROUTES.ADMIN_SUPPLIERS}" class="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Proveedores</a>
          </div>
          <div class="pt-4 pb-3 border-t border-gray-200">
            <div class="flex items-center px-4">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                  ${user.email ? user.email.charAt(0).toUpperCase() : 'A'}
                </div>
              </div>
              <div class="ml-3">
                <div class="text-base font-medium text-gray-800">${user.email || 'Administrador'}</div>
                <div class="text-sm font-medium text-gray-500">Administrador</div>
              </div>
            </div>
            <div class="mt-3 space-y-1">
              <a href="#" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Tu perfil</a>
              <a href="#" onclick="handleLogout()" class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">Cerrar sesión</a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Contenido principal -->
      <main class="py-10">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <h1 class="text-2xl font-semibold text-gray-900">Panel de Administración</h1>
          
          <!-- Estadísticas -->
          <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Total de pedidos -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <i class="fas fa-shopping-cart text-white text-xl"></i>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Total de pedidos</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">1,245</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                  <a href="${ROUTES.ADMIN_ORDERS}" class="font-medium text-blue-700 hover:text-blue-900">Ver todos los pedidos</a>
                </div>
              </div>
            </div>
            
            <!-- Ingresos totales -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <i class="fas fa-dollar-sign text-white text-xl"></i>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Ingresos totales</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">$12.5M</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                  <a href="${ROUTES.ADMIN_ORDERS}?status=completed" class="font-medium text-blue-700 hover:text-blue-900">Ver reportes</a>
                </div>
              </div>
            </div>
            
            <!-- Usuarios activos -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                    <i class="fas fa-users text-white text-xl"></i>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Usuarios activos</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">1,234</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                  <a href="${ROUTES.ADMIN_USERS}" class="font-medium text-blue-700 hover:text-blue-900">Ver todos los usuarios</a>
                </div>
              </div>
            </div>
            
            <!-- Productos en inventario -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-red-500 rounded-md p-3">
                    <i class="fas fa-boxes text-white text-xl"></i>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">Productos en inventario</dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">5,678</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-5 py-3">
                <div class="text-sm">
                  <a href="${ROUTES.ADMIN_PRODUCTS}" class="font-medium text-blue-700 hover:text-blue-900">Gestionar inventario</a>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Gráficos y tablas -->
          <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Gráfico de ventas -->
            <div class="bg-white shadow rounded-lg p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Ventas mensuales</h3>
              <div class="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                <p class="text-gray-500">Gráfico de ventas mensuales</p>
              </div>
            </div>
            
            <!-- Últimos pedidos -->
            <div class="bg-white shadow rounded-lg overflow-hidden">
              <div class="px-6 py-5 border-b border-gray-200">
                <h3 class="text-lg font-medium text-gray-900">Últimos pedidos</h3>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#ORD-2023-1001</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">cliente@ejemplo.com</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$450,000</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Completado
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#ORD-2023-1000</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">usuario@ejemplo.com</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$320,000</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En proceso
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#ORD-2023-0999</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">comprador@ejemplo.com</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$275,000</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Cancelado
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div class="flex-1 flex justify-between">
                  <a href="${ROUTES.ADMIN_ORDERS}" class="text-sm font-medium text-blue-600 hover:text-blue-900">Ver todos los pedidos</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  
  // Inicializar menús desplegables
  initDropdownMenu();
  initMobileMenu();
  
  // Agregar manejador de eventos para el botón de cierre de sesión
  const logoutButtons = document.querySelectorAll('[onclick*="handleLogout"]');
  logoutButtons.forEach(button => {
    button.addEventListener('click', handleLogout);
  });
}

// Inicializar menú desplegable de usuario
function initDropdownMenu() {
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenu = userMenuButton?.nextElementSibling;
  
  if (!userMenuButton || !userMenu) return;
  
  let isOpen = false;
  
  const toggleMenu = () => {
    isOpen = !isOpen;
    userMenu.classList.toggle('hidden', !isOpen);
    
    // Cerrar al hacer clic fuera
    if (isOpen) {
      const handleClickOutside = (event) => {
        if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
          isOpen = false;
          userMenu.classList.add('hidden');
          document.removeEventListener('click', handleClickOutside);
        }
      };
      
      // Agregar manejador con un pequeño retraso para evitar que se cierre inmediatamente
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 10);
    }
  };
  
  // Agregar manejador de clic al botón
  userMenuButton.addEventListener('click', toggleMenu);
}

// Inicializar menú móvil
function initMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (!mobileMenuButton || !mobileMenu) return;
  
  let isOpen = false;
  
  const toggleMenu = () => {
    isOpen = !isOpen;
    mobileMenu.classList.toggle('hidden', !isOpen);
    
    // Cambiar icono
    const menuIcon = mobileMenuButton.querySelector('.block');
    const closeIcon = mobileMenuButton.querySelector('.hidden');
    
    if (menuIcon && closeIcon) {
      menuIcon.classList.toggle('hidden');
      menuIcon.classList.toggle('block');
      closeIcon.classList.toggle('hidden');
      closeIcon.classList.toggle('block');
    }
  };
  
  // Agregar manejador de clic al botón
  mobileMenuButton.addEventListener('click', toggleMenu);
}
