// Elementos del DOM
let usersTableBody;
let usersSearchInput;
let newUserModal;
let editUserModal;
let currentUser;

// Roles disponibles
const ROLES = [
    { value: 'admin', label: 'Administrador' },
    { value: 'buyer', label: 'Cliente' }
];

// Estados disponibles
const STATUSES = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' }
];

// Inicializar elementos del DOM
async function initElements() {
    try {
        console.log('Inicializando elementos...');
        
        // Inicializar elementos
        usersTableBody = document.getElementById('users-table-body');
        usersSearchInput = document.getElementById('search-input');
        
        console.log('Elementos del DOM cargados:', { usersTableBody, usersSearchInput });
        
        // Inicializar modales con Bootstrap
        const newUserModalEl = document.getElementById('newUserModal');
        const editUserModalEl = document.getElementById('editUserModal');
        
        // Inicializar modales si Bootstrap está disponible
        if (typeof bootstrap !== 'undefined') {
            // Configurar modal de nuevo usuario
            if (newUserModalEl) {
                newUserModal = new bootstrap.Modal(newUserModalEl);
                
                // Manejar el botón de mostrar/ocultar contraseña
                const togglePassword = newUserModalEl.querySelector('#toggle-password');
                const passwordInput = newUserModalEl.querySelector('#user-password');
                
                if (togglePassword && passwordInput) {
                    togglePassword.addEventListener('click', function() {
                        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                        passwordInput.setAttribute('type', type);
                        const icon = this.querySelector('i');
                        if (icon) {
                            icon.classList.toggle('fa-eye');
                            icon.classList.toggle('fa-eye-slash');
                        }
                    });
                }
                
                // Cerrar modal al hacer clic fuera del contenido
                newUserModalEl.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden');
                    }
                });
                
                // Cerrar con tecla Escape
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && !newUserModalEl.classList.contains('hidden')) {
                        newUserModalEl.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden');
                    }
                });
                
                console.log('Modal de nuevo usuario configurado');
                
                // Configurar botón para abrir el modal
                const newUserBtn = document.getElementById('new-user-btn');
                if (newUserBtn) {
                    newUserBtn.addEventListener('click', function() {
                        if (newUserModalEl) {
                            newUserModalEl.classList.remove('hidden');
                            document.body.classList.add('overflow-hidden');
                            // Enfocar el primer campo del formulario
                            const firstInput = newUserModalEl.querySelector('input');
                            if (firstInput) firstInput.focus();
                        }
                    });
                }
            }
            
            // Configurar modal de edición
            if (editUserModalEl) {
                editUserModal = new bootstrap.Modal(editUserModalEl);
                
                // Cerrar modal al hacer clic fuera del contenido
                editUserModalEl.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden');
                    }
                });
                
                // Cerrar con tecla Escape
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && !editUserModalEl.classList.contains('hidden')) {
                        editUserModalEl.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden');
                    }
                });
                
                console.log('Modal de edición de usuario configurado');
            }
        } else {
            console.warn('Bootstrap no está cargado correctamente');
        }
        
        // Configurar botón de crear usuario
        const createUserBtn = document.getElementById('create-user-button');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', window.createUser);
            console.log('Manejador de eventos agregado al botón de crear usuario');
        }
        
        // Configurar botones de cierre del modal
        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.fixed.inset-0');
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.classList.remove('overflow-hidden');
                }
            });
        });
        
        // Inicializar modal de edición si existe
        if (editUserModalEl) {
            editUserModal = new bootstrap.Modal(editUserModalEl);
            console.log('Modal de edición de usuario inicializado');
        }
        
        // Verificar si Supabase está disponible
        if (!window.supabase) {
            throw new Error('Supabase no está disponible');
        }
        
        // Obtener el usuario actual
        console.log('Obteniendo usuario actual...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('Error de autenticación o usuario no autenticado:', authError);
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Usuario autenticado:', user.email);
        currentUser = user;
        
        // Inicializar selects de roles y estados
        console.log('Inicializando selects...');
        initSelects();
        
        // Cargar usuarios
        console.log('Cargando usuarios...');
        await loadUsers();
        
        // Configurar eventos de búsqueda
        if (usersSearchInput) {
            console.log('Configurando eventos de búsqueda...');
            
            // Usar addEventListener con función flecha para mantener el contexto
            usersSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase().trim();
                console.log('Buscando:', searchTerm);
                
                const rows = document.querySelectorAll('#users-table-body tr');
                console.log('Filas a filtrar:', rows.length);
                
                rows.forEach(row => {
                    // Obtener el texto de toda la fila para buscar coincidencias
                    const rowText = row.textContent.toLowerCase();
                    const isVisible = rowText.includes(searchTerm);
                    
                    console.log('Fila:', rowText, 'Coincide:', isVisible);
                    
                    // Mostrar u ocultar la fila
                    row.style.display = isVisible ? '' : 'none';
                });
            });
            
            console.log('Evento de búsqueda configurado correctamente');
        } else {
            console.error('No se encontró el elemento de búsqueda');
        }
        
        console.log('Inicialización completada con éxito');
    } catch (error) {
        console.error('Error initializing elements:', error);
        showError('Error al inicializar la aplicación: ' + (error.message || 'Error desconocido'));
    }
}

