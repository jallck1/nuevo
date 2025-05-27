// Importar la aplicación principal
import { HorizontApp } from './js/app.js';

// Crear instancia global de la aplicación
const initApp = async () => {
    try {
        // Crear instancia de la aplicación
        window.app = new HorizontApp();
        
        // Inicializar la aplicación
        await window.app.initialize();
        
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
    }
};

// Inicializar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer que la aplicación esté disponible globalmente para depuración
if (process.env.NODE_ENV === 'development') {
    window.HorizontApp = HorizontApp;
}
