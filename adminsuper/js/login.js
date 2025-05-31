// Mensaje de depuración
console.log('Archivo login.js cargado correctamente');

// Configuración de Supabase
const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Hacer que supabase esté disponible globalmente
window.supabase = supabaseClient;

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loginButton = document.querySelector('button[type="submit"]');

// Variables para control de intentos
let failedAttempts = 0;
const MAX_ATTEMPTS = 3;
const BLOCK_TIME_MS = 30000; // 30 segundos
let blockUntil = 0;
let blockTimer = null;
let securityModalTimer = null;
let securityModalTimeLeft = 0;
let isSecurityModalActive = false;

// Función para actualizar la hora (solo si el elemento existe)
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-CO', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
        timeElement.textContent = timeString;
    }
}

// Verificar si ya hay una sesión activa
document.addEventListener('DOMContentLoaded', async () => {
    // Actualizar la hora cada segundo solo si el elemento existe
    if (document.getElementById('currentTime')) {
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    // Cargar información del usuario
    async function loadUserInfo() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Mostrar información del usuario
                const userEmail = user.email || 'usuario@ejemplo.com';
                const userName = user.user_metadata?.full_name || 'Administrador';
                
                document.getElementById('userEmail').textContent = userEmail;
                
                // Actualizar avatar con las iniciales
                const nameParts = userName.split(' ');
                const initials = nameParts.length > 1 
                    ? `${nameParts[0][0]}${nameParts[1][0]}`
                    : userName.substring(0, 2);
                    
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff`;
                document.getElementById('userAvatar').src = avatarUrl;
            }
        } catch (error) {
            console.error('Error al cargar información del usuario:', error);
        }
    }
    
    // Cargar información del usuario al iniciar
    await loadUserInfo();
    
    // Manejador para el botón de logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            // Redirigir al login
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
        }
    });
    
    // Manejadores para los modales
    const modals = {
        store: {
            btn: 'createStoreBtn',
            modal: 'storeModal',
            close: 'closeStoreModal',
            cancel: 'cancelStore',
            confirm: 'confirmStore',
            fields: [
                { id: 'storeName', type: 'text', required: true },
                { id: 'adminEmail', type: 'email', required: true },
                { id: 'storeLocation', type: 'text', required: true },
                { id: 'storePhone', type: 'tel', required: true }
            ]
        },
        buyers: {
            btn: 'viewBuyersBtn',
            modal: 'buyersModal',
            close: 'closeBuyersModal',
            search: 'searchBuyers',
            export: 'exportBuyers'
        },
        pqrs: {
            btn: 'pqrsBtn',
            modal: 'pqrsModal',
            close: 'closePqrsModal',
            tabs: ['pending', 'in-progress', 'resolved']
        },
        manageStores: {
            btn: 'manageStoresBtn',
            modal: 'manageStoresModal',
            close: 'closeManageStoresModal',
            filter: 'storeFilter',
            search: 'searchStores'
        },
        createAdmin: {
            btn: 'createAdminBtn',
            modal: 'createAdminModal',
            close: 'closeCreateAdminModal',
            cancel: 'cancelAdmin',
            confirm: 'confirmAdmin',
            togglePassword: 'toggleAdminPassword',
            fields: [
                { id: 'adminName', type: 'text', required: true },
                { id: 'adminEmail', type: 'email', required: true },
                { id: 'adminPassword', type: 'password', required: true },
                { id: 'adminRole', type: 'select', required: true },
                { id: 'adminStore', type: 'select', required: false }
            ]
        },
        reports: {
            btn: 'reportsBtn',
            modal: 'reportsModal',
            close: 'closeReportsModal',
            cancel: 'cancelReport',
            generate: 'generateReport',
            reportType: 'reportType',
            dateFrom: 'reportDateFrom',
            dateTo: 'reportDateTo',
            format: 'reportFormat'
        }
    };

    // Inicializar todos los modales
    function initModals() {
        console.log('Inicializando modales...');
        
        Object.values(modals).forEach(modalConfig => {
            const { btn, modal, close, cancel, confirm, togglePassword } = modalConfig;
            
            console.log(`Configurando modal: ${modal}`);
            
            // Abrir modal desde botón
            const openBtn = document.getElementById(btn);
            if (openBtn) {
                console.log(`Añadiendo evento click a ${btn}`);
                openBtn.addEventListener('click', (e) => {
                    console.log(`Abriendo modal: ${modal}`);
                    openModal(modal);
                });
            } else {
                console.warn(`No se encontró el botón con ID: ${btn}`);
            }
            
            // Cerrar modal desde botón de cierre (X)
            const closeBtn = document.querySelector(`#${modal} .close-modal`);
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    console.log(`Cerrando modal: ${modal}`);
                    closeModal(modal);
                });
            } else {
                console.warn(`No se encontró el botón de cierre para: ${modal}`);
            }
            
            // Botón de cancelar (usando clase .btn-cancel)
            const cancelBtn = document.querySelector(`#${modal} .btn-cancel`);
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    console.log(`Cancelando en modal: ${modal}`);
                    closeModal(modal);
                });
            } else if (cancel) {
                console.warn(`No se encontró el botón de cancelar para: ${modal}`);
            }
            
            // Botón de confirmar (usando clase .btn-confirm)
            const confirmBtn = document.querySelector(`#${modal} .btn-confirm`);
            if (confirmBtn) {
                confirmBtn.addEventListener('click', (e) => {
                    console.log(`Confirmando en modal: ${modal}`);
                    handleConfirm(modalConfig);
                });
            } else if (confirm) {
                console.warn(`No se encontró el botón de confirmar para: ${modal}`);
            }
            
            // Toggle de contraseña
            if (togglePassword) {
                const toggleBtn = document.getElementById(togglePassword);
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const input = toggleBtn.previousElementSibling;
                        const type = input.type === 'password' ? 'text' : 'password';
                        input.type = type;
                        toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
                    });
                }
            }
        });
        
        // Cerrar modal al hacer clic fuera del contenido
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-red')) {
                closeAllModals();
            }
        });
        
        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }
    
    // Función para abrir un modal
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Cerrar cualquier otro modal abierto
            closeAllModals();
            // Mostrar el modal
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Enfocar el primer campo de entrada si existe
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    // Función para cerrar un modal
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    // Función para cerrar todos los modales
    function closeAllModals() {
        document.querySelectorAll('.modal-red').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }
    
    // Manejador de confirmación para cada modal
    function handleConfirm(modalConfig) {
        const { modal, fields } = modalConfig;
        
        // Validar campos requeridos
        if (fields) {
            let isValid = true;
            const formData = {};
            
            fields.forEach(field => {
                const input = document.querySelector(`#${modal} [name="${field.id}"]`) || 
                              document.getElementById(field.id);
                
                if (input) {
                    formData[field.id] = input.value.trim();
                    
                    // Validación básica
                    if (field.required && !input.value.trim()) {
                        isValid = false;
                        input.classList.add('error');
                    } else {
                        input.classList.remove('error');
                    }
                    
                    // Validación de email
                    if (field.type === 'email' && input.value && !isValidEmail(input.value)) {
                        isValid = false;
                        input.classList.add('error');
                    }
                }
            });
            
            if (!isValid) {
                showNotification('Por favor completa todos los campos requeridos', 'error');
                return;
            }
            
            // Aquí iría la lógica para guardar los datos
            console.log(`Guardando datos de ${modal}:`, formData);
            
            // Simular envío exitoso
            setTimeout(() => {
                closeModal(modal);
                showNotification('Operación realizada con éxito', 'success');
                
                // Limpiar formulario
                if (fields) {
                    fields.forEach(field => {
                        const input = document.querySelector(`#${modal} [name="${field.id}"]`) || 
                                      document.getElementById(field.id);
                        if (input) input.value = '';
                    });
                }
            }, 1000);
        } else {
            // Para modales sin formulario
            closeModal(modal);
        }
    }
    
    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        // Crear contenedor de notificaciones si no existe
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        // Crear la notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.background = type === 'error' ? '#ff4444' : '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '4px';
        notification.style.marginBottom = '10px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.transform = 'translateX(120%)';
        notification.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        notification.style.opacity = '0';
        notification.style.maxWidth = '300px';
        notification.style.wordBreak = 'break-word';
        
        // Agregar icono según el tipo
        const icon = document.createElement('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        icon.style.marginRight = '10px';
        
        notification.appendChild(icon);
        notification.appendChild(document.createTextNode(message));
        
        container.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Eliminar después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Cerrar al hacer clic
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        });
    }
    
    // Función auxiliar para validar email
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Inicializar pestañas en el modal de PQRS
    function initPqrsTabs() {
        const tabButtons = document.querySelectorAll('#pqrsModal .tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remover clase activa de todos los botones
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // Agregar clase activa al botón clickeado
                button.classList.add('active');
                
                // Aquí iría la lógica para cargar el contenido de la pestaña
                const tabId = button.getAttribute('data-tab');
                console.log(`Cambiando a pestaña: ${tabId}`);
            });
        });
    }
    
    // Inicializar todo cuando el DOM esté listo
    function initializeApp() {
        console.log('Inicializando aplicación...');
        
        // Verificar si los botones de los modales existen
        const modalButtons = ['createStoreBtn', 'viewBuyersBtn', 'pqrsBtn', 'manageStoresBtn', 'createAdminBtn', 'reportsBtn'];
        modalButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            console.log(`Botón ${btnId} encontrado:`, btn ? 'Sí' : 'No');
            
            // Agregar manejador de eventos manualmente si es necesario
            if (btn) {
                btn.addEventListener('click', function(e) {
                    console.log(`Botón ${btnId} clickeado`);
                    const modalId = btnId.replace('Btn', 'Modal');
                    console.log(`Intentando abrir modal: ${modalId}`);
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        console.log(`Mostrando modal: ${modalId}`);
                        modal.style.display = 'block';
                    } else {
                        console.error(`No se encontró el modal con ID: ${modalId}`);
                    }
                });
            }
        });
        
        // Eliminar la declaración duplicada de modalButtons
        
        // Inicializar modales
        if (typeof initModals === 'function') {
            console.log('Inicializando modales...');
            initModals();
        } else {
            console.error('La función initModals no está definida');
        }
        
        // Inicializar pestañas de PQRS
        if (typeof initPqrsTabs === 'function') {
            console.log('Inicializando pestañas PQRS...');
            initPqrsTabs();
        }
        
        // Inicializar el selector de fecha con la fecha actual
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) input.value = today;
        });
        
        // La verificación de botones ya se realizó anteriormente
    }
    
    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
    
    // Hacer que las funciones estén disponibles globalmente
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.closeAllModals = closeAllModals;
    window.showNotification = showNotification; // Hacer que showNotification esté disponible globalmente
    window.supabase = supabase; // Hacer que supabase esté disponible globalmente
    
    // Efecto de sonido al hacer clic en los botones
    const buttons = document.querySelectorAll('.neon-box, .btn-neon, .logout-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Agregar efecto visual
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        });
    });
    
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
            // Verificar si el usuario está autenticado
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                window.location.href = 'index.html';
                return;
            } else {
                // Cerrar sesión si no es super admin
                await supabase.auth.signOut();
                localStorage.removeItem('adminRememberMe');
                sessionStorage.removeItem('adminLoggedIn');
            }
        }
    } catch (error) {
        console.error('Error al verificar la sesión:', error);
    }

    // Cargar nombre de usuario si hay una sesión recordada
    const rememberMe = localStorage.getItem('adminRememberMe');
    if (rememberMe === 'true') {
        const savedEmail = localStorage.getItem('adminEmail');
        if (savedEmail) {
            document.getElementById('username').value = savedEmail;
            document.getElementById('remember-me').checked = true;
        }
    }
});