// Esperar a que el DOM y Supabase estén listos
async function initializeApp() {
    console.log('Inicializando aplicación...');
    
    try {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        console.log('Verificando inicialización de Supabase...');
        
        // Esperar a que Supabase esté listo
        await waitForSupabase();
        
        console.log('Supabase listo, inicializando elementos...');
        
        // Inicializar elementos del DOM
        await initElements();
        
        // Verificar autenticación
        const { data: { user }, error } = await window.supabase.auth.getUser();
        
        if (error || !user) {
            console.error('Usuario no autenticado:', error);
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        console.log('Usuario autenticado:', user.email);
        
        // Cargar datos iniciales
        await initSelects();
        await loadUsers('all');
        
        console.log('Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Error al cargar la aplicación: ' + (error.message || 'Error desconocido'));
    }
}

// Función para esperar a que Supabase esté listo
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 30; // Aumentamos el número de intentos
        let attempts = 0;
        
        console.log('🔍 Verificando estado de Supabase...');
        
        // Verificar si ya está listo
        if (window.supabaseReady) {
            console.log('✅ Supabase ya está listo');
            resolve();
            return;
        }
        
        // Escuchar el evento personalizado que indica que Supabase está listo
        const onSupabaseReady = () => {
            console.log('✅ Evento supabaseReady recibido');
            document.removeEventListener('supabaseReady', onSupabaseReady);
            resolve();
        };
        
        document.addEventListener('supabaseReady', onSupabaseReady);
        
        // Verificación periódica como respaldo
        const checkSupabase = () => {
            attempts++;
            
            // Verificar si Supabase está disponible y listo
            if (window.supabaseReady) {
                console.log(`✅ Supabase está listo después de ${attempts} intentos`);
                document.removeEventListener('supabaseReady', onSupabaseReady);
                resolve();
                return;
            }
            
            // Verificar si se ha alcanzado el número máximo de intentos
            if (attempts >= maxAttempts) {
                const errorDetails = {
                    message: `No se pudo verificar Supabase después de ${maxAttempts} intentos`,
                    supabaseAvailable: !!window.supabase,
                    supabaseType: typeof window.supabase,
                    supabaseReady: window.supabaseReady,
                    windowKeys: Object.keys(window).filter(key => key.includes('supabase') || key.includes('Supabase'))
                };
                
                console.error('❌ Error al verificar Supabase:', errorDetails);
                document.removeEventListener('supabaseReady', onSupabaseReady);
                reject(new Error(JSON.stringify(errorDetails, null, 2)));
                return;
            }
            
            // Mostrar mensaje de espera
            console.log(`⏳ Esperando a que Supabase se inicialice... (${attempts}/${maxAttempts})`);
            
            // Mostrar información de depuración cada 5 intentos
            if (attempts % 5 === 0) {
                console.log('📊 Estado actual:', {
                    'Supabase cargado': !!window.supabase,
                    'Tipo de Supabase': typeof window.supabase,
                    'Estado de ready': window.supabaseReady ? 'Listo' : 'No listo',
                    'Objeto supabase': window.supabase ? 'Disponible' : 'No disponible',
                    'adminSupabase disponible': !!window.adminSupabase
                });
            }
            
            // Esperar antes del siguiente intento
            setTimeout(checkSupabase, 500);
        };
        
        // Comenzar la verificación
        checkSupabase();
    });
}

// Función para inicializar los clientes de Supabase
async function initializeSupabase() {
    console.log('Inicializando clientes de Supabase...');
    
    try {
        // Verificar que la biblioteca esté cargada
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            throw new Error('La biblioteca de Supabase no está disponible o no se cargó correctamente');
        }
        
        // Configuración de Supabase
        const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';
        const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY4MTQ5MywiZXhwIjoyMDYzMjU3NDkzfQ.Pgu07EHCkkvnFvgZV262Etm5z-iCZ2D24s4KAnCZjOo';
        
        // Inicializar cliente normal
        if (!window.supabase) {
            try {
                window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                });
                console.log('Cliente normal de Supabase inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar el cliente normal de Supabase:', error);
                throw new Error('No se pudo inicializar el cliente normal de Supabase');
            }
        }
        
        // Inicializar cliente de administración
        if (!window.adminSupabase) {
            try {
                window.adminSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });
                console.log('Cliente de administración de Supabase inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar el cliente de administración de Supabase:', error);
                // No lanzamos error aquí para permitir que la aplicación funcione sin el cliente de administración
                console.warn('La aplicación continuará sin el cliente de administración. Algunas funciones pueden no estar disponibles.');
            }
        }
        
        // Verificar que al menos el cliente normal esté disponible
        if (!window.supabase) {
            throw new Error('No se pudo inicializar el cliente de Supabase');
        }
        
        return true;
        
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        showError('Error al conectar con la base de datos: ' + (error.message || 'Error desconocido'));
        return false;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando aplicación...');
    
    // Agregar manejador de eventos para el botón de envío
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            console.log('Botón de envío clickeado');
            createUser(e);
        });
    }
    
    // Inicializar la aplicación
    initializeApp();
});

