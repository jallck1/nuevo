// Función para mostrar notificaciones al usuario
export function showNotification(message, type = 'success') {
    // Crear el contenedor de notificaciones si no existe
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2 w-80';
        document.body.appendChild(container);
    }

    // Crear la notificación
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    
    notification.className = `p-4 rounded-lg shadow-lg text-white ${bgColor} transition-all duration-300 transform hover:scale-105`;
    notification.role = 'alert';
    
    const content = document.createElement('div');
    content.className = 'flex items-center';
    
    // Icono según el tipo de notificación
    const icon = document.createElement('i');
    icon.className = type === 'success' 
        ? 'fas fa-check-circle mr-2 text-xl'
        : 'fas fa-exclamation-circle mr-2 text-xl';
    
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    
    content.appendChild(icon);
    content.appendChild(messageEl);
    notification.appendChild(content);
    
    // Agregar botón de cierre
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-2 right-2 text-white hover:text-gray-200';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);
    
    // Agregar la notificación al contenedor
    container.insertBefore(notification, container.firstChild);
    
    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    return notification;
}

// Función para mostrar un indicador de carga
export function showLoading(message = 'Cargando...') {
    const container = document.createElement('div');
    container.id = 'loading-indicator';
    container.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const spinner = document.createElement('div');
    spinner.className = 'animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500';
    
    const text = document.createElement('p');
    text.className = 'mt-4 text-white font-medium';
    text.textContent = message;
    
    const content = document.createElement('div');
    content.className = 'text-center';
    content.appendChild(spinner);
    content.appendChild(text);
    
    container.appendChild(content);
    document.body.appendChild(container);
    
    return {
        hide: () => {
            container.style.opacity = '0';
            setTimeout(() => container.remove(), 300);
        }
    };
}

// Función para mostrar un diálogo de confirmación
export function showConfirm(message, onConfirm, onCancel = null) {
    const container = document.createElement('div');
    container.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-lg p-6 w-96';
    
    const messageEl = document.createElement('p');
    messageEl.className = 'mb-6 text-gray-700';
    messageEl.textContent = message;
    
    const buttons = document.createElement('div');
    buttons.className = 'flex justify-end space-x-3';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-4 py-2 text-gray-600 hover:bg-gray-100 rounded';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => {
        if (typeof onCancel === 'function') onCancel();
        container.remove();
    };
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.onclick = () => {
        if (typeof onConfirm === 'function') onConfirm();
        container.remove();
    };
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    dialog.appendChild(messageEl);
    dialog.appendChild(buttons);
    container.appendChild(dialog);
    document.body.appendChild(container);
    
    return container;
}
