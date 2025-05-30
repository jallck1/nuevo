import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';

export async function renderForgotPassword() {
  const app = document.getElementById('app');
  
  // Verificar si el usuario ya está autenticado
  const isAuthenticated = await AuthService.isAuthenticated();
  if (isAuthenticated) {
    const user = await AuthService.getCurrentUser();
    window.navigateTo(getDefaultRoute(user.role));
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Recuperar contraseña</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿Recuerdas tu contraseña? 
          <a href="${ROUTES.LOGIN}" data-route class="font-medium text-blue-600 hover:text-blue-500">
            Inicia sesión
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form id="forgotPasswordForm" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <div class="mt-1">
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autocomplete="email" 
                  required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ingresa tu correo electrónico"
                >
              </div>
              <p class="mt-2 text-sm text-gray-500">
                Te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>

            <div>
              <button 
                type="submit" 
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Enviar enlace de recuperación
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Agregar manejador de formulario
  document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
}

async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const submitButton = document.querySelector('#forgotPasswordForm button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  
  try {
    // Deshabilitar el botón y mostrar indicador de carga
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Enviando...
    `;
    
    // Enviar correo de recuperación
    const { success, error } = await AuthService.sendPasswordResetEmail(email);
    
    if (error || !success) {
      throw error || new Error('Error al enviar el correo de recuperación');
    }
    
    // Mostrar mensaje de éxito
    showNotification({
      type: 'success',
      message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.'
    });
    
    // Redirigir a la página de login después de 3 segundos
    setTimeout(() => {
      window.navigateTo(ROUTES.LOGIN);
    }, 3000);
    
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    showNotification({
      type: 'error',
      message: error.message || 'Error al enviar el correo de recuperación. Verifica el correo e inténtalo de nuevo.'
    });
    
  } finally {
    // Restaurar el botón
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}

// Función auxiliar para obtener la ruta por defecto según el rol
function getDefaultRoute(role) {
  return role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.BUYER_DASHBOARD;
}
