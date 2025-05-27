// Tipos de notificaciones soportadas
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Mostrar una notificación
export function showNotification({ type = 'info', message, duration = 5000 }) {
  // Crear contenedor de notificaciones si no existe
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-3 w-80';
    document.body.appendChild(container);
  }

  // Crear elemento de notificación
  const notification = document.createElement('div');
  const id = `notification-${Date.now()}`;
  
  // Estilos base
  notification.id = id;
  notification.className = `p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${getNotificationClasses(type)}`;
  notification.role = 'alert';
  
  // Contenido de la notificación
  notification.innerHTML = `
    <div class="flex items-start">
      <div class="flex-shrink-0">
        ${getNotificationIcon(type)}
      </div>
      <div class="ml-3 w-0 flex-1 pt-0.5">
        <p class="text-sm font-medium text-gray-900">
          ${getNotificationTitle(type)}
        </p>
        <p class="mt-1 text-sm text-gray-700">
          ${message}
        </p>
      </div>
      <div class="ml-4 flex-shrink-0 flex">
        <button onclick="document.getElementById('${id}').remove()" class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none">
          <span class="sr-only">Cerrar</span>
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  `;

  // Agregar al contenedor
  container.prepend(notification);

  // Auto-eliminar después de la duración especificada
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      setTimeout(() => element.remove(), 300);
    }
  }, duration);

  return id;
}

// Obtener clases CSS según el tipo de notificación
function getNotificationClasses(type) {
  const baseClasses = 'relative overflow-hidden';
  const typeClasses = {
    [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-50 border-l-4 border-green-400',
    [NOTIFICATION_TYPES.ERROR]: 'bg-red-50 border-l-4 border-red-400',
    [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-50 border-l-4 border-yellow-400',
    [NOTIFICATION_TYPES.INFO]: 'bg-blue-50 border-l-4 border-blue-400',
  };
  return `${baseClasses} ${typeClasses[type] || typeClasses[NOTIFICATION_TYPES.INFO]}`;
}

// Obtener icono según el tipo de notificación
function getNotificationIcon(type) {
  const icons = {
    [NOTIFICATION_TYPES.SUCCESS]: `
      <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
    `,
    [NOTIFICATION_TYPES.ERROR]: `
      <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
    `,
    [NOTIFICATION_TYPES.WARNING]: `
      <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    `,
    [NOTIFICATION_TYPES.INFO]: `
      <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
    `
  };
  return icons[type] || icons[NOTIFICATION_TYPES.INFO];
}

// Obtener título según el tipo de notificación
function getNotificationTitle(type) {
  const titles = {
    [NOTIFICATION_TYPES.SUCCESS]: '¡Éxito!',
    [NOTIFICATION_TYPES.ERROR]: 'Error',
    [NOTIFICATION_TYPES.WARNING]: 'Advertencia',
    [NOTIFICATION_TYPES.INFO]: 'Información'
  };
  return titles[type] || titles[NOTIFICATION_TYPES.INFO];
}

// Métodos de conveniencia
export const showSuccess = (message, duration) => 
  showNotification({ type: NOTIFICATION_TYPES.SUCCESS, message, duration });

export const showError = (message, duration) => 
  showNotification({ type: NOTIFICATION_TYPES.ERROR, message, duration });

export const showWarning = (message, duration) => 
  showNotification({ type: NOTIFICATION_TYPES.WARNING, message, duration });

export const showInfo = (message, duration) => 
  showNotification({ type: NOTIFICATION_TYPES.INFO, message, duration });

// Hacer los métodos disponibles globalmente
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
