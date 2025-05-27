import { createClient } from '@supabase/supabase-js';
import { showNotification } from './modules/utils/notifications.js';

// Re-exportar showNotification
export { showNotification };

// Configuración de Supabase
const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Crear cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Constantes de roles
export const ROLES = {
    ADMIN: 'admin',
    BUYER: 'buyer'
};

// Estados de órdenes
export const ORDER_STATUS = {
    PENDING: 'pendiente',
    PROCESSING: 'procesando',
    COMPLETED: 'completada',
    CANCELLED: 'cancelada'
};



/**
 * Formatea una fecha en formato legible
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
export function formatDate(dateString) {
    if (!dateString) return '';
    
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota'
    };
    
    try {
        return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (error) {
        console.error('Error al formatear la fecha:', error);
        return dateString;
    }
}

/**
 * Formatea un monto como moneda colombiana (COP)
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado como moneda
 */
export function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        console.warn('Se esperaba un número para formatear como moneda, se recibió:', amount);
        return amount;
    }
    
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Verifica si el usuario está autenticado y tiene el rol requerido
 * @param {string} [requiredRole=null] - Rol requerido para acceder
 * @returns {Promise<{isAuthenticated: boolean, user: object|null, error: string|null}>}
 */
export async function checkAuth(requiredRole = null) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        if (!user) return { isAuthenticated: false, user: null };
        
        // Si se requiere un rol específico, verificarlo
        if (requiredRole) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
                
            if (profileError) throw profileError;
            if (profile.role !== requiredRole) {
                return { 
                    isAuthenticated: false, 
                    user: null, 
                    error: 'No tienes permisos suficientes para acceder a esta sección' 
                };
            }
        }
        
        return { isAuthenticated: true, user };
    } catch (error) {
        console.error('Error en checkAuth:', error);
        return { 
            isAuthenticated: false, 
            user: null, 
            error: error.message || 'Error al verificar la autenticación' 
        };
    }
}

/**
 * Cierra la sesión del usuario actual
 * @returns {Promise<void>}
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Redirigir al login
        window.location.href = '/auth/login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        throw new Error('No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.');
    }
}

/**
 * Obtiene la dirección IP del cliente
 * @returns {Promise<string>} - Dirección IP del cliente
 */
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'unknown';
    } catch (error) {
        console.error('Error al obtener la IP:', error);
        return 'unknown';
    }
}

/**
 * Registra una actividad en el log de auditoría
 * @param {string} action - Acción realizada
 * @param {string} targetEntity - Entidad afectada
 * @param {string|number} targetId - ID de la entidad afectada
 * @param {object} [details={}] - Detalles adicionales
 * @returns {Promise<void>}
 */
export async function logActivity(action, targetEntity, targetId, details = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { error } = await supabase
            .from('audit_logs')
            .insert([
                {
                    user_id: user.id,
                    action,
                    target_entity: targetEntity,
                    target_id: targetId,
                    details: JSON.stringify(details),
                    ip_address: await getClientIP(),
                    user_agent: navigator.userAgent,
                    created_at: new Date().toISOString()
                }
            ]);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error al registrar actividad:', error);
        // No lanzamos el error para no afectar el flujo principal
    }
}

/**
 * Obtiene el perfil completo del usuario actual
 * @returns {Promise<object|null>} - Perfil del usuario o null si hay error
 */
export async function getCurrentUserProfile() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw authError || new Error('Usuario no autenticado');
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        
        return { ...user, ...profile };
    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        return null;
    }
}

/**
 * Valida los campos de un formulario
 * @param {FormData} formData - Datos del formulario
 * @param {Array<{name: string, label: string, type?: string, required?: boolean, pattern?: RegExp, errorMessage?: string}>} fields - Configuración de validación
 * @returns {Object.<string, string>|null} - Objeto con errores o null si no hay errores
 */
export function validateForm(formData, fields) {
    const errors = {};
    
    for (const field of fields) {
        const value = formData.get(field.name)?.toString().trim() || '';
        
        // Validar campo requerido
        if (field.required && !value) {
            errors[field.name] = field.errorMessage || `El campo ${field.label} es obligatorio`;
            continue;
        }
        
        // Validar formato de email
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errors[field.name] = field.errorMessage || 'El formato del correo electrónico no es válido';
            }
        }
        
        // Validar con patrón personalizado
        if (field.pattern && value) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
                errors[field.name] = field.errorMessage || `El formato de ${field.label} no es válido`;
            }
        }
    }
    
    return Object.keys(errors).length === 0 ? null : errors;
}

/**
 * Muestra un mensaje de error en la interfaz
 * @param {string} message - Mensaje de error
 * @param {HTMLElement} [container=document.body] - Contenedor donde mostrar el mensaje
 */
export function showError(message, container = document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    errorDiv.textContent = message;
    
    container.appendChild(errorDiv);
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Muestra un mensaje de éxito en la interfaz
 * @param {string} message - Mensaje de éxito
 * @param {HTMLElement} [container=document.body] - Contenedor donde mostrar el mensaje
 */
export function showSuccess(message, container = document.body) {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    successDiv.textContent = message;
    
    container.appendChild(successDiv);
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Exportar todo por defecto
export default {
    supabase,
    ROLES,
    ORDER_STATUS,
    formatDate,
    formatCurrency,
    checkAuth,
    logout,
    logActivity,
    getCurrentUserProfile,
    validateForm,
    showError,
    showSuccess,
    showNotification // Importada desde notifications.js
};