// Función para verificar si la cuenta está bloqueada
function isAccountBlocked() {
    const now = Date.now();
    if (now < blockUntil) {
        return true;
    }
    // Si el tiempo de bloqueo ya pasó, reiniciar contador
    if (failedAttempts >= MAX_ATTEMPTS) {
        failedAttempts = 0;
    }
    return false;
}

// Función para bloquear temporalmente el inicio de sesión
function blockLogin() {
    const now = Date.now();
    blockUntil = now + BLOCK_TIME_MS;
    
    // Actualizar la interfaz
    updateLoginButtonState();
    
    // Configurar temporizador para actualizar la interfaz
    if (blockTimer) clearInterval(blockTimer);
    blockTimer = setInterval(updateLoginButtonState, 1000);
    
    // Limpiar el temporizador después del tiempo de bloqueo
    setTimeout(() => {
        clearInterval(blockTimer);
        blockTimer = null;
        
        // No reiniciar el contador si el modal de seguridad está activo
        if (!isSecurityModalActive) {
            failedAttempts = 0;
        }
        
        updateLoginButtonState();
    }, BLOCK_TIME_MS);
}

// Función para mostrar el modal de seguridad
function showSecurityModal() {
    const modal = document.getElementById('securityAlertModal');
    const timerElement = document.getElementById('securityTimer');
    const timerBar = document.getElementById('securityTimerBar');
    const closeButton = document.getElementById('closeSecurityModal');
    
    if (!modal || !timerElement || !timerBar || !closeButton) return;
    
    // Inicializar el temporizador
    securityModalTimeLeft = 30;
    isSecurityModalActive = true;
    
    // Mostrar el modal
    modal.classList.remove('hidden');
    
    // Configurar el botón de cierre
    closeButton.disabled = true;
    closeButton.style.opacity = '0.5';
    closeButton.style.cursor = 'not-allowed';
    
    // Iniciar el temporizador
    if (securityModalTimer) clearInterval(securityModalTimer);
    
    securityModalTimer = setInterval(() => {
        securityModalTimeLeft--;
        
        // Actualizar la interfaz
        if (timerElement) timerElement.textContent = securityModalTimeLeft;
        if (timerBar) {
            const percentage = (securityModalTimeLeft / 30) * 100;
            timerBar.style.width = `${percentage}%`;
        }
        
        // Cuando termina el tiempo
        if (securityModalTimeLeft <= 0) {
            clearInterval(securityModalTimer);
            isSecurityModalActive = false;
            modal.classList.add('hidden');
            closeButton.disabled = false;
            closeButton.style.opacity = '1';
            closeButton.style.cursor = 'pointer';
            
            // Reiniciar el contador de intentos a 2 para permitir 2 intentos más
            failedAttempts = 1;
            
            // Cerrar el modal después de 1 segundo
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 1000);
        }
    }, 1000);
    
    // Configurar el evento de cierre del modal
    closeButton.onclick = function() {
        if (securityModalTimeLeft <= 0) {
            clearInterval(securityModalTimer);
            modal.classList.add('hidden');
        }
    };
}

