import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';
import { renderLayout, initLayout } from './Layout.js';

export async function renderBuyerDashboard() {
  const app = document.getElementById('app');
  
  try {
    // Mostrar carga mientras se verifica la autenticación
    app.innerHTML = '<div class="flex justify-center items-center min-h-screen"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div></div>';
    
    // Verificar autenticación
    const isAuthenticated = await AuthService.isAuthenticated();
    if (!isAuthenticated) {
      showNotification({
        type: 'warning',
        message: 'Por favor inicia sesión para continuar'
      });
      window.location.href = ROUTES.LOGIN;
      return;
    }
    
    // Obtener usuario actual
    const user = await AuthService.getCurrentUser();
    
    // Si no hay usuario, redirigir al login
    if (!user) {
      showNotification({
        type: 'error',
        message: 'No se pudo cargar tu información de usuario'
      });
      window.location.href = ROUTES.LOGIN;
      return;
    }
    
    console.log('Usuario actual cargado:', user);
    
    // Crear el contenido del dashboard
    const dashboardContent = `
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <!-- Sección de bienvenida -->
        <div class="bg-white shadow rounded-lg p-6 mb-6">
          <h1 class="text-2xl font-bold text-gray-900">¡Hola, ${user.name || 'Usuario'}!</h1>
          <p class="mt-1 text-gray-600">Bienvenido a tu panel de control</p>
          
          <div class="mt-6 border-t border-gray-200 pt-4">
            <p class="text-sm text-gray-600">
              <i class="fas fa-calendar-day mr-2 text-primary-500"></i>
              Último acceso: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <!-- Tarjetas de resumen -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <!-- Pedidos pendientes -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <i class="fas fa-shopping-bag text-white text-xl"></i>
                </div>
                <div class="ml-5">
                  <p class="text-sm font-medium text-gray-500 truncate">Pedidos Pendientes</p>
                  <p class="mt-1 text-2xl font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
              <div class="text-sm">
                <a href="${ROUTES.BUYER_ORDERS}" class="font-medium text-blue-600 hover:text-blue-500">Ver todos los pedidos</a>
              </div>
            </div>
          </div>

          <!-- Productos favoritos -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <i class="fas fa-heart text-white text-xl"></i>
                </div>
                <div class="ml-5">
                  <p class="text-sm font-medium text-gray-500 truncate">Favoritos</p>
                  <p class="mt-1 text-2xl font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
              <div class="text-sm">
                <a href="${ROUTES.BUYER_FAVORITES}" class="font-medium text-blue-600 hover:text-blue-500">Ver favoritos</a>
              </div>
            </div>
          </div>

          <!-- Estado de cuenta -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <i class="fas fa-wallet text-white text-xl"></i>
                </div>
                <div class="ml-5">
                  <p class="text-sm font-medium text-gray-500 truncate">Saldo Disponible</p>
                  <p class="mt-1 text-2xl font-semibold text-gray-900">$0.00</p>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
              <div class="text-sm">
                <a href="${ROUTES.BUYER_PAYMENTS}" class="font-medium text-blue-600 hover:text-blue-500">Ver detalles</a>
              </div>
            </div>
          </div>

          <!-- Soporte -->
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <i class="fas fa-headset text-white text-xl"></i>
                </div>
                <div class="ml-5">
                  <p class="text-sm font-medium text-gray-500 truncate">Soporte</p>
                  <p class="mt-1 text-sm text-gray-500">¿Necesitas ayuda?</p>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-5 py-3">
              <div class="text-sm">
                <a href="${ROUTES.BUYER_PQRS}" class="font-medium text-blue-600 hover:text-blue-500">Contactar soporte</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de pedidos recientes -->
        <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Tus pedidos recientes</h3>
            <p class="mt-1 text-sm text-gray-500">Aquí puedes ver el estado de tus pedidos más recientes.</p>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <div class="text-center py-12">
              <i class="fas fa-shopping-bag text-gray-300 text-4xl mb-3"></i>
              <p class="text-gray-500">No tienes pedidos recientes.</p>
              <div class="mt-6">
                <a href="${ROUTES.BUYER_CATALOG}" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <i class="fas fa-shopping-cart -ml-1 mr-2"></i>
                  Ir al catálogo
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de productos recomendados -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Productos recomendados</h3>
            <p class="mt-1 text-sm text-gray-500">Productos que podrían interesarte.</p>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <div class="text-center py-12">
              <i class="fas fa-star text-gray-300 text-4xl mb-3"></i>
              <p class="text-gray-500">No hay recomendaciones disponibles en este momento.</p>
              <div class="mt-6">
                <a href="${ROUTES.BUYER_CATALOG}" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <i class="fas fa-store -ml-1 mr-2"></i>
                  Explorar catálogo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Renderizar el layout con el contenido del dashboard
    app.innerHTML = await renderLayout(dashboardContent, user);
    
    // Inicializar menús del layout
    initLayout();
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    showNotification({
      type: 'error',
      message: 'Error al cargar el dashboard. Por favor, inténtalo de nuevo.'
    });
    window.location.href = ROUTES.HOME;
  }
}

// Función global para manejar el cierre de sesión
window.handleLogout = async () => {
  try {
    const { error } = await AuthService.logout();
    if (error) throw error;
    
    showNotification({
      type: 'success',
      message: 'Sesión cerrada correctamente.'
    });
    
    window.navigateTo(ROUTES.HOME);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showNotification({
      type: 'error',
      message: 'Error al cerrar sesión. Por favor, inténtalo de nuevo.'
    });
  }
};