// Inicializar selects
async function initSelects() {
    try {
        console.log('Inicializando selects...');
        
        const roleSelects = document.querySelectorAll('.role-select');
        const statusSelects = document.querySelectorAll('.status-select');
        const storeSelects = document.querySelectorAll('#user-store, #edit-user-store');
        
        // Llenar selects de roles
        if (roleSelects.length > 0) {
            roleSelects.forEach(select => {
                // Limpiar opciones existentes
                select.innerHTML = '';
                
                // Agregar opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar rol';
                select.appendChild(defaultOption);
                
                // Agregar opciones de roles
                ROLES.forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.value;
                    option.textContent = role.label;
                    select.appendChild(option);
                });
            });
        }
        
        // Llenar selects de estados
        if (statusSelects.length > 0) {
            statusSelects.forEach(select => {
                // Limpiar opciones existentes
                select.innerHTML = '';
                
                // Agregar opción por defecto
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccionar estado';
                select.appendChild(defaultOption);
                
                // Agregar opciones de estados
                STATUSES.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status.value;
                    option.textContent = status.label;
                    select.appendChild(option);
                });
            });
        }
        
        // Cargar tiendas si hay elementos de selección de tienda
        if (storeSelects.length > 0) {
            console.log('Cargando tiendas para selects...');
            await loadStores();
        }
        
        console.log('Selects inicializados correctamente');
        
    } catch (error) {
        console.error('Error al inicializar selects:', error);
        showError('Error al cargar los datos del formulario');
    }
}

// Cargar tiendas
async function loadStores(selectElement = null, selectedStoreId = null) {
    try {
        console.log('Iniciando carga de tiendas...');
        
        // Obtener el usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        console.log('Usuario autenticado:', user?.email);
        
        // Obtener el perfil del usuario
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error al obtener perfil:', profileError);
            throw profileError;
        }
        
        if (!userProfile) {
            throw new Error('No se encontró el perfil del usuario');
        }
        
        console.log('Perfil de usuario:', userProfile);
        
        // Si el usuario es admin, cargar todas las tiendas
        let storeQuery = supabase
            .from('stores')
            .select('*');
            
        // Si no es admin, cargar solo su tienda
        if (userProfile.role !== 'admin' && userProfile.store_id) {
            storeQuery = storeQuery.eq('id', userProfile.store_id);
        }
        
        const { data: stores, error: storeError } = await storeQuery;
        
        if (storeError) {
            console.error('Error al cargar tiendas:', storeError);
            throw storeError;
        }
        
        console.log('Tiendas cargadas:', stores);
        
        // Si no se proporcionó un select, obtener todos los selects de tienda
        const storeSelects = selectElement ? 
            [selectElement] : 
            document.querySelectorAll('#user-store, #edit-user-store');
        
        if (storeSelects.length === 0) {
            console.warn('No se encontraron elementos select de tienda en el DOM');
            return;
        }
        
        storeSelects.forEach(select => {
            if (!select) return; // Saltar si el elemento no existe
            
            // Guardar el valor seleccionado actual
            const selectedValue = select.value || selectedStoreId;
            // Limpiar opciones existentes
            select.innerHTML = '';
            
            // Agregar opción por defecto
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = stores && stores.length > 0 ? 'Seleccionar tienda' : 'No hay tiendas disponibles';
            select.appendChild(defaultOption);
            
            // Agregar las tiendas
            if (stores && stores.length > 0) {
                stores.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store.id;
                    option.textContent = store.name || store.nombre || `Tienda ${store.id.substring(0, 4)}`;
                    select.appendChild(option);
                    
                    // Seleccionar la tienda si coincide con el valor guardado
                    if (selectedValue === store.id) {
                        select.value = selectedValue;
                    }
                });
            }
            
            // Si solo hay una tienda, seleccionarla por defecto
            if (stores && stores.length === 1 && !selectedValue) {
                select.value = stores[0].id;
            }
            
            // Disparar evento de cambio para notificar a otros componentes
            select.dispatchEvent(new Event('change'));
        });
        
        console.log('Tiendas cargadas correctamente');
        
    } catch (error) {
        console.error('Error al cargar tiendas:', error);
        
        // Mostrar mensaje de error en los selects
        const errorMessage = 'Error al cargar las tiendas';
        const storeSelects = selectElement ? 
            [selectElement] : 
            document.querySelectorAll('#user-store, #edit-user-store');
            
        storeSelects.forEach(select => {
            if (!select) return;
            select.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = errorMessage;
            select.appendChild(option);
        });
        
        // Mostrar notificación al usuario
        showError('No se pudieron cargar las tiendas. Por favor, recarga la página.');
    }
}

