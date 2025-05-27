// Importar funciones de autenticación
import { checkAuthAndRole, supabase } from './auth.js';

// Estado de la aplicación
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let currentFilter = 'all';
let storeId = '';
let searchQuery = '';
let payments = [];

// Elementos del DOM
let paymentsTableBody, loading, searchInput, statusFilter, dateFilter, filterButton;
let prevPageBtn, nextPageBtn, totalPagesSpan, paymentsCountSpan;

// Asegurarse de que el contenedor de pagos exista
function ensurePaymentsContainer() {
    let container = document.getElementById('payments-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'payments-container';
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.appendChild(container);
        }
    }
    return container;
}

// Verificar y configurar el bucket de Supabase Storage
async function setupStorageBucket() {
    try {
        // Primero, verifiquemos si el servicio de almacenamiento está disponible
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        // Si hay un error al listar los buckets, probablemente sea un problema de permisos
        if (listError) {
            console.warn('No se pudo listar los buckets de almacenamiento. Verifica los permisos de la clave de servicio.');
            console.warn('Asegúrate de que la política RLS esté configurada correctamente en la consola de Supabase.');
            return false;
        }
        
        const bucketName = 'payment_method_qrs';
        const bucketExists = buckets.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
            console.log('El bucket no existe, intentando crearlo...');
            
            try {
                // Intentar crear el bucket
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true,
                    allowedMimeTypes: ['image/*'],
                    fileSizeLimit: 5 * 1024 * 1024, // 5MB
                });
                
                if (createError) {
                    if (createError.message.includes('already exists')) {
                        console.log('El bucket ya existe, continuando...');
                        return true;
                    }
                    throw createError;
                }
                
                console.log('Bucket creado exitosamente');
                
                // Configurar políticas de acceso
                try {
                    // Crear una política de acceso público para el bucket
                    const { error: policyError } = await supabase.storage
                        .from(bucketName)
                        .createSignedUrl('*', 60); // URL válida por 60 segundos para pruebas
                        
                    if (policyError) {
                        console.warn('No se pudo configurar la política de acceso:', policyError);
                    }
                } catch (policyError) {
                    console.warn('Error al configurar políticas de acceso:', policyError);
                }
                
                return true;
                
            } catch (createError) {
                console.error('Error al crear el bucket:', createError);
                console.warn('Por favor, crea manualmente el bucket en la consola de Supabase:');
                console.warn('1. Ve a la sección Storage de Supabase');
                console.warn(`2. Crea un nuevo bucket llamado "${bucketName}"`);
                console.warn('3. Configura las políticas de acceso según sea necesario');
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Error inesperado al configurar el almacenamiento:', error);
        return false;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, iniciando inicialización...');
    
    // Asegurarse de que el contenedor de pagos exista
    console.log('Asegurando contenedor de pagos...');
    ensurePaymentsContainer();
    
    // Configurar el almacenamiento
    console.log('Configurando almacenamiento...');
    await setupStorageBucket();
    
    try {
        // Inicializar elementos del DOM
        initElements();
        
        // Mostrar carga
        showLoading(true);
        
        // Verificar autenticación
        const { isAuthenticated, user } = await checkAuthAndRole('admin');
        if (!isAuthenticated) return;
        
        // Verificar permisos de la tabla payments
        const hasPermissions = await checkPaymentsPermissions();
        if (!hasPermissions) {
            showLoading(false);
            return;
        }
        
        // Activar la pestaña de pagos por defecto
        switchTab('payments');
        
        // Obtener el store_id del usuario
        storeId = await getUserStoreId();
        if (!storeId) {
            showLoading(false);
            return;
        }
        
        // Cargar pagos
        await loadPayments();
        
        // Inicializar tooltips
        initializeTooltips();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Error al inicializar la aplicación: ' + (error.message || 'Error desconocido'));
    } finally {
        // Asegurarse de ocultar el indicador de carga
        showLoading(false);
    }
});

// Inicializar elementos del DOM
function initElements() {
    console.log('Inicializando elementos del DOM...');
    
    // Elementos de la pestaña de pagos
    paymentsTableBody = document.getElementById('payments-table-body');
    loading = document.getElementById('loading');
    searchInput = document.getElementById('search-payments');
    statusFilter = document.getElementById('status-filter');
    dateFilter = document.getElementById('date-filter');
    filterButton = document.getElementById('filter-button');
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    totalPagesSpan = document.getElementById('total-pages');
    paymentsCountSpan = document.getElementById('payments-count');
    
    console.log('Elementos de pagos:', {
        paymentsTableBody: !!paymentsTableBody,
        loading: !!loading,
        searchInput: !!searchInput,
        statusFilter: !!statusFilter,
        dateFilter: !!dateFilter,
        filterButton: !!filterButton,
        prevPageBtn: !!prevPageBtn,
        nextPageBtn: !!nextPageBtn,
        totalPagesSpan: !!totalPagesSpan,
        paymentsCountSpan: !!paymentsCountSpan
    });
    
    // Elementos de la pestaña de métodos de pago
    const addMethodButton = document.getElementById('add-method-button');
    const paymentMethodsTab = document.getElementById('payment-methods-tab');
    
    // Configurar eventos de la pestaña de pagos
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchQuery = e.target.value;
                currentPage = 1;
                loadPayments();
            }
        });
    }
    
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            searchQuery = searchInput ? searchInput.value : '';
            currentFilter = statusFilter ? statusFilter.value : 'all';
            currentPage = 1;
            loadPayments();
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadPayments();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                loadPayments();
            }
        });
    }
    
    // Configurar evento para el botón de agregar método de pago
    if (addMethodButton) {
        addMethodButton.addEventListener('click', (e) => {
            e.preventDefault();
            agregarMetodoPago();
        });
    }
    
    // Manejar cambio de pestañas
    if (paymentMethodsTab) {
        paymentMethodsTab.addEventListener('click', async () => {
            // Cargar métodos de pago cuando se hace clic en la pestaña
            await renderPaymentMethods();
        });
    }
    
    // Inicializar tooltips
    initializeTooltips();
}

