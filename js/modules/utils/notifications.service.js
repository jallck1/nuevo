// Servicio para manejar notificaciones
export class NotificationService {
    constructor() {
        this.notifications = [];
        this.subscribers = [];
    }

    // Suscribirse a las notificaciones
    subscribe(callback) {
        this.subscribers.push(callback);
        // Devolver función para desuscribirse
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    // Notificar a los suscriptores
    notify(notification) {
        this.subscribers.forEach(callback => callback(notification));
    }

    // Mostrar notificación de éxito
    success(message, options = {}) {
        const notification = {
            id: Date.now(),
            type: 'success',
            message,
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        this.autoDismiss(notification.id, options.duration || 5000);
        return notification.id;
    }

    // Mostrar notificación de error
    error(message, options = {}) {
        const notification = {
            id: Date.now(),
            type: 'error',
            message,
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        this.autoDismiss(notification.id, options.duration || 10000);
        return notification.id;
    }

    // Mostrar notificación de advertencia
    warning(message, options = {}) {
        const notification = {
            id: Date.now(),
            type: 'warning',
            message,
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        this.autoDismiss(notification.id, options.duration || 7000);
        return notification.id;
    }

    // Mostrar notificación informativa
    info(message, options = {}) {
        const notification = {
            id: Date.now(),
            type: 'info',
            message,
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        this.autoDismiss(notification.id, options.duration || 5000);
        return notification.id;
    }

    // Cerrar notificación manualmente
    dismiss(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notify({ type: 'dismiss', id });
    }

    // Cerrar notificación automáticamente después de un tiempo
    autoDismiss(id, duration) {
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }
    }

    // Obtener notificaciones activas
    getNotifications() {
        return [...this.notifications];
    }

    // Limpiar todas las notificaciones
    clearAll() {
        const ids = this.notifications.map(n => n.id);
        this.notifications = [];
        ids.forEach(id => this.notify({ type: 'dismiss', id }));
    }

    // Mostrar notificación de carga
    showLoading(message = 'Cargando...', options = {}) {
        const notification = {
            id: Date.now(),
            type: 'loading',
            message,
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        return notification.id;
    }

    // Ocultar notificación de carga
    hideLoading(id) {
        this.dismiss(id);
    }

    // Mostrar notificación de confirmación
    confirm(options) {
        const notificationId = Date.now();
        const notification = {
            id: notificationId,
            type: 'confirm',
            message: options.message,
            confirmText: options.confirmText || 'Aceptar',
            cancelText: options.cancelText || 'Cancelar',
            onConfirm: () => {
                this.dismiss(notificationId);
                options.onConfirm?.();
            },
            onCancel: () => {
                this.dismiss(notificationId);
                options.onCancel?.();
            },
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        return notificationId;
    }

    // Mostrar notificación con acción personalizada
    action(message, actions = [], options = {}) {
        const notificationId = Date.now();
        const notification = {
            id: notificationId,
            type: 'action',
            message,
            actions: actions.map(action => ({
                ...action,
                handler: () => {
                    action.handler?.();
                    if (action.dismissOnAction !== false) {
                        this.dismiss(notificationId);
                    }
                }
            })),
            ...options,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.notify(notification);
        
        if (options.duration) {
            this.autoDismiss(notificationId, options.duration);
        }
        
        return notificationId;
    }
}
