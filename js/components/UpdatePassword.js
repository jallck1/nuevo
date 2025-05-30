import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';

export async function renderUpdatePassword() {
  const app = document.getElementById('app');
  
  // Verificar si hay una sesión de recuperación activa
  const { hasRecoverySession } = await AuthService.checkRecoverySession();
  
  if (!hasRecoverySession) {
    showNotification({
      type: 'error',
      message: 'El enlace de recuperación no es válido o ha expirado.'
    });
    window.navigateTo(ROUTES.LOGIN);
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Restablecer contraseña</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Crea una nueva contraseña para tu cuenta
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form id="updatePasswordForm" class="space-y-6">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Nueva contraseña</label>
              <div class="mt-1">
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autocomplete="new-password" 
                  required 
                  minlength="8"
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ingresa tu nueva contraseña"
                >
              </div>
              <p class="mt-2 text-sm text-gray-500">
                La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
              <div class="mt-1">
                <input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  autocomplete="new-password" 
                  required 
                  minlength="8"
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirma tu nueva contraseña"
                >
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Actualizar contraseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Agregar manejador de formulario
  document.getElementById('updatePasswordForm')?.addEventListener('submit', handleUpdatePassword);
}

async function handleUpdatePassword(e) {
  e.preventDefault();
  
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const submitButton = document.querySelector('#updatePasswordForm button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  
  // Validar que las contraseñas coincidan
  if (password !== confirmPassword) {
    showNotification({
      type: 'error',
      message: 'Las contraseñas no coinciden. Por favor, inténtalo de nuevo.'
    });
    return;
  }
  
  try {
    // Deshabilitar el botón y mostrar indicador de carga
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Actualizando...
    `;
    
    // Actualizar la contraseña
    const { success, error } = await AuthService.updatePassword(password);
    
    if (error || !success) {
      throw error || new Error('Error al actualizar la contraseña');
    }
    
    // Mostrar mensaje de éxito
    showNotification({
      type: 'success',
      message: '¡Tu contraseña ha sido actualizada correctamente!'
    });
    
    // Cerrar sesión y redirigir al login
    await AuthService.logout();
    
    // Redirigir a la página de login después de 2 segundos
    setTimeout(() => {
      window.navigateTo(ROUTES.LOGIN);
    }, 2000);
    
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    showNotification({
      type: 'error',
      message: error.message || 'Error al actualizar la contraseña. Por favor, inténtalo de nuevo.'
    });
    
  } finally {
    // Restaurar el botón
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}