// Función para verificar los permisos de la tabla payments
async function checkPaymentsPermissions() {
    try {
        console.log('Verificando permisos de la tabla payments...');
        
        // Intentar hacer una consulta simple a la tabla payments
        const { data, error } = await supabase
            .from('payments')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('Error de permisos en la tabla payments:', error);
            throw error;
        }
        
        console.log('Permisos de la tabla payments verificados correctamente');
        return true;
    } catch (error) {
        console.error('Error al verificar permisos de la tabla payments:', error);
        showError('No tienes permisos para acceder a los pagos. Por favor, contacta al administrador.', {
            title: 'Error de permisos'
        });
        return false;
    }
}

// Función para obtener el store_id del usuario
async function getUserStoreId() {
    try {
        console.log('Obteniendo información del usuario...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Error al obtener el usuario:', error);
            throw error;
        }
        
        console.log('Usuario obtenido:', user);
        
        if (!user) {
            console.log('No hay usuario autenticado, redirigiendo a login...');
            window.location.href = 'login.html';
            return null;
        }
        
        console.log('Obteniendo perfil del usuario...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, store_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error al obtener el perfil:', profileError);
            throw profileError;
        }
        
        console.log('Perfil obtenido:', profile);
        
        if (!profile || !profile.store_id) {
            const errorMsg = 'Usuario no está asociado a ninguna tienda';
            console.error(errorMsg, { profile });
            showError(errorMsg);
            return null;
        }
        
        return profile.store_id;
    } catch (error) {
        console.error('Error al obtener el store_id:', error);
        showError('Error al cargar la información de la tienda');
        return null;
    }
}

// Datos quemados de pagos
const MOCK_PAYMENTS = [
  {
    "id": "c2bc3329-6d08-4c96-80a7-d32e708ed056",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 05:17:17.287647+00",
    "amount": "3234.00",
    "payment_method": "Nequi",
    "reference_id": "43223",
    "status": "Completado",
    "notes": "dfsdc",
    "created_at": "2025-05-23 05:17:17.287647+00",
    "updated_at": "2025-05-23 05:17:17.287647+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 1",
      "email": "cliente1@ejemplo.com"
    }
  },
  {
    "id": "5fab241e-9ed0-40fb-961d-ec1f1c1a4f67",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 05:24:47.110953+00",
    "amount": "324.00",
    "payment_method": "Nequi",
    "reference_id": "234",
    "status": "Completado",
    "notes": "sfs",
    "created_at": "2025-05-23 05:24:47.110953+00",
    "updated_at": "2025-05-23 05:24:47.110953+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 2",
      "email": "cliente2@ejemplo.com"
    }
  },
  {
    "id": "2cb6b3f6-6d65-4569-bd33-8fe0ecacc0fb",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 05:24:47.112858+00",
    "amount": "324.00",
    "payment_method": "Nequi",
    "reference_id": "234",
    "status": "Pendiente",
    "notes": "sfs",
    "created_at": "2025-05-23 05:24:47.112858+00",
    "updated_at": "2025-05-23 05:24:47.112858+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 3",
      "email": "cliente3@ejemplo.com"
    }
  },
  {
    "id": "f526c2ac-4fed-41a3-9307-d64e7233f442",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 06:19:20.60705+00",
    "amount": "24.00",
    "payment_method": "Daviplata",
    "reference_id": "345",
    "status": "Rechazado",
    "notes": "sad",
    "created_at": "2025-05-23 06:19:20.60705+00",
    "updated_at": "2025-05-23 06:19:20.60705+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 4",
      "email": "cliente4@ejemplo.com"
    }
  },
  {
    "id": "584182f9-4a0b-4808-b145-54002646bea1",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 06:19:20.617832+00",
    "amount": "24.00",
    "payment_method": "Bancolombia",
    "reference_id": "345",
    "status": "Completado",
    "notes": "sad",
    "created_at": "2025-05-23 06:19:20.617832+00",
    "updated_at": "2025-05-23 06:19:20.617832+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 5",
      "email": "cliente5@ejemplo.com"
    }
  },
  {
    "id": "5aa9f602-934a-4338-bfe6-a35c50d81766",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 07:03:44.897726+00",
    "amount": "342.00",
    "payment_method": "Efectivo",
    "reference_id": "324",
    "status": "Completado",
    "notes": "fdf",
    "created_at": "2025-05-23 07:03:44.897726+00",
    "updated_at": "2025-05-23 07:03:44.897726+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 6",
      "email": "cliente6@ejemplo.com"
    }
  },
  {
    "id": "df9f9074-c6fc-42fb-b8d7-ffc579924361",
    "order_id": null,
    "buyer_id": "3499a350-e630-4d6b-845d-87b397ecb6f7",
    "store_id": "d4d84508-07a7-4de3-9755-4bc5a2d49d07",
    "payment_date": "2025-05-23 07:03:44.900829+00",
    "amount": "342.00",
    "payment_method": "Tarjeta de crédito",
    "reference_id": "324",
    "status": "Pendiente",
    "notes": "fdf",
    "created_at": "2025-05-23 07:03:44.900829+00",
    "updated_at": "2025-05-23 07:03:44.900829+00",
    "transaction_details": null,
    "buyers": {
      "name": "Cliente de Prueba 7",
      "email": "cliente7@ejemplo.com"
    }
  }
];

