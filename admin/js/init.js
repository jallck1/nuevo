// Importar funciones de autenticación
import { checkAuthAndRole } from './auth.js';

// Función para inicializar la autenticación
async function initAuth() {
    // Verificar autenticación y rol
    const { isAuthenticated, user } = await checkAuthAndRole('admin');
    
    if (isAuthenticated && user) {
        // Actualizar la interfaz de usuario con la información del usuario
        updateUI(user);
    }
}

// Actualizar la interfaz de usuario con la información del usuario
function updateUI(user) {
    // Actualizar el nombre de usuario en la barra de navegación
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.email || 'Usuario';
    }
    
    // Configurar el botón de cierre de sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
}

// Inicializar la autenticación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initAuth().catch(error => {
        console.error('Error al inicializar la autenticación:', error);
    });
});

// Hacer que la función de cierre de sesión esté disponible globalmente
window.logout = async function() {
    const { logout } = await import('./auth.js');
    await logout();
};