// Función para actualizar el estado del botón de inicio de sesión
function updateLoginButtonState() {
    if (!loginButton) return;
    
    const now = Date.now();
    if (now < blockUntil) {
        // Mostrar tiempo restante
        const remainingSeconds = Math.ceil((blockUntil - now) / 1000);
        loginButton.disabled = true;
        loginButton.innerHTML = `Intenta de nuevo en ${remainingSeconds}s`;
        
        // Actualizar mensaje de error
        if (errorMessage) {
            errorMessage.textContent = `Demasiados intentos fallidos. Intenta de nuevo en ${remainingSeconds} segundos.`;
            errorMessage.classList.remove('hidden');
        }
    } else {
        // Restaurar botón
        loginButton.disabled = false;
        loginButton.innerHTML = 'Iniciar Sesión';
        
        // Limpiar mensaje de error si no hay otros errores
        if (errorMessage && failedAttempts === 0) {
            errorMessage.classList.add('hidden');
        }
    }
}

// Función para manejar el envío del formulario de inicio de sesión
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Verificar si la cuenta está bloqueada
    if (isAccountBlocked()) {
        updateLoginButtonState();
        return;
    }
    
    // Mostrar carga
    const originalButtonText = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...';
    errorMessage.classList.add('hidden');
    
    try {
        console.log('Intentando iniciar sesión con:', email);
        
        // Verificar que supabaseClient esté inicializado correctamente
        if (!supabaseClient) {
            throw new Error('Error: supabaseClient no está inicializado correctamente');
        }

        // Iniciar sesión con Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) {
            console.error('Error en signInWithPassword:', error);
            throw error;
        }

        if (!data || !data.user) {
            throw new Error('No se recibieron datos de usuario válidos');
        }
        
        console.log('Sesión iniciada, verificando rol de administrador...');
        console.log('Verificando rol de administrador para el usuario:', data.user.id);
        
        // Obtener el perfil del usuario directamente de auth.users
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError) {
            console.error('Error al obtener datos del usuario:', userError);
            throw new Error('No se pudo verificar el rol de administrador');
        }
        
        console.log('Datos del usuario:', userData);
        
        // Verificar si el usuario es admin o super admin de múltiples maneras
        const user = userData.user;
        const isAdmin = 
            user.role === 'admin' || 
            user.role === 'service_role' ||
            (user.user_metadata && (
                user.user_metadata.is_super_admin === true ||
                user.user_metadata.role === 'admin'
            )) ||
            (user.app_metadata && user.app_metadata.role === 'admin') ||
            (user.raw_user_meta_data && (
                user.raw_user_meta_data.is_super_admin === true || 
                user.raw_user_meta_data.role === 'admin'
            ));
        
        console.log('Rol del usuario:', user.role);
        console.log('Metadata del usuario:', {
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata,
            raw_user_meta_data: user.raw_user_meta_data,
            isAdmin: isAdmin
        });
        
        if (!isAdmin) {
            console.log('El usuario no tiene permisos de administrador');
            throw new Error('No tienes permisos para acceder al panel de administración');
        }
        
        console.log('Usuario autenticado como administrador');
        
        // Guardar preferencia de recordar usuario
        if (rememberMe) {
            localStorage.setItem('adminEmail', email);
            localStorage.setItem('adminRememberMe', 'true');
        } else {
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminRememberMe');
            sessionStorage.setItem('adminLoggedIn', 'true');
        }
        
        // Mostrar mensaje de éxito
        console.log('Inicio de sesión exitoso');
        alert('¡Inicio de sesión exitoso!');
        
        // Redirigir automáticamente después de mostrar el mensaje
        window.location.href = 'admincecepsiesa.html';
    } catch (error) {
        console.error('Error al verificar el rol:', error);
        let errorMessageText = 'Error al iniciar sesión. Verifica tus credenciales.';
        
        if (error.message.includes('Invalid login credentials')) {
            // Incrementar contador de intentos fallidos
            failedAttempts++;
            const remainingAttempts = MAX_ATTEMPTS - failedAttempts;
            
            if (remainingAttempts > 0) {
                errorMessageText = `Credenciales incorrectas. Te quedan ${remainingAttempts} intentos.`;
            } else {
                // Bloquear el inicio de sesión
                blockLogin();
                
                // Si es el primer bloqueo, mostrar el modal de seguridad
                if (failedAttempts === MAX_ATTEMPTS) {
                    setTimeout(() => {
                        showSecurityModal();
                    }, 1000);
                } else if (failedAttempts > MAX_ATTEMPTS) {
                    // Si es un intento después del primer bloqueo, forzar el modal de seguridad
                    showSecurityModal();
                }
                
                return; // Salir temprano ya que blockLogin maneja la UI
            }
        } else if (error.message.includes('Email not confirmed')) {
            errorMessageText = 'Por favor, verifica tu correo electrónico antes de iniciar sesión.';
        } else if (error.message) {
            errorMessageText = error.message;
        }
        
        // Mostrar mensaje de error
        errorMessage.textContent = errorMessageText;
        errorMessage.classList.remove('hidden');
        
        // Agitar el formulario para dar feedback visual
        loginForm.classList.add('animate-shake');
        setTimeout(() => {
            loginForm.classList.remove('animate-shake');
        }, 500);
    } finally {
        // Si no estamos en modo bloqueado, restaurar el botón
        if (!isAccountBlocked()) {
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonText;
        }
    }
}

// Agregar el manejador de eventos al formulario de inicio de sesión
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Agregar animación de shake al CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .animate-shake {
        animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);