// Función para cargar los pagos
async function loadPayments() {
    try {
        console.log('Cargando pagos desde Supabase...');
        showLoading(true, 'Cargando pagos...');
        
        // Obtener el store_id del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuario no autenticado');
        }
        
        console.log('Usuario autenticado:', user.id);
        
        // Obtener el perfil del usuario para verificar el rol
        const { data: perfil, error: perfilError } = await supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single();
            
        if (perfilError || !perfil) {
            throw new Error('No se pudo obtener la información del perfil');
        }
        
        console.log('Perfil del usuario:', perfil);
        
        // Construir la consulta base
        let query = supabase
            .from('payments')
            .select(`
                id,
                order_id,
                buyer_id,
                payment_date,
                amount,
                payment_method,
                status,
                notes,
                reference_id,
                created_at,
                buyer:profiles!buyer_id (name, email, phone)
            `, { count: 'exact' });
            
        // Aplicar filtros según el rol del usuario
        if (perfil.role === 'admin') {
            // Si es admin, obtener todos los pagos de su tienda
            console.log('Filtrando pagos por store_id:', perfil.store_id);
            query = query.eq('store_id', perfil.store_id);
        } else {
            // Si no es admin, solo puede ver sus propios pagos
            console.log('Filtrando pagos por buyer_id:', user.id);
            query = query.eq('buyer_id', user.id);
        }
        
        // Aplicar filtro de estado si está activo
        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }
        
        // Aplicar búsqueda si hay texto de búsqueda
        if (searchQuery) {
            query = query.or(`reference_id.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
        }
        
        // Aplicar paginación
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        
        // Ejecutar la consulta con paginación
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);
            
        if (error) {
            console.error('Error al obtener pagos:', error);
            throw error;
        }
        
        // Actualizar el estado con los datos obtenidos
        payments = data || [];
        totalItems = count || 0;
        
        console.log(`Se encontraron ${totalItems} pagos`, payments);
        
        // Verificar si el contenedor de la tabla está disponible
        if (!paymentsTableBody) {
            paymentsTableBody = document.getElementById('payments-table-body');
            if (!paymentsTableBody) {
                console.error('Error: No se pudo encontrar el elemento payments-table-body');
                return;
            }
        }
        
        // Renderizar los pagos
        renderPayments();
        updatePaginationUI();
        
        // Actualizar el contador de pagos
        if (paymentsCountSpan) {
            paymentsCountSpan.textContent = totalItems;
        }
        
    } catch (error) {
        console.error('Error al cargar pagos:', error);
        showError('Error al cargar los pagos: ' + (error.message || 'Error desconocido'));
        
        // Mostrar datos de prueba en caso de error
        console.log('Cargando datos de prueba debido a un error...');
        payments = MOCK_PAYMENTS;
        totalItems = payments.length;
        renderPayments();
        updatePaginationUI();
    } finally {
        showLoading(false);
    }
}

// Función para cargar los métodos de pago
async function loadPaymentMethods() {
    try {
        console.log('Cargando métodos de pago...');
        showLoading(true, 'Cargando métodos de pago...');
        
        // Obtener los métodos de pago de la tienda actual
        const { data: methods, error } = await supabase
            .from('store_payment_methods')
            .select('*')
            .eq('store_id', storeId)
            .order('name', { ascending: true });
            
        if (error) {
            console.error('Error al cargar métodos de pago:', error);
            showError('Error al cargar los métodos de pago.');
            return [];
        }
        
        console.log('Métodos de pago cargados:', methods);
        return methods || [];
        
    } catch (error) {
        console.error('Error en loadPaymentMethods:', error);
        showError('Error al cargar los métodos de pago.');
        return [];
    } finally {
        showLoading(false);
    }
}

// Función para renderizar la tabla de métodos de pago
async function renderPaymentMethods() {
    const tbody = document.getElementById('payment-methods-table-body');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center">
                    <div class="flex justify-center items-center py-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span class="ml-2">Cargando métodos de pago...</span>
                    </div>
                </td>
            </tr>`;
        
        const methods = await loadPaymentMethods();
        
        if (methods.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No se encontraron métodos de pago.
                    </td>
                </tr>`;
            return;
        }
        
        let html = '';
        methods.forEach(method => {
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                                <i class="${getPaymentMethodIcon(method.payment_type || 'other')} text-blue-600"></i>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${method.name}</div>
                                <div class="text-sm text-gray-500">${formatPaymentMethod(method.payment_type || 'other')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900">${method.description || 'Sin descripción'}</div>
                        <div class="text-sm text-gray-500">${method.instructions || 'Sin instrucciones'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${method.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${method.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="editarMetodoPago('${method.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="toggleMetodoPago('${method.id}', ${!method.is_active})" class="text-${method.is_active ? 'yellow' : 'green'}-600 hover:text-${method.is_active ? 'yellow' : 'green'}-900">
                            <i class="fas fa-${method.is_active ? 'ban' : 'check'}"></i> ${method.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                    </td>
                </tr>`;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error en renderPaymentMethods:', error);
        showError('Error al cargar los métodos de pago.');
    }
}

// Función para mostrar el formulario de edición/creación de método de pago
function mostrarFormularioMetodoPago(method = null) {
    const title = method ? 'Editar Método de Pago' : 'Agregar Método de Pago';
    const isEdit = !!method;
    
    let html = `
        <div class="bg-white p-6 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">${title}</h3>
            <form id="payment-method-form">
                <input type="hidden" id="method-id" value="${method?.id || ''}">
                
                <div class="mb-4">
                    <label for="method-name" class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input type="text" id="method-name" required 
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                           value="${method?.name || ''}" placeholder="Ej: Transferencia Bancaria">
                </div>
                
                <div class="mb-4">
                    <label for="method-type" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                    <select id="method-type" required 
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                        <option value="" disabled ${!method ? 'selected' : ''}>Seleccione un tipo</option>
                        <option value="bank_transfer" ${method?.payment_type === 'bank_transfer' ? 'selected' : ''}>Transferencia Bancaria</option>
                        <option value="cash" ${method?.payment_type === 'cash' ? 'selected' : ''}>Efectivo</option>
                        <option value="credit_card" ${method?.payment_type === 'credit_card' ? 'selected' : ''}>Tarjeta de Crédito</option>
                        <option value="debit_card" ${method?.payment_type === 'debit_card' ? 'selected' : ''}>Tarjeta Débito</option>
                        <option value="nequi" ${method?.payment_type === 'nequi' ? 'selected' : ''}>Nequi</option>
                        <option value="daviplata" ${method?.payment_type === 'daviplata' ? 'selected' : ''}>Daviplata</option>
                        <option value="pse" ${method?.payment_type === 'pse' ? 'selected' : ''}>PSE</option>
                        <option value="other" ${method?.payment_type === 'other' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                
                <div class="mb-4">
                    <label for="method-description" class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea id="method-description" rows="2"
                              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Descripción del método de pago">${method?.description || ''}</textarea>
                </div>
                
                <div class="mb-4">
                    <label for="method-instructions" class="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
                    <textarea id="method-instructions" rows="3"
                              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Instrucciones para realizar el pago">${method?.instructions || ''}</textarea>
                </div>
                
                <div class="mb-4">
                    <label for="method-account-info" class="block text-sm font-medium text-gray-700 mb-1">Información de la Cuenta</label>
                    <textarea id="method-account-info" rows="2"
                              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Número de cuenta, teléfono, etc.">${method?.account_info || ''}</textarea>
                </div>
                
                <div class="mb-4">
                    <label for="method-qr-code" class="block text-sm font-medium text-gray-700 mb-1">Código QR</label>
                    
                    <!-- Mostrar vista previa de la imagen si existe -->
                    <div id="qr-preview-container" class="mb-2 ${method?.qr_code_url ? '' : 'hidden'}">
                        <p class="text-sm text-gray-500 mb-1">Vista previa:</p>
                        <img id="qr-code-preview" src="${method?.qr_code_url || ''}" 
                             class="h-32 w-32 object-contain border border-gray-200 rounded-md p-1">
                    </div>
                    
                    <!-- Input para subir archivo -->
                    <div class="mt-1 flex items-center">
                        <label class="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <span>Seleccionar archivo</span>
                            <input type="file" id="method-qr-code-file" class="sr-only" accept="image/*">
                        </label>
                        <span id="qr-file-name" class="ml-2 text-sm text-gray-500">
                            ${method?.qr_code_url ? 'Imagen seleccionada' : 'Ningún archivo seleccionado'}
                        </span>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">
                        Sube una imagen de tu código QR o escanea un código QR existente.
                    </p>
                    
                    <!-- Input oculto para mantener la URL del QR existente -->
                    <input type="hidden" id="method-qr-code" value="${method?.qr_code_url || ''}">
                </div>
                
                <div class="flex items-center mb-4">
                    <input type="checkbox" id="method-active" ${method?.is_active !== false ? 'checked' : ''}
                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label for="method-active" class="ml-2 block text-sm text-gray-700">
                        Método activo
                    </label>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="Swal.close()" class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Cancelar
                    </button>
                    <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        ${isEdit ? 'Actualizar' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>`;
    
    Swal.fire({
        title: title,
        html: html,
        showConfirmButton: false,
        showCloseButton: true,
        width: '600px'
    });
    
    // Configurar el envío del formulario
    const form = document.getElementById('payment-method-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarMetodoPago(isEdit);
        });
    }
}

