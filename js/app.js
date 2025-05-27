// Importar servicios
import { AuthService } from '@/modules/auth/auth.service.js';
import { OrdersService } from '@/modules/api/orders.service.js';
import { ProductsService } from '@/modules/api/products.service.js';
import { CategoriesService } from '@/modules/api/categories.service.js';
import { StoresService } from '@/modules/api/stores.service.js';
import { CreditsService } from '@/modules/api/credits.service.js';
import { NotificationService } from '@/modules/utils/notifications.service.js';
import { StorageService } from '@/modules/utils/storage.service.js';
import { DateUtils } from '@/modules/utils/date.utils.js';
import { CurrencyUtils } from '@/modules/utils/currency.utils.js';
import { supabase } from '@/config/supabase.js';

// Clase principal de la aplicación
class HorizontApp {
    constructor() {
        // Inicializar servicios
        this.auth = new AuthService(supabase);
        this.orders = new OrdersService(supabase);
        this.products = new ProductsService(supabase);
        this.categories = new CategoriesService(supabase);
        this.stores = new StoresService(supabase);
        this.credits = new CreditsService(supabase);
        this.notifications = new NotificationService();
        this.storage = new StorageService(supabase);
        this.dates = new DateUtils();
        this.currency = new CurrencyUtils();
        
        // Estado de la aplicación
        this.currentUser = null;
        this.currentProfile = null;
        this.isInitialized = false;
        
        // Inicializar la aplicación
        this.initialize();
    }

    // Inicializar la aplicación
    async initialize() {
        try {
            // Configurar manejadores de autenticación
            this.setupAuthHandlers();
            
            // Verificar sesión activa
            await this.checkAuthState();
            
            // Inicializar componentes de la UI
            this.initializeUI();
            
            this.isInitialized = true;
            console.log('Aplicación inicializada correctamente');
            
            // Disparar evento de inicialización
            document.dispatchEvent(new CustomEvent('app:initialized'));
            
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            notifications.error('Error al inicializar la aplicación');
        }
    }
    
    // Configurar manejadores de autenticación
    setupAuthHandlers() {
        // Escuchar cambios en el estado de autenticación
        auth.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Cambio en el estado de autenticación:', event);
            
            if (event === 'SIGNED_IN') {
                await this.handleSignIn(session);
            } else if (event === 'SIGNED_OUT') {
                this.handleSignOut();
            } else if (event === 'PASSWORD_RECOVERY') {
                this.handlePasswordRecovery(session);
            }
        });
    }
    
    // Manejar inicio de sesión
    async handleSignIn(session) {
        try {
            // Obtener perfil del usuario
            const { data: profile, error } = await auth.getProfile();
            
            if (error) throw error;
            
            this.currentUser = session.user;
            this.currentProfile = profile;
            
            // Guardar datos de sesión en el almacenamiento local
            storage.setLocal('user', {
                id: this.currentUser.id,
                email: this.currentUser.email,
                role: profile.role,
                storeId: profile.store_id
            });
            
            // Redirigir según el rol
            this.redirectBasedOnRole(profile.role);
            
            // Disparar evento de inicio de sesión
            document.dispatchEvent(new CustomEvent('auth:signin', { 
                detail: { user: this.currentUser, profile } 
            }));
            
            notifications.success(`Bienvenido/a, ${profile.name || profile.email}`);
            
        } catch (error) {
            console.error('Error al manejar inicio de sesión:', error);
            notifications.error('Error al iniciar sesión');
            await auth.logout();
        }
    }
    
    // Manejar cierre de sesión
    handleSignOut() {
        this.currentUser = null;
        this.currentProfile = null;
        storage.removeLocal('user');
        
        // Redirigir a la página de inicio de sesión
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = '/index.html';
        }
        
        // Disparar evento de cierre de sesión
        document.dispatchEvent(new CustomEvent('auth:signout'));
    }
    
    // Manejar recuperación de contraseña
    handlePasswordRecovery(session) {
        console.log('Recuperación de contraseña solicitada:', session);
        // Aquí podrías redirigir a una página de restablecimiento de contraseña
    }
    
    // Verificar estado de autenticación
    async checkAuthState() {
        try {
            const { data: { session } } = await auth.supabase.auth.getSession();
            
            if (session) {
                await this.handleSignIn(session);
            } else {
                this.handleSignOut();
            }
        } catch (error) {
            console.error('Error al verificar estado de autenticación:', error);
            this.handleSignOut();
        }
    }
    
    // Redirigir según el rol del usuario
    redirectBasedOnRole(role) {
        const currentPath = window.location.pathname;
        const defaultRoute = getDefaultRoute(role);
        
        // Redirigir usando el enrutador
        if (window.router) {
            window.router.navigate(defaultRoute);
        } else {
            // Fallback en caso de que el router no esté disponible
            window.location.href = defaultRoute;
        }
    }
    
    // Inicializar componentes de la UI
    initializeUI() {
        // Inicializar tooltips
        this.initializeTooltips();
        
        // Inicializar modales
        this.initializeModals();
        
        // Inicializar menús desplegables
        this.initializeDropdowns();
        
        // Inicializar formularios
        this.initializeForms();
        
        // Inicializar notificaciones
        this.initializeNotifications();
    }
    
    // Inicializar tooltips
    initializeTooltips() {
        // Implementar lógica de tooltips usando Tippy.js o similar
        console.log('Inicializando tooltips...');
    }
    
    // Inicializar modales
    initializeModals() {
        // Implementar lógica de modales
        console.log('Inicializando modales...');
    }
    
    // Inicializar menús desplegables
    initializeDropdowns() {
        // Implementar lógica de menús desplegables
        console.log('Inicializando menús desplegables...');
    }
    
    // Inicializar formularios
    initializeForms() {
        // Implementar lógica de inicialización de formularios
        console.log('Inicializando formularios...');
    }
    
    // Inicializar sistema de notificaciones
    initializeNotifications() {
        // Configurar manejador de notificaciones globales
        window.addEventListener('show-notification', (event) => {
            const { type, message, duration } = event.detail;
            notifications[type](message, { duration });
        });
        
        // Manejar errores no capturados
        window.addEventListener('error', (event) => {
            notifications.error('Ha ocurrido un error inesperado');
            console.error('Error no capturado:', event.error);
        });
        
        // Manejar promesas rechazadas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;
            const errorMessage = error.message || 'Error en la operación';
            notifications.error(errorMessage);
            console.error('Promesa rechazada no capturada:', error);
        });
    }
    
    // Método para cerrar sesión
    async logout() {
        try {
            await auth.logout();
            this.handleSignOut();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            notifications.error('Error al cerrar sesión');
        }
    }
}

// Importar función getDefaultRoute
import { getDefaultRoute } from './config/routes.js';

// Exportar la clase HorizontApp para su uso en otros módulos
export { HorizontApp };