// Cargar usuarios
async function loadUsers(filter = 'all') {
    try {
        console.log('Iniciando carga de usuarios con filtro:', filter);
        showLoading(true);
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('Error al obtener el usuario actual:', userError);
            window.location.href = 'login.html';
            return;
        }
        
        // Obtener el perfil del usuario actual
        const { data: currentUserProfile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError || !currentUserProfile) {
            console.error('Error al obtener el perfil del usuario:', profileError);
            throw new Error('No se pudo cargar el perfil del usuario');
        }
        
        // Verificar si el usuario es administrador
        const isAdmin = currentUserProfile.role === 'admin';
        
        if (!isAdmin) {
            console.log('Usuario no es administrador');
            showError('No tienes permisos para ver los usuarios');
            return;
        }
        
        if (!currentUserProfile.store_id) {
            console.error('El usuario no tiene asignada una tienda');
            showError('No se pudo determinar la tienda del usuario');
            return;
        }
        
        console.log('Cargando usuarios de la tienda ID:', currentUserProfile.store_id);
        
        // Construir la consulta para obtener los usuarios con la información de la tienda
        console.log('Cargando usuarios para la tienda ID:', currentUserProfile.store_id);
        
        // Primero, obtener la información de la tienda
        const { data: storeInfo, error: storeError } = await window.supabase
            .from('stores')
            .select('*')
            .eq('id', currentUserProfile.store_id)
            .single();
            
        if (storeError) {
            console.error('Error al cargar la tienda:', storeError);
            throw storeError;
        }
        
        // Actualizar la variable global con la información de la tienda
        storeData = storeInfo;
        console.log('Información de la tienda:', storeData);
        
        // Obtener solo los usuarios compradores (buyer) de la tienda actual con sus créditos
        let query = window.supabase
            .from('profiles')
            .select('*, credit_assigned, credit_used')
            .eq('store_id', currentUserProfile.store_id)
            .eq('role', 'buyer')  // Solo usuarios con rol 'buyer'
            
        // Filtrar por estado (activo/inactivo)
        if (filter === 'active') {
            query = query.eq('status', 'active');
        } else if (filter === 'inactive') {
            query = query.eq('status', 'inactive');
        }
        
        // Ordenar por fecha de creación descendente
        query = query.order('created_at', { ascending: false });
        
        console.log('Ejecutando consulta...');
        const { data: users, error } = await query;
        
        console.log('Respuesta de la consulta:', { users, error });
        
        if (error) {
            console.error('Error en la consulta:', error);
            throw error;
        }
        
        console.log('Usuarios cargados:', users);
        
        // Renderizar usuarios
        renderUsers(users || []);
    } catch (error) {
        console.error('Error en loadUsers:', error);
        showError('Error al cargar los usuarios: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Variable global para almacenar la información de la tienda
let storeData = null;

// Renderizar usuarios
function renderUsers(users) {
    console.log('Renderizando usuarios:', users);
    
    if (!usersTableBody) {
        console.error('No se encontró el elemento tbody para la tabla de usuarios');
        return;
    }
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-sm text-gray-500">
                    No se encontraron usuarios
                </td>
            </tr>`;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => {
        const statusLabel = STATUSES.find(s => s.value === user.status)?.label || user.status;
        // Usar el nombre de la tienda que ya cargamos previamente
        // Verificamos tanto 'name' como 'nombre' para mayor compatibilidad
        const storeName = storeData?.name || storeData?.nombre || 'Sin tienda';
        
        // Ocultar la columna de rol ya que todos son compradores
        
        // Formatear fechas
        const formatDate = (dateString) => {
            if (!dateString) return 'Nunca';
            const date = new Date(dateString);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Bogota' // Ajusta esto según tu zona horaria
            });
        };
        
        const createdAt = formatDate(user.created_at);
        const lastLogin = formatDate(user.last_sign_in_at);
        
        // Obtener cupo y deuda directamente del usuario
        const creditAssigned = user.credit_assigned !== undefined ? 
            parseFloat(user.credit_assigned).toFixed(2) : '0.00';
        const creditUsed = user.credit_used !== undefined ? 
            parseFloat(user.credit_used).toFixed(2) : '0.00';
        
        // Calcular saldo disponible (cupo asignado - crédito usado)
        const availableCredit = (parseFloat(creditAssigned) - parseFloat(creditUsed)).toFixed(2);
        
        // Determinar el color del estado
        let statusClass = 'bg-yellow-100 text-yellow-800';
        if (user.status === 'Activo') {
            statusClass = 'bg-green-100 text-green-800';
        } else if (user.status === 'Inactivo') {
            statusClass = 'bg-red-100 text-red-800';
        }
        
        // Determinar el color del saldo disponible (rojo si es negativo)
        const creditClass = parseFloat(availableCredit) < 0 ? 'text-red-600 font-semibold' : 'text-gray-900';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        ${user.avatar_url ? `
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full" src="${user.avatar_url}" alt="${user.name || 'Usuario'}">
                            </div>
                        ` : `
                            <div class="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full">
                                <span class="text-blue-600 font-medium">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                            </div>
                        `}
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.name || 'Sin nombre'}</div>
                            <div class="text-sm text-gray-500">${user.email || 'Sin correo'}</div>
                        </div>
                    </div>
                </td>
                <!-- Columna de rol oculta -->
                <td class="hidden"></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex items-center">
                        <div class="h-2.5 w-2.5 rounded-full bg-green-400 mr-2"></div>
                        ${storeName}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${user.phone ? `
                        <a href="tel:${user.phone}" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-phone-alt mr-1"></i> ${user.phone}
                        </a>
                    ` : 'Sin teléfono'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${creditClass}">
                    S/ ${availableCredit}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    S/ ${creditUsed}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${createdAt}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${lastLogin}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editUser('${user.id}')" 
                            class="mr-3 text-blue-600 hover:text-blue-900 transition-colors duration-200"
                            data-bs-toggle="tooltip" data-bs-placement="top" title="Editar usuario">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="if(confirm('¿Estás seguro de eliminar este usuario?')) deleteUser('${user.id}')" 
                            class="text-red-600 hover:text-red-900 transition-colors duration-200"
                            data-bs-toggle="tooltip" data-bs-placement="top" title="Eliminar usuario">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Función para buscar usuarios
function searchUsers(event) {
    try {
        // Obtener el valor del input de búsqueda
        const searchInput = event ? event.target : usersSearchInput;
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        console.log('Buscando usuarios con término:', searchTerm);
        
        // Obtener todas las filas de la tabla
        const allUsers = document.querySelectorAll('#users-table-body tr');
        console.log('Total de filas encontradas:', allUsers.length);
        
        if (!searchTerm) {
            console.log('Término de búsqueda vacío, mostrando todos los usuarios');
            // Si el campo de búsqueda está vacío, mostrar todos los usuarios
            allUsers.forEach(row => {
                row.style.display = '';
            });
            return;
        }
        
        // Filtrar usuarios que coincidan con el término de búsqueda
        allUsers.forEach(row => {
            // Obtener las celdas de la fila
            const cells = row.getElementsByTagName('td');
            if (!cells || cells.length === 0) return;
            
            // Obtener el nombre y el email del primer td (celda 0)
            const nameDiv = cells[0]?.querySelector('div.ml-4 > div:first-child');
            const emailDiv = cells[0]?.querySelector('div.ml-4 > div.text-sm');
            
            // Obtener el teléfono de la celda 3 (índice 3)
            const phoneElement = cells[3]?.querySelector('a');
            
            // Obtener los textos
            const name = nameDiv?.textContent?.toLowerCase() || '';
            const email = emailDiv?.textContent?.toLowerCase() || '';
            const phone = phoneElement?.textContent?.toLowerCase() || '';
            
            console.log('Datos de la fila:', { name, email, phone });
            
            // Verificar si alguna de las celdas coincide con el término de búsqueda
            const matches = name.includes(searchTerm) || 
                          email.includes(searchTerm) || 
                          phone.includes(searchTerm);
            
            console.log(`Coincidencia para "${searchTerm}" en fila:`, { name, email, phone, matches });
            
            // Mostrar u ocultar la fila según si coincide
            row.style.display = matches ? '' : 'none';
        });
        
    } catch (error) {
        console.error('Error en searchUsers:', error);
        showError('Error al buscar usuarios: ' + (error.message || 'Error desconocido'));
    }
}

// Hacer la función searchUsers disponible globalmente
if (!window.searchUsers) {
    window.searchUsers = searchUsers;
}

// Función para crear un nuevo usuario
async function createUser(event) {
    console.log('=== INICIO DE createUser ===');
    
    // Prevenir el comportamiento por defecto del formulario
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    let userId; // Declarar userId al inicio de la función
    
    try {
        console.log('Iniciando creación de usuario...');
        
        // Verificar que window.adminSupabase esté disponible
        if (typeof window.adminSupabase === 'undefined' || !window.adminSupabase) {
            console.error('Error: window.adminSupabase no está definido');
            // Intentar inicializar Supabase si no está disponible
            const initialized = await initializeSupabase();
            if (!initialized) {
                throw new Error('Error de configuración del sistema. Por favor, recarga la página.');
            }
        }
        
        // Verificar si el usuario actual está autenticado
        const { data: currentAuthData, error: currentAuthError } = await window.supabase.auth.getUser();
        if (currentAuthError || !currentAuthData?.user) {
            console.error('Error de autenticación:', currentAuthError);
            throw new Error('No se pudo verificar la autenticación. Por favor, inicia sesión nuevamente.');
        }
        
        // Obtener el perfil del usuario actual
        const { data: currentUserProfile, error: currentProfileError } = await window.supabase
            .from('profiles')
            .select('role, store_id')
            .eq('id', currentAuthData.user.id)
            .single();
            
        if (currentProfileError || !currentUserProfile) {
            console.error('Error al obtener perfil del usuario:', currentProfileError);
            throw new Error('No se pudo verificar el perfil del usuario. Por favor, recarga la página.');
        }
        
        // Verificar si el usuario es administrador
        if (currentUserProfile.role !== 'admin') {
            throw new Error('No tienes permisos para crear usuarios');
        }
        
        // Obtener valores del formulario
        const name = document.getElementById('user-name')?.value.trim() || '';
        const lastname = document.getElementById('user-lastname')?.value.trim() || '';
        const fullName = `${name} ${lastname}`.trim();
        const email = document.getElementById('user-email')?.value.trim() || '';
        const password = document.getElementById('user-password')?.value || '';
        const role = 'buyer'; // Forzar rol 'buyer' para nuevos usuarios
        const storeId = document.getElementById('user-store')?.value || '';
        const phone = document.getElementById('user-phone')?.value.trim() || null;
        const creditAssigned = parseFloat(document.getElementById('user-credit-assigned')?.value) || 0;
        
        console.log('Datos del formulario:', { name, lastname, email, storeId, phone });
        
        // Validar campos requeridos
        let hasError = false;
        
        // Validar nombre
        if (!name) {
            showError('Por favor ingrese el nombre');
            document.getElementById('user-name')?.focus();
            hasError = true;
        }
        
        // Validar correo electrónico
        if (!email) {
            showError('Por favor ingrese el correo electrónico');
            document.getElementById('user-email')?.focus();
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Por favor ingrese un correo electrónico válido');
            document.getElementById('user-email')?.focus();
            hasError = true;
        }
        
        // Validar contraseña
        if (!password) {
            showError('Por favor ingrese una contraseña');
            document.getElementById('user-password')?.focus();
            hasError = true;
        } else if (password.length < 8) {
            showError('La contraseña debe tener al menos 8 caracteres');
            document.getElementById('user-password')?.focus();
            hasError = true;
        }
        
        // Validar tienda
        if (!storeId) {
            showError('Por favor seleccione una tienda');
            document.getElementById('user-store')?.focus();
            hasError = true;
        }
        
        // Validar cupo de crédito
        if (isNaN(creditAssigned) || creditAssigned < 0) {
            showError('Por favor ingrese un monto de crédito válido');
            document.getElementById('user-credit-assigned')?.focus();
            hasError = true;
        }
        
        if (hasError) {
            console.log('Validación fallida');
            return;
        }
        
        console.log('Datos validados correctamente');
        
        // Mostrar indicador de carga
        const submitButton = document.getElementById('submit-button');
        const originalButtonText = submitButton?.innerHTML || '';
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = 'Creando...';
        }
        
        // Verificar que adminSupabase esté disponible
        console.log('Verificando adminSupabase...');
        console.log('window.adminSupabase:', window.adminSupabase);
        console.log('adminSupabase:', adminSupabase);
        
        if (typeof window.adminSupabase === 'undefined' || !window.adminSupabase) {
            console.error('Error: adminSupabase no está definido');
            throw new Error('Error de configuración del sistema. Por favor, recarga la página.');
        }
        
        console.log('adminSupabase está disponible, continuando...');

        // Crear el usuario en Supabase Auth
        console.log('Creando usuario en Supabase Auth...');
        console.log('Usando window.adminSupabase:', window.adminSupabase);
        
        try {
            console.log('Iniciando creación de usuario con email:', email);
            
            const { data: authData, error: authError } = await window.adminSupabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Confirmar el correo automáticamente
                user_metadata: {
                    full_name: fullName,
                    role: role
                }
            });
            
            console.log('Respuesta de createUser:', { authData, authError });
            
            if (authError) {
                console.error('Error al crear usuario en Auth:', authError);
                throw new Error(authError.message || 'Error al crear el usuario');
            }
            
            if (!authData || !authData.user) {
                console.error('No se pudo obtener el usuario creado:', authData);
                throw new Error('No se pudo obtener el ID del usuario creado');
            }
            
            userId = authData.user.id; // Usar la variable ya declarada
            console.log('Usuario creado exitosamente con ID:', userId);
            
        } catch (error) {
            console.error('Error en createUser:', error);
            throw new Error(`Error al crear el usuario: ${error.message}`);
        }
        console.log('Usuario creado en Auth con ID:', userId);
        
        // Crear el perfil del usuario en la tabla profiles
        const profileData = {
            id: userId, // Usar la variable userId que ya tenemos
            name: fullName,
            email: email,
            role: role,
            store_id: storeId,
            phone: phone,
            credit_assigned: creditAssigned,
            credit_used: 0, // Inicializar crédito usado en 0
            status: 'Activo', // Usar 'Activo' con A mayúscula para coincidir con la restricción de la base de datos
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('Creando perfil con datos:', profileData);
        
        const { data: createdProfile, error: profileError } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();
            
        if (profileError) {
            console.error('Error al crear perfil:', profileError);
            // Intentar eliminar el usuario de Auth si falla la creación del perfil
            await supabase.auth.admin.deleteUser(userId);
            throw new Error(profileError.message || 'Error al crear el perfil del usuario');
        }
        
        console.log('Perfil creado exitosamente:', profileData);
        
        // Cerrar el modal y limpiar el formulario
        const modal = document.getElementById('newUserModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
        
        // Limpiar el formulario
        const form = document.getElementById('new-user-form');
        if (form) form.reset();
        
        // Mostrar mensaje de éxito
        showSuccess('Usuario creado exitosamente');
        
        // Recargar la lista de usuarios
        await loadUsers();
        
    } catch (error) {
        console.error('Error en createUser:', error);
        showError(error.message || 'Error al crear el usuario');
    } finally {
        // Restaurar el botón
        const submitButton = document.getElementById('submit-button');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Crear Usuario';
        }
    }
}

// Hacer la función createUser disponible globalmente
if (!window.createUser) {
    window.createUser = createUser;
}

// Función para cerrar el modal de edición
function closeEditModal() {
    const modalElement = document.getElementById('editUserModal');
    if (modalElement) {
        // Ocultar el modal
        modalElement.classList.add('hidden');
        modalElement.style.display = 'none';
        
        // Restaurar el body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Si hay un backdrop de Bootstrap, eliminarlo
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
    }
    
    // Si hay una instancia de Bootstrap Modal, usarla para ocultar
    if (editUserModal && typeof editUserModal.hide === 'function') {
        editUserModal.hide();
    }
}

// Editar usuario
async function editUser(userId) {
    try {
        showLoading(true);
        
        if (!currentUser) {
            showError('No se pudo verificar la autenticación');
            return;
        }
        
        // Obtener datos del usuario
        const { data: user, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        if (!user) {
            showError('Usuario no encontrado');
            return;
        }
        
        // Llenar el formulario de edición
        const editUserId = document.getElementById('edit-user-id');
        const editUserName = document.getElementById('edit-user-name');
        const editUserLastname = document.getElementById('edit-user-lastname');
        const editUserEmail = document.getElementById('edit-user-email');
        const editUserPhone = document.getElementById('edit-user-phone');
        const editUserPassword = document.getElementById('edit-user-password');
        
        // Establecer valores
        if (editUserId) editUserId.value = user.id || '';
        
        // Separar nombre y apellido si es necesario
        if (user.name) {
            const nameParts = user.name.split(' ');
            if (editUserName) editUserName.value = nameParts[0] || '';
            if (editUserLastname) editUserLastname.value = nameParts.slice(1).join(' ').trim() || '';
        } else {
            if (editUserName) editUserName.value = '';
            if (editUserLastname) editUserLastname.value = '';
        }
        
        // Establecer email
        if (editUserEmail) editUserEmail.value = user.email || '';
        
        // Establecer teléfono
        if (editUserPhone) {
            // Verificar si user.phone es una cadena antes de intentar usar replace
            if (user.phone && typeof user.phone === 'string') {
                // Extraer solo el número de teléfono (sin código de país)
                const phoneNumber = user.phone.replace(/^\+51\s*/, '');
                editUserPhone.value = phoneNumber;
            } else {
                // Si no hay teléfono o no es una cadena, dejar vacío
                editUserPhone.value = '';
            }
        }
        
        // Establecer crédito asignado y usado
        const editUserCreditAssigned = document.getElementById('edit-user-credit-assigned');
        const editUserCreditUsed = document.getElementById('edit-user-credit-used');
        const editUserCreditAvailable = document.getElementById('edit-user-credit-available');
        
        if (editUserCreditAssigned) {
            editUserCreditAssigned.value = user.credit_assigned || 0;
        }
        
        if (editUserCreditUsed) {
            const creditUsed = parseFloat(user.credit_used || 0).toFixed(2);
            editUserCreditUsed.textContent = `S/. ${creditUsed}`;
            
            // Calcular y mostrar crédito disponible
            const creditAssigned = parseFloat(user.credit_assigned || 0);
            const available = (creditAssigned - parseFloat(creditUsed)).toFixed(2);
            editUserCreditAvailable.textContent = `Disponible: S/. ${available}`;
            
            // Cambiar color según el nivel de uso
            if (parseFloat(creditUsed) > creditAssigned * 0.8) {
                editUserCreditUsed.classList.add('text-red-600');
                editUserCreditUsed.classList.remove('text-gray-900');
            } else {
                editUserCreditUsed.classList.remove('text-red-600');
                editUserCreditUsed.classList.add('text-gray-900');
            }
        }
        
        // Limpiar campo de contraseña
        if (editUserPassword) editUserPassword.value = '';
        
        // Configurar el toggle de visibilidad de contraseña
        const togglePasswordBtn = document.querySelector('.toggle-edit-password');
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', function() {
                const passwordInput = document.getElementById('edit-user-password');
                if (passwordInput) {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    const icon = this.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-eye');
                        icon.classList.toggle('fa-eye-slash');
                    }
                }
            });
        }
        
        // Mostrar el modal
        const modalElement = document.getElementById('editUserModal');
        if (modalElement) {
            // Mostrar el backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
            
            // Mostrar el modal
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            modalElement.setAttribute('aria-modal', 'true');
            modalElement.setAttribute('role', 'dialog');
            
            // Asegurarse de que el body tenga la clase modal-open
            document.body.classList.add('modal-open');
            
            // Asegurarse de que el modal sea desplazable
            modalElement.scrollTop = 0;
            
            // Enfocar el primer campo del formulario
            const firstInput = modalElement.querySelector('input');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                }, 100);
            }
            
            // Agregar evento para cerrar el modal al hacer clic fuera del contenido
            modalElement.addEventListener('click', function(event) {
                if (event.target === modalElement) {
                    closeEditModal();
                }
            });
        }
        
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        showError('Error al cargar el usuario: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Actualizar usuario
async function updateUser() {
    try {
        showLoading(true);
        
        if (!currentUser) {
            showError('No se pudo verificar la autenticación');
            return;
        }
        
        // Obtener valores del formulario
        const editUserId = document.getElementById('edit-user-id');
        const editUserName = document.getElementById('edit-user-name');
        const editUserLastname = document.getElementById('edit-user-lastname');
        const editUserEmail = document.getElementById('edit-user-email');
        const editUserPhone = document.getElementById('edit-user-phone');
        const editUserPassword = document.getElementById('edit-user-password');
        
        // Validar que todos los campos requeridos existan
        if (!editUserId || !editUserName || !editUserEmail) {
            showError('Error: No se pudieron obtener los datos del formulario');
            return;
        }
        
        // Obtener valores
        const userId = editUserId.value;
        const name = `${editUserName.value.trim()} ${editUserLastname ? editUserLastname.value.trim() : ''}`.trim();
        const email = editUserEmail.value.trim();
        const phone = editUserPhone ? editUserPhone.value.trim() : '';
        const newPassword = editUserPassword ? editUserPassword.value.trim() : '';
        const creditAssigned = parseFloat(document.getElementById('edit-user-credit-assigned').value) || 0;
        
        // Validar email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Por favor ingrese un correo electrónico válido');
            return;
        }
        
        // Validar nombre
        if (name.length < 2) {
            showError('El nombre debe tener al menos 2 caracteres');
            return;
        }
        
        // Validar contraseña si se proporcionó una nueva
        if (newPassword && newPassword.length > 0) {
            if (newPassword.length < 8) {
                showError('La contraseña debe tener al menos 8 caracteres');
                return;
            }
        }
        
        // Primero, obtener el usuario actual para asegurarnos de mantener los campos requeridos
        console.log('Obteniendo datos actuales del usuario...');
        const { data: currentUserData, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (fetchError) {
            console.error('Error al obtener datos del usuario:', fetchError);
            throw fetchError;
        }
        
        console.log('Datos actuales del usuario:', currentUserData);
        
        // Actualizar solo los campos permitidos
        const updates = {
            name: name,
            email: email,
            phone: phone || null,
            credit_assigned: creditAssigned,
            status: 'Activo', // Usar 'Activo' con A mayúscula
            updated_at: new Date().toISOString()
        };
        
        // Mantener campos requeridos
        if (currentUserData) {
            // Mantener el store_id si existe
            if (currentUserData.store_id) {
                updates.store_id = currentUserData.store_id;
            }
            
            // Mantener el rol si existe
            if (currentUserData.role) {
                updates.role = currentUserData.role;
            }
            
            // Mantener el estado actual si existe
            if (currentUserData.status) {
                updates.status = currentUserData.status;
            }
        }
        
        console.log('Datos a actualizar:', updates);
        
        try {
            // 1. Actualizar solo el perfil en la tabla profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);
                
            if (profileError) throw profileError;
            
            // 2. Si se proporcionó una nueva contraseña, intentar actualizarla
            // Nota: Esto podría fallar por permisos, así que lo manejamos por separado
            if (newPassword && newPassword.length >= 8) {
                try {
                    const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
                        password: newPassword
                    });
                    
                    if (passwordError) {
                        console.warn('No se pudo actualizar la contraseña (puede ser por permisos):', passwordError);
                        // Continuamos aunque falle la actualización de la contraseña
                    }
                } catch (authError) {
                    console.warn('Error al actualizar contraseña (puede ser por permisos):', authError);
                    // Continuamos aunque falle la actualización de la contraseña
                }
            }
            
            // Cerrar el modal
            closeEditModal();
            
            // Mostrar mensaje de éxito
            showSuccess('Usuario actualizado correctamente');
            
        } catch (error) {
            console.error('Error al actualizar el perfil:', error);
            throw error;
        }
        
        // Recargar la lista de usuarios
        await loadUsers();
        
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        showError('Error al actualizar el usuario: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Eliminar usuario
async function deleteUser(userId) {
    try {
        if (!confirm('¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }
        
        showLoading(true);
        
        if (!currentUser) {
            showError('No se pudo verificar la autenticación');
            return;
        }
        
        // 1. Eliminar el perfil de la base de datos
        const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
            
        if (deleteError) throw deleteError;
        
        // 2. Desactivar el usuario en Auth (no lo eliminamos para evitar problemas con referencias)
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { status: 'deleted' }
        });
        
        if (authError) throw authError;
        
        // Éxito
        showSuccess('Usuario eliminado exitosamente');
        loadUsers();
        
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showError('Error al eliminar el usuario: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Filtrar usuarios
function filterUsers(filter) {
    loadUsers(filter === 'all' ? 'all' : filter);
}

// Buscar usuarios
function searchUsers() {
    const searchTerm = usersSearchInput.value.toLowerCase();
    if (!searchTerm) {
        loadUsers();
        return;
    }
    
    // Implementar búsqueda en el cliente por ahora
    // En producción, sería mejor hacer la búsqueda en el servidor
    const filteredUsers = MOCK_USERS.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.phone && user.phone.includes(searchTerm))
    );
    
    renderUsers(filteredUsers);
}

// Obtener clase CSS para el badge de rol
function getRoleBadgeClass(role) {
    switch(role) {
        case 'admin':
            return 'bg-purple-100 text-purple-800';
        case 'buyer':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Obtener clase CSS para el badge de estado
function getStatusBadgeClass(status) {
    switch(status) {
        case 'active':
            return 'bg-green-100 text-green-800';
        case 'inactive':
            return 'bg-yellow-100 text-yellow-800';
        case 'suspended':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Mostrar loading
function showLoading(show) {
    const loadingElement = document.getElementById('loading-overlay');
    if (loadingElement) {
        if (show) {
            loadingElement.classList.remove('hidden');
            loadingElement.classList.add('flex');
        } else {
            loadingElement.classList.remove('flex');
            loadingElement.classList.add('hidden');
        }
    }
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    showToast(message, 'success');
}

// Mostrar mensaje de error
function showError(message) {
    showToast(message, 'error');
}

// Mostrar notificación toast
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    const types = {
        success: { bg: 'bg-green-500', icon: 'fa-check-circle' },
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const toastType = types[type] || types.info;
    const icon = typeof toastType === 'object' ? toastType.icon : 'fa-info-circle';
    const bgColor = typeof toastType === 'object' ? toastType.bg : toastType;
    
    toast.className = `mb-2 p-4 rounded-lg text-white ${bgColor} flex items-center justify-between shadow-lg`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-2"></i>
            <span>${message}</span>
        </div>
        <button type="button" class="ml-4 text-white opacity-75 hover:opacity-100" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Eliminar el toast después de 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 5000);
}



// Filtrar usuarios
function filterUsers(filter) {
    loadUsers(filter);
}

// Buscar usuarios
function searchUsers() {
    const searchTerm = usersSearchInput.value.toLowerCase();
    // Implementar búsqueda en el cliente
}

// Utilidades
function getRoleBadgeClass(role) {
    const roleColors = {
        'administrador': 'bg-primary',
        'cliente': 'bg-info'
    };
    return roleColors[role] || 'bg-secondary';
}

function getStatusBadgeClass(status) {
    const statusColors = {
        'activo': 'bg-success',
        'inactivo': 'bg-danger'
    };
    return statusColors[status] || 'bg-secondary';
}

// Mensajes temporales
function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'danger');
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed bottom-0 end-0 m-3`;
    toast.style.zIndex = '1000';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Funciones para manejar el modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Si es el modal de nuevo usuario, cargar las tiendas
        if (modalId === 'newUserModal') {
            console.log('Abriendo modal de nuevo usuario, cargando tiendas...');
            loadStores(document.getElementById('user-store')).catch(error => {
                console.error('Error al cargar tiendas al abrir el modal:', error);
                showError('No se pudieron cargar las tiendas. Por favor, inténtalo de nuevo.');
            });
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

// Cerrar modal al hacer clic fuera del contenido
document.addEventListener('click', (e) => {
    if (e.target.id === 'newUserModal' || e.target.id === 'modalBackdrop') {
        closeModal('newUserModal');
    }
});

// Cerrar con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal('newUserModal');
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadStores();
    loadUsers();
    usersSearchInput?.addEventListener('input', searchUsers);
});