// Función para guardar o actualizar un método de pago
async function guardarMetodoPago(isEdit = false) {
    let qrCodeFile = null;
    let qrCodeUrl = '';
    
    try {
        showLoading(true, isEdit ? 'Actualizando método de pago...' : 'Guardando método de pago...');
        
        // Validar solo el campo obligatorio
        const methodName = document.getElementById('method-name').value.trim();
        
        if (!methodName) {
            throw new Error('El nombre del método de pago es obligatorio');
        }
        
        // Obtener valores sin validaciones obligatorias
        const methodType = document.getElementById('method-type').value || '';
        const accountInfo = document.getElementById('method-account-info').value.trim() || '';
        const isActive = document.getElementById('method-active').checked;
        
        // Obtener el archivo de código QR si se seleccionó uno
        const qrFileInput = document.getElementById('method-qr-code-file');
        const qrCodeInput = document.getElementById('method-qr-code');
        
        // Verificar si hay un archivo seleccionado
        if (qrFileInput && qrFileInput.files.length > 0) {
            qrCodeFile = qrFileInput.files[0];
            
            // Validar el tipo de archivo
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validImageTypes.includes(qrCodeFile.type)) {
                throw new Error('El archivo debe ser una imagen (JPEG, PNG, GIF o WebP)');
            }
            
            // Validar el tamaño del archivo (máximo 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (qrCodeFile.size > maxSize) {
                throw new Error('La imagen es demasiado grande. El tamaño máximo permitido es de 5MB.');
            }
            
            // Subir el archivo a Supabase Storage
            qrCodeUrl = await uploadQRCodeToStorage(qrCodeFile, qrCodeFile.name);
            if (!qrCodeUrl) {
                throw new Error('No se pudo subir la imagen del código QR. Por favor, intenta con otro archivo.');
            }
        } else if (qrCodeInput && qrCodeInput.value) {
            // Usar la URL existente si no se seleccionó un nuevo archivo
            qrCodeUrl = qrCodeInput.value;
        } else if (methodType === 'qr_code' && !isEdit) {
            // Solo es obligatorio para nuevos registros con tipo qr_code
            throw new Error('Debes subir una imagen del código QR para este tipo de pago');
        }
        
        // Obtener el store_id del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (!profile || !profile.store_id) {
            throw new Error('No se pudo obtener la tienda del usuario');
        }
        
        // Preparar los datos para guardar
        const methodData = {
            name: methodName,
            method_type: methodType || 'custom',
            is_active: isActive,
            store_id: profile.store_id,
            updated_at: new Date().toISOString(),
            details: {}
        };
        
        // Agregar información de cuenta si existe
        if (accountInfo) {
            methodData.details.account_info = accountInfo;
        }
        
        // Solo actualizar qr_image_url si se subió una nueva imagen
        if (qrCodeUrl) {
            methodData.qr_image_url = qrCodeUrl;
        } else if (!isEdit) {
            // Si es un nuevo registro y no hay imagen, establecerlo como null
            methodData.qr_image_url = null;
        }
        
        let result;
        
        if (isEdit) {
            const methodId = document.getElementById('method-id').value;
            
            // Obtener el método actual para conservar la URL de la imagen si no se sube una nueva
            const { data: currentMethod } = await supabase
                .from('store_payment_methods')
                .select('*')
                .eq('id', methodId)
                .single();
            
            if (!currentMethod) {
                throw new Error('No se encontró el método de pago a actualizar');
            }
            
            // Conservar la URL de la imagen existente si no se sube una nueva
            if (!qrCodeUrl && currentMethod.qr_image_url) {
                methodData.qr_image_url = currentMethod.qr_image_url;
            }
            
            // Conservar los detalles existentes si no se proporcionan nuevos
            if (Object.keys(methodData.details).length === 0 && currentMethod.details) {
                methodData.details = currentMethod.details;
            }
            
            // Actualizar solo los campos que han cambiado
            const updateData = {};
            Object.keys(methodData).forEach(key => {
                if (JSON.stringify(methodData[key]) !== JSON.stringify(currentMethod[key])) {
                    updateData[key] = methodData[key];
                }
            });
            
            // Si no hay cambios, retornar el método actual
            if (Object.keys(updateData).length === 0) {
                result = currentMethod;
            } else {
                // Actualizar solo si hay cambios
                updateData.updated_at = new Date().toISOString();
                const { data, error } = await supabase
                    .from('store_payment_methods')
                    .update(updateData)
                    .eq('id', methodId)
                    .select();
                    
                if (error) throw error;
                result = data[0];
            }
        } else {
            // Crear un nuevo método
            methodData.created_at = new Date().toISOString();
            const { data, error } = await supabase
                .from('store_payment_methods')
                .insert([methodData])
                .select();
                
            if (error) throw error;
            result = data[0];
        }
        
        showSuccess(`Método de pago ${isEdit ? 'actualizado' : 'creado'} correctamente.`);
        Swal.close();
        await renderPaymentMethods();
        
    } catch (error) {
        console.error('Error al guardar el método de pago:', error);
        showError(`Error al ${isEdit ? 'actualizar' : 'crear'} el método de pago: ${error.message || 'Inténtalo de nuevo más tarde.'}`);
    } finally {
        showLoading(false);
    }
}
async function toggleMetodoPago(methodId, activate) {
    try {
        const confirmResult = await Swal.fire({
            title: `${activate ? 'Activar' : 'Desactivar'} método de pago`,
            text: `¿Estás seguro de que deseas ${activate ? 'activar' : 'desactivar'} este método de pago?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${activate ? 'activar' : 'desactivar'}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: activate ? '#10B981' : '#EF4444',
            cancelButtonColor: '#6B7280'
        });
        
        if (!confirmResult.isConfirmed) return;
        
        showLoading(true, `${activate ? 'Activando' : 'Desactivando'} método de pago...`);
        
        const { error } = await supabase
            .from('store_payment_methods')
            .update({ 
                is_active: activate,
                updated_at: new Date().toISOString()
            })
            .eq('id', methodId);
            
        if (error) throw error;
        
        showSuccess(`Método de pago ${activate ? 'activado' : 'desactivado'} correctamente.`);
        await renderPaymentMethods();
        
    } catch (error) {
        console.error('Error al actualizar el estado del método de pago:', error);
        showError(`Error al ${activate ? 'activar' : 'desactivar'} el método de pago.`);
    } finally {
        showLoading(false);
    }
}

// Función para editar un método de pago (se llama desde el HTML)
async function editarMetodoPago(methodId) {
    try {
        showLoading(true, 'Cargando datos del método de pago...');
        
        // Obtener los datos del método de pago
        const { data: method, error } = await supabase
            .from('store_payment_methods')
            .select('*')
            .eq('id', methodId)
            .single();
            
        if (error) throw error;
        
        if (!method) {
            throw new Error('No se encontró el método de pago');
        }
        
        // Mostrar el formulario con los datos del método
        mostrarFormularioMetodoPago(method);
        
    } catch (error) {
        console.error('Error al cargar el método de pago:', error);
        showError('Error al cargar los datos del método de pago. Por favor, inténtalo de nuevo.');
    } finally {
        showLoading(false);
    }
}

// Función para agregar un nuevo método de pago (se llama desde el botón)
function agregarMetodoPago() {
    mostrarFormularioMetodoPago();
    
    // Configurar el manejador de eventos para el input de archivo después de que se muestre el formulario
    setTimeout(() => {
        const qrFileInput = document.getElementById('method-qr-code-file');
        if (qrFileInput) {
            qrFileInput.addEventListener('change', handleQRCodeUpload);
        }
    }, 100);
}

// Manejar la carga de imágenes de códigos QR
async function handleQRCodeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Mostrar el nombre del archivo
    const fileNameSpan = document.getElementById('qr-file-name');
    if (fileNameSpan) {
        fileNameSpan.textContent = file.name;
    }
    
    // Mostrar vista previa de la imagen
    const previewContainer = document.getElementById('qr-preview-container');
    const previewImg = document.getElementById('qr-code-preview');
    
    if (previewContainer && previewImg) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewContainer.classList.remove('hidden');
            
            // Actualizar el input oculto con la URL de datos temporal
            const qrCodeInput = document.getElementById('method-qr-code');
            if (qrCodeInput) {
                qrCodeInput.value = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

// Función para subir la imagen a Supabase Storage
async function uploadQRCodeToStorage(file, fileName) {
    // Validar el tipo de archivo
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
        showError('Por favor, sube un archivo de imagen válido (JPEG, PNG, GIF o WebP).');
        return null;
    }
    
    // Validar el tamaño del archivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showError('La imagen es demasiado grande. El tamaño máximo permitido es de 5MB.');
        return null;
    }
    
    try {
        showLoading(true, 'Subiendo imagen del código QR...');
        
        // Obtener el ID del usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('Debes iniciar sesión para subir archivos');
        }

        // Obtener el store_id del perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('No se pudo obtener la información de la tienda');
        }

        const storeId = profile.store_id;
        if (!storeId) {
            throw new Error('No tienes una tienda asignada');
        }
        
        // Generar un nombre de archivo único
        const fileExt = fileName.split('.').pop().toLowerCase();
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        
        // Estructura de carpetas: store_id/filename
        const filePath = `${storeId}/qr_codes/${timestamp}_${randomString}.${fileExt}`;
        
        console.log('Subiendo archivo a:', filePath);
        
        // Opciones de carga
        const uploadOptions = {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
            // Incluir metadatos para RLS
            metadata: {
                owner: user.id,
                uploadedBy: user.email,
                store_id: storeId
            }
        };
        
        // Subir el archivo a Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('payment_method_qrs')
            .upload(filePath, file, uploadOptions);
            
        if (uploadError) {
            console.error('Error al subir el archivo:', uploadError);
            
            // Si el error es porque el archivo ya existe, intentar con un nombre diferente
            if (uploadError.message.includes('already exists')) {
                console.log('El archivo ya existe, intentando con un nombre diferente...');
                return uploadQRCodeToStorage(file, `${timestamp}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`);
            }
            
            // Si el error es de permisos, mostrar instrucciones
            if (uploadError.message.includes('row-level security policy') || 
                uploadError.message.includes('403') || 
                uploadError.message.includes('Unauthorized')) {
                throw new Error('No tienes permisos para subir archivos a esta ubicación');
            }
            
            throw uploadError;
        }
        
        // Obtener la URL pública del archivo
        const { data: { publicUrl } } = supabase.storage
            .from('payment_method_qrs')
            .getPublicUrl(filePath);
            
        console.log('Archivo subido correctamente. URL:', publicUrl);
        
        // Verificar que la URL sea accesible
        try {
            const response = await fetch(publicUrl, { method: 'HEAD' });
            if (!response.ok) {
                console.warn('Advertencia: No se pudo verificar la accesibilidad de la URL:', response.status);
            }
        } catch (verifyError) {
            console.warn('No se pudo verificar la URL del archivo:', verifyError);
        }
        
        return publicUrl;
        
    } catch (error) {
        console.error('Error al subir la imagen:', error);
        
        if (error.message.includes('row-level security policy')) {
            showError(`
                Error de permisos. Por favor, configura las políticas de seguridad (RLS) en Supabase Storage:
                
                1. Ve a la consola de Supabase
                2. Navega a Storage > Policies
                3. Selecciona el bucket 'payment_method_qrs'
                4. Crea las siguientes políticas:
                   - Permitir lectura pública
                   - Permitir subida a usuarios autenticados
                   - Permitir gestión a los propietarios
            `);
        } else if (error.message.includes('Bucket not found')) {
            showError('El bucket de almacenamiento no existe. Por favor, crea el bucket manualmente en la consola de Supabase.');
        } else if (error.message.includes('invalid file type')) {
            showError('Tipo de archivo no válido. Por favor, sube una imagen (JPEG, PNG, GIF o WebP).');
        } else {
            showError(`Error al subir la imagen: ${error.message || 'Por favor, inténtalo de nuevo.'}`);
        }
        
        return null;
    } finally {
        showLoading(false);
    }
}

// Función para cambiar entre pestañas
function switchTab(tabId) {
    console.log(`Cambiando a la pestaña: ${tabId}`);
    
    // Ocultar todos los paneles
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    // Desactivar todas las pestañas
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    
    // Mostrar el panel seleccionado
    const panel = document.getElementById(`${tabId}-content`);
    if (panel) {
        panel.classList.remove('hidden');
    }
    
    // Activar la pestaña seleccionada
    const tabButton = document.getElementById(`${tabId}-tab`);
    if (tabButton) {
        tabButton.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        tabButton.classList.add('active', 'border-blue-500', 'text-blue-600');
    }
    
    // Cargar el contenido correspondiente a la pestaña seleccionada
    switch(tabId) {
        case 'payments':
            console.log('Cargando pagos...');
            loadPayments();
            break;
            
        case 'payment-methods':
            console.log('Cargando métodos de pago...');
            renderPaymentMethods();
            break;
    }
}

// Función para actualizar el estado de un pago
async function actualizarEstadoPago(paymentId, nuevoEstado) {
    try {
        showLoading(true, 'Actualizando estado del pago...');
        
        // Obtener el pago actual para verificar si necesitamos ajustar créditos
        const { data: pagoActual, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();
            
        if (fetchError) throw fetchError;
        
        // Si el pago se está marcando como Completado, restar del crédito
        if (nuevoEstado === 'Completado' && pagoActual.status !== 'Completado' && pagoActual.buyer_id) {
            await updateBuyerCredit(pagoActual.buyer_id, pagoActual.amount, 'decrement');
        }
        
        // Si el pago estaba Completado y se cambia a otro estado, revertir el crédito
        if (pagoActual.status === 'Completado' && nuevoEstado !== 'Completado' && pagoActual.buyer_id) {
            await updateBuyerCredit(pagoActual.buyer_id, pagoActual.amount, 'increment');
        }
        
        // Actualizar solo el estado del pago (usando la columna status que sí existe)
        const { error: updateError } = await supabase
            .from('payments')
            .update({ 
                status: nuevoEstado,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);
            
        if (updateError) throw updateError;
        
        // Si el pago se marca como Reembolsado, deshabilitar el select
        if (nuevoEstado === 'Reembolsado') {
            const selectElement = document.querySelector(`select[onchange*="${paymentId}"]`);
            if (selectElement) {
                selectElement.disabled = true;
            }
        }
        
        showSuccess(`Estado del pago actualizado a: ${nuevoEstado}`);
        
        // Recargar los pagos para reflejar los cambios
        await loadPayments();
        
    } catch (error) {
        console.error('Error al actualizar el estado del pago:', error);
        showError('No se pudo actualizar el estado del pago: ' + (error.message || 'Error desconocido'));
        
        // Recargar los pagos para restaurar el estado anterior
        await loadPayments();
    } finally {
        showLoading(false);
    }
}

// Función placeholder para procesar reembolso (sin implementar aún)
async function procesarReembolso(paymentId) {
    // Mostrar confirmación antes de procesar el reembolso
    const result = await Swal.fire({
        title: '¿Procesar reembolso?',
        text: 'Esta acción marcará el pago como reembolsado y no se podrá deshacer. ¿Deseas continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, reembolsar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8b5cf6',
        cancelButtonColor: '#6b7280',
    });
    
    if (!result.isConfirmed) return;
    
    try {
        showLoading(true, 'Procesando reembolso...');
        
        // Actualizar el estado del pago a Reembolsado
        await actualizarEstadoPago(paymentId, 'Reembolsado');
        
        // Aquí podrías agregar lógica adicional para el proceso de reembolso
        // como enviar notificaciones, registrar en bitácora, etc.
        
        showSuccess('El reembolso se ha procesado correctamente');
        
    } catch (error) {
        console.error('Error al procesar el reembolso:', error);
        showError('No se pudo procesar el reembolso: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Hacer las funciones accesibles globalmente
window.editarMetodoPago = editarMetodoPago;
window.toggleMetodoPago = toggleMetodoPago;
window.agregarMetodoPago = agregarMetodoPago;
window.switchTab = switchTab;
window.actualizarEstadoPago = actualizarEstadoPago;
window.procesarReembolso = procesarReembolso;

// Función para renderizar los pagos en la tabla
function renderPayments() {
    console.log('Iniciando renderPayments...');
    console.log('Estado actual de paymentsTableBody:', paymentsTableBody);
    
    // Asegurarse de que paymentsTableBody existe
    if (!paymentsTableBody) {
        console.error('Error: No se pudo encontrar el elemento payments-table-body');
        paymentsTableBody = document.getElementById('payments-table-body');
        
        if (!paymentsTableBody) {
            console.error('Error crítico: No se puede encontrar el elemento de la tabla de pagos');
            return;
        }
    }
    
    console.log(`Renderizando ${payments.length} pagos...`);
    
    if (payments.length === 0) {
        console.log('No hay pagos para mostrar');
        paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron pagos
                </td>
            </tr>`;
        return;
    }
    
    paymentsTableBody.innerHTML = payments.map(payment => {
        const paymentDate = new Date(payment.payment_date || payment.created_at);
        const formattedDate = paymentDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const formattedTime = paymentDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusClass = getStatusClass(payment.status);
        const buyerName = payment.buyer ? payment.buyer.name : 'Cliente no encontrado';
        const buyerEmail = payment.buyer ? payment.buyer.email : 'N/A';
        const reference = payment.reference_id || payment.id.substring(0, 8);
        const amount = parseFloat(payment.amount || 0).toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #${reference}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${buyerName}</div>
                    <div class="text-sm text-gray-500">${buyerEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="payment-method-icon ${getPaymentMethodClass(payment.payment_method)}">
                            <i class="${getPaymentMethodIcon(payment.payment_method)}"></i>
                        </div>
                        <span class="text-sm text-gray-900">${formatPaymentMethod(payment.payment_method)}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${amount}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${formattedDate}</div>
                    <div class="text-sm text-gray-500">${formattedTime}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${formatStatus(payment.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center justify-between">
                        <!-- Selector de estado -->
                        <div class="relative w-40">
                            <select 
                                onchange="actualizarEstadoPago('${payment.id}', this.value)"
                                class="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                ${payment.status === 'Reembolsado' ? 'disabled' : ''}
                            >
                                <option value="Pendiente" ${payment.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="Completado" ${payment.status === 'Completado' ? 'selected' : ''}>Completado</option>
                                <option value="Fallido" ${payment.status === 'Fallido' ? 'selected' : ''}>Fallido</option>
                                <option value="Reembolsado" ${payment.status === 'Reembolsado' ? 'selected' : ''}>Reembolsado</option>
                            </select>
                        </div>
                        
                        <!-- Botón de ver detalles -->
                        <button onclick="verDetallePago('${payment.id}')" 
                                class="ml-2 p-1.5 text-blue-600 hover:text-blue-900 rounded-full hover:bg-blue-50" 
                                data-tooltip="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        <!-- Botón de reembolso (solo para pagos completados) -->
                        ${payment.status === 'Completado' ? `
                            <button onclick="procesarReembolso('${payment.id}')" 
                                    class="p-1.5 text-purple-600 hover:text-purple-900 rounded-full hover:bg-purple-50" 
                                    data-tooltip="Procesar reembolso">
                                <i class="fas fa-undo-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>`;
    }).join('');
    
    // Inicializar tooltips
    initializeTooltips();
}

// Función para actualizar la UI de paginación
function updatePaginationUI() {
    if (!totalPagesSpan || !prevPageBtn || !nextPageBtn) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    totalPagesSpan.textContent = totalPages;
    
    // Actualizar estado de los botones de navegación
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Actualizar contador de elementos mostrados
    const from = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const to = Math.min(currentPage * itemsPerPage, totalItems);
    
    const counterElement = document.getElementById('showing-items');
    if (counterElement) {
        counterElement.textContent = `Mostrando ${from} a ${to} de ${totalItems} pagos`;
    }
}

// Funciones de utilidad
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'approved': 'Aprobado',
        'rejected': 'Rechazado'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'approved': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
}

function formatPaymentMethod(method) {
    const methodMap = {
        'cash': 'Efectivo',
        'bank_transfer': 'Transferencia Bancaria',
        'credit_card': 'Tarjeta de Crédito',
        'debit_card': 'Tarjeta Débito',
        'nequi': 'Nequi',
        'daviplata': 'Daviplata',
        'pse': 'PSE',
        'other': 'Otro'
    };
    return methodMap[method] || method;
}

function getPaymentMethodIcon(method) {
    const iconMap = {
        'cash': 'fas fa-money-bill-wave',
        'bank_transfer': 'fas fa-university',
        'credit_card': 'far fa-credit-card',
        'debit_card': 'far fa-credit-card',
        'nequi': 'fas fa-mobile-alt',
        'daviplata': 'fas fa-wallet',
        'pse': 'fas fa-exchange-alt',
        'other': 'fas fa-question-circle'
    };
    return iconMap[method] || 'fas fa-question-circle';
}

function getPaymentMethodClass(method) {
    return `bg-${method}-100 text-${method}-600`;
}

function showLoading(show, message = 'Cargando...') {
    // Si se está mostrando el loading, actualizar el mensaje
    if (show) {
        // Si hay un elemento de loading, actualizarlo
        if (loading) {
            loading.classList.remove('hidden');
            loading.innerHTML = `
                <div class="flex justify-center items-center py-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="ml-2">${message}</span>
                </div>`;
        }
        
        // Si hay una tabla de pagos, mostrar el loading en la tabla
        if (paymentsTableBody) {
            paymentsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center">
                        <div class="flex justify-center items-center">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span class="ml-2">${message}</span>
                        </div>
                    </td>
                </tr>`;
        }
    } else {
        // Ocultar el loading
        if (loading) {
            loading.classList.add('hidden');
        }
    }
}

function showError(message, options = {}) {
    const defaultOptions = {
        icon: 'error',
        title: '¡Error!',
        text: message,
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: false
    };
    
    // Si el mensaje es un objeto de error de Supabase, extraer el mensaje
    if (message && typeof message === 'object' && 'message' in message) {
        message = message.message;
    } else if (message && typeof message === 'object') {
        message = JSON.stringify(message, null, 2);
    }
    
    if (typeof Swal === 'function') {
        Swal.fire({
            ...defaultOptions,
            ...options,
            text: message
        });
    } else {
        alert(`Error: ${message}`);
    }
}

function showSuccess(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: message,
            confirmButtonText: 'Aceptar'
        });
    } else {
        alert(`Éxito: ${message}`);
    }
}

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(el => {
        el.setAttribute('title', el.getAttribute('data-tooltip'));
    });
    
    // Inicializar tooltips con la biblioteca que estés usando (si es necesario)
    if (typeof tippy === 'function') {
        tippy('[data-tooltip]', {
            content: (reference) => reference.getAttribute('data-tooltip'),
            placement: 'top',
            animation: 'scale',
            theme: 'light',
        });
    }
}

// Funciones globales para los botones de acción
async function verDetallePago(id) {
    try {
        const payment = payments.find(p => p.id === id);
        if (!payment) throw new Error('Pago no encontrado');
        
        // Formatear la fecha
        const paymentDate = new Date(payment.created_at);
        const formattedDate = paymentDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Obtener el nombre del comprador
        const buyerName = payment.buyers ? payment.buyers.name : 'Cliente no encontrado';
        const buyerEmail = payment.buyers ? payment.buyers.email : 'N/A';
        
        // Mostrar modal con los detalles
        const { value: formValues } = await Swal.fire({
            title: 'Detalles del Pago',
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <h4 class="font-semibold">Información del Pago</h4>
                        <div class="mt-2 space-y-1 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Referencia:</span>
                                <span class="font-medium">${payment.reference || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Monto:</span>
                                <span class="font-medium">$${parseFloat(payment.amount || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Método:</span>
                                <span class="font-medium">${formatPaymentMethod(payment.payment_method)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Estado:</span>
                                <span class="font-medium">${formatStatus(payment.status)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Fecha:</span>
                                <span class="font-medium">${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mt-4">Información del Comprador</h4>
                        <div class="mt-2 space-y-1 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Nombre:</span>
                                <span class="font-medium">${buyerName}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Email:</span>
                                <span class="font-medium">${buyerEmail}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${payment.notes ? `
                    <div>
                        <h4 class="font-semibold mt-4">Notas Adicionales</h4>
                        <p class="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            ${payment.notes}
                        </p>
                    </div>` : ''}
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#3b82f6',
            showCancelButton: false,
            width: '500px',
            customClass: {
                popup: 'text-left',
                confirmButton: 'px-4 py-2 text-sm font-medium rounded-md',
            },
            didOpen: () => {
                // Inicializar tooltips dentro del modal si es necesario
                initializeTooltips();
            }
        });
        
    } catch (error) {
        console.error('Error al mostrar detalles del pago:', error);
        showError('No se pudieron cargar los detalles del pago');
    }
}

async function confirmarPago(id) {
    try {
        const result = await Swal.fire({
            title: '¿Confirmar pago?',
            text: '¿Estás seguro de que deseas marcar este pago como aprobado?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
        });
        
        if (!result.isConfirmed) return;
        
        showLoading(true, 'Aprobando pago...');
        
        // Obtener el ID del usuario que está realizando la acción
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');
        
        // Actualizar el estado del pago a 'Completado'
        const { data: updatedPayment, error: updateError } = await supabase
            .from('payments')
            .update({ 
                status: 'Completado',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*')
            .single();
            
        if (updateError) throw updateError;
        
        if (!updatedPayment) {
            throw new Error('No se pudo obtener la información actualizada del pago');
        }
        
        // Actualizar el crédito del comprador
        if (updatedPayment.buyer_id) {
            await updateBuyerCredit(updatedPayment.buyer_id, updatedPayment.amount, 'decrement');
        }
        
        showSuccess('El pago ha sido aprobado exitosamente');
        await loadPayments();
        
    } catch (error) {
        console.error('Error al aprobar el pago:', error);
        showError('No se pudo aprobar el pago: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

async function rechazarPago(id) {
    try {
        const { value: reason } = await Swal.fire({
            title: 'Motivo del rechazo',
            input: 'textarea',
            inputLabel: 'Por favor, indica el motivo del rechazo',
            inputPlaceholder: 'Ej: La referencia de pago no coincide',
            inputAttributes: {
                'aria-label': 'Escribe el motivo del rechazo aquí',
                'maxlength': '500',
                'rows': 4
            },
            showCancelButton: true,
            confirmButtonText: 'Rechazar pago',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            inputValidator: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Por favor, proporciona un motivo detallado (mínimo 10 caracteres)';
                }
                return null;
            }
        });
        
        if (!reason) return;
        
        showLoading(true, 'Procesando rechazo del pago...');
        
        // Obtener el ID del usuario que está realizando la acción
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');
        
        // Obtener la información actual del pago
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchError) throw fetchError;
        
        // Si el pago ya estaba completado, revertir el crédito
        if (payment.status === 'Completado' && payment.buyer_id) {
            await updateBuyerCredit(payment.buyer_id, payment.amount, 'increment');
        }
        
        // Actualizar el estado del pago a 'Fallido' con el motivo de rechazo
        const { error: updateError } = await supabase
            .from('payments')
            .update({ 
                status: 'Fallido',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
                rejection_reason: reason.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
            
        if (updateError) throw updateError;
        
        showSuccess('El pago ha sido rechazado exitosamente');
        await loadPayments();
        
    } catch (error) {
        console.error('Error al rechazar el pago:', error);
        showError('No se pudo rechazar el pago: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función auxiliar para actualizar el crédito del comprador
async function updateBuyerCredit(buyerId, amount, operation = 'increment') {
    try {
        const amountValue = parseFloat(amount);
        if (isNaN(amountValue) || amountValue <= 0) {
            console.warn('Monto de crédito no válido:', amount);
            return false;
        }
        
        console.log(`Actualizando crédito para el comprador ${buyerId}: ${operation} $${amountValue}`);
        
        // Obtener el perfil actual del comprador directamente de la tabla profiles
        const { data: buyerProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('credit_used, credit_assigned')
            .eq('id', buyerId)
            .single();
            
        if (fetchError || !buyerProfile) {
            console.error('Error al obtener el perfil del comprador:', fetchError);
            throw new Error('No se pudo obtener la información del comprador');
        }
        
        // Calcular el nuevo valor de crédito utilizado
        let newCreditUsed = parseFloat(buyerProfile.credit_used || 0);
        const creditAssigned = parseFloat(buyerProfile.credit_assigned || 0);
        
        console.log(`Crédito actual: Usado: $${newCreditUsed}, Asignado: $${creditAssigned}`);
        
        if (operation === 'increment') {
            newCreditUsed = Math.min(creditAssigned, newCreditUsed + amountValue);
        } else if (operation === 'decrement') {
            newCreditUsed = Math.max(0, newCreditUsed - amountValue);
        } else {
            throw new Error('Operación no válida. Use "increment" o "decrement"');
        }
        
        console.log(`Nuevo crédito usado: $${newCreditUsed}`);
        
        // Actualizar el perfil del comprador directamente en la tabla profiles
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
                credit_used: newCreditUsed,
                updated_at: new Date().toISOString()
            })
            .eq('id', buyerId);
            
        if (updateError) {
            console.error('Error al actualizar el crédito:', updateError);
            throw new Error('No se pudo actualizar el crédito del comprador');
        }
        
        console.log('Crédito actualizado exitosamente');
        return true;
        
    } catch (error) {
        console.error('Error en updateBuyerCredit:', error);
        throw new Error('Error al actualizar el crédito: ' + (error.message || 'Error desconocido'));
    }
}