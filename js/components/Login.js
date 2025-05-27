import { ROUTES, getDefaultRoute } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';

export async function renderLogin() {
  const app = document.getElementById('app');
  
  // Verificar si ya está autenticado
  const isAuthenticated = await AuthService.isAuthenticated();
  if (isAuthenticated) {
    const user = await AuthService.getCurrentUser();
    const defaultRoute = getDefaultRoute(user.role);
    window.navigateTo(defaultRoute);
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar sesión</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿No tienes una cuenta? 
          <a href="${ROUTES.REGISTER}" data-route class="font-medium text-blue-600 hover:text-blue-500">
            Regístrate
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form id="loginForm" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <div class="mt-1">
                <input id="email" name="email" type="email" autocomplete="email" required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
              <div class="mt-1">
                <input id="password" name="password" type="password" autocomplete="current-password" required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" 
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                  Recordarme
                </label>
              </div>

              <div class="text-sm">
                <a href="${ROUTES.FORGOT_PASSWORD}" data-route class="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button type="submit" 
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Iniciar sesión
              </button>
            </div>
          </form>
          
          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Iniciar sesión con Google</span>
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.527 2.341 1.086 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.14 18.16 20 14.418 20 10c0-5.523-4.477-10-10-10z" clip-rule="evenodd" />
                  </svg>
                </a>
              </div>

              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Iniciar sesión con Microsoft</span>
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 21 21">
                    <path d="M11.403 9.166h5.675V4.49h-5.675v4.675zm-7.04 0h5.675V4.49H4.364v4.675zm0 6.825h5.675v-4.633H4.364v4.633zm7.04 0h5.675v-4.633h-5.675v4.633zM1.667 1.667h17.5v17.5H1.667V1.667z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar manejador de formulario
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  try {
    const { success, user, error } = await AuthService.login(email, password);
    
    if (error || !success) {
      throw error || new Error('Error al iniciar sesión');
    }
    
    // Mostrar notificación de éxito
    showNotification({
      type: 'success',
      message: `¡Bienvenido/a, ${user.name || user.email}!`
    });
    
    // Forzar recarga de la página para asegurar que todos los estados se actualicen
    window.location.href = getDefaultRoute(user.role);
    
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    showNotification({
      type: 'error',
      message: error.message || 'Error al iniciar sesión. Verifica tus credenciales.'
    });
  }
}

// La función getDefaultRoute ahora se importa desde routes.js
