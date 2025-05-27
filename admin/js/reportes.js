// Estado de la aplicación
console.log('Cargando reportes.js...');

// Constantes para la gestión de créditos
const CREDIT_STATUS = {
    AL_DIA: 'al_dia',
    EN_MORA: 'en_mora',
    SIN_DEUDA: 'sin_deuda'
};

/**
 * Escapa caracteres especiales en un string para prevenir XSS
 * @param {string} unsafe - Cadena de texto a escapar
 * @returns {string} Cadena de texto escapada
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Variables globales para el estado de deudores
let deudoresData = [];
let currentDeudoresPage = 1;
const itemsPerDeudoresPage = 10;

let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let currentFilter = 'all';
let storeId = '';
let searchQuery = '';

// Inicializar elementos del DOM
function initElements() {
    // Elementos de la tabla
    window.ordersTableBody = document.getElementById('orders-table-body');
    
    // Elementos de paginación
    window.loading = document.getElementById('loading');
    window.currentPageInput = document.getElementById('current-page');
    window.totalItemsSpan = document.getElementById('total-items');
    window.showingFromSpan = document.getElementById('showing-from');
    window.showingToSpan = document.getElementById('showing-to');
    window.totalPagesSpan = document.getElementById('total-pages');
    window.prevPageBtn = document.getElementById('prev-page');
    window.nextPageBtn = document.getElementById('next-page');
    
    // Elementos de búsqueda y filtros
    window.searchReportInput = document.getElementById('search-orders');
    window.filterAllBtn = document.getElementById('filter-all');
    
    // Limpiar campos de fecha al cargar el módulo
    window.startDateInput = document.getElementById('start-date');
    window.endDateInput = document.getElementById('end-date');
    
    if (window.startDateInput) window.startDateInput.value = '';
    if (window.endDateInput) window.endDateInput.value = '';
    window.filterPendingBtn = document.getElementById('filter-pending');
    window.filterCompletedBtn = document.getElementById('filter-completed');
    window.filterCancelledBtn = document.getElementById('filter-cancelled');
    window.filterByDateBtn = document.getElementById('filter-by-date');
    window.exportBtn = document.getElementById('export-ventas');
    
    // Elementos del formulario de filtros
    window.reportTypeSelect = document.getElementById('report-type');
    window.startDateInput = document.getElementById('start-date');
    window.endDateInput = document.getElementById('end-date');
    window.filterBtn = document.getElementById('filter-btn');
    
    // Las fechas se mantendrán vacías por defecto
    
    console.log('Elementos del DOM inicializados:', {
        ordersTableBody: !!window.ordersTableBody,
        loading: !!window.loading,
        searchReportInput: !!window.searchReportInput,
        reportTypeSelect: !!window.reportTypeSelect,
        startDateInput: !!window.startDateInput,
        endDateInput: !!window.endDateInput,
        filterBtn: !!window.filterBtn
    });
}

// Configurar manejadores de eventos
function setupEventListeners() {
    try {
        // Evento de búsqueda
        if (window.searchReportInput) {
            window.searchReportInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                currentPage = 1;
                loadReportData();
            });
        }

        // Eventos de paginación
        if (window.prevPageBtn) {
            window.prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadReportData();
                }
            });
        }

        if (window.nextPageBtn) {
            window.nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    loadReportData();
                }
            });
        }

        // Evento para el input de página manual
        if (window.currentPageInput) {
            window.currentPageInput.addEventListener('change', (e) => {
                const newPage = parseInt(e.target.value);
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                
                if (newPage >= 1 && newPage <= totalPages) {
                    currentPage = newPage;
                    loadReportData();
                } else {
                    e.target.value = currentPage; // Revertir al valor anterior
                }
            });
        }

        // Eventos para la versión móvil
        const prevPageMobile = document.getElementById('prev-page-mobile');
        const nextPageMobile = document.getElementById('next-page-mobile');
        
        if (prevPageMobile) {
            prevPageMobile.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadReportData();
                }
            });
        }
        
        if (nextPageMobile) {
            nextPageMobile.addEventListener('click', () => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    loadReportData();
                }
            });
        }

        // Filtros
        if (window.filterAllBtn) {
            window.filterAllBtn.addEventListener('click', () => {
                currentFilter = 'all';
                currentPage = 1;
                updateActiveFilterButton('all');
                loadReportData();
            });
        }
        
        // Manejar el botón de filtrar
        if (window.filterBtn) {
            window.filterBtn.addEventListener('click', applyFilters);
        }
        
        // Manejar cambio en el tipo de reporte
        if (window.reportTypeSelect) {
            window.reportTypeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'hoy-ordenes' || e.target.value === 'hoy-ventas') {
                    const today = new Date().toISOString().split('T')[0];
                    if (window.startDateInput) window.startDateInput.value = today;
                    if (window.endDateInput) window.endDateInput.value = today;
                }
            });
        }
        
        // Botón de exportar
        if (window.exportBtn) {
            window.exportBtn.addEventListener('click', exportReport);
        }
        
        // Paginación
        if (window.prevPageBtn) {
            prevPageBtn.addEventListener('click', () => { 
                if (currentPage > 1) { 
                    currentPage--; 
                    loadReportData(); 
                } 
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => { 
                if (currentPage < Math.ceil(totalItems / itemsPerPage)) { 
                    currentPage++; 
                    loadReportData(); 
                } 
            });
        }
        
        if (currentPageInput) {
            currentPageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const page = parseInt(e.target.value);
                    if (!isNaN(page) && page >= 1 && page <= Math.ceil(totalItems / itemsPerPage)) {
                        currentPage = page;
                        loadReportData();
                    } else {
                        e.target.value = currentPage;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error al configurar los manejadores de eventos:', error);
    }
}

// Función para mostrar/ocultar el indicador de carga
function showLoading(show) {
    if (window.loading) {
        window.loading.style.display = show ? 'flex' : 'none';
    }
}

// Función para mostrar mensajes de error
function showError(message) {
    console.error('Error:', message);
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonText: 'Aceptar'
        });
    } else {
        alert(`Error: ${message}`);
    }
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: message,
            confirmButtonText: 'Aceptar',
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        alert(`Éxito: ${message}`);
    }
}

// Función para obtener el store_id del usuario
async function getUserStoreId() {
    try {
        console.log('Iniciando getUserStoreId...');
        
        // Verificar que supabase esté disponible
        if (!window.supabase) {
            console.error('Error: Supabase no está disponible en window.supabase');
            throw new Error('Supabase no está inicializado');
        }
        
        console.log('Obteniendo usuario actual...');
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError) {
            console.error('Error al obtener el usuario:', userError);
            throw new Error('No se pudo autenticar al usuario');
        }
        
        console.log('Usuario obtenido:', user ? 'Usuario encontrado' : 'Usuario no encontrado');
        
        if (!user) {
            // Redirigir al login si no hay usuario autenticado
            console.log('Redirigiendo a /login.html...');
            window.location.href = '/login.html';
            return null;
        }
        
        console.log('ID de usuario:', user.id);
        
        // Obtener el perfil del usuario
        console.log('Obteniendo perfil del usuario...');
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error al obtener el perfil:', profileError);
            throw new Error('No se pudo cargar la información del perfil');
        }
        
        console.log('Perfil obtenido:', profile);
        
        if (!profile) {
            console.error('Perfil no encontrado para el usuario:', user.id);
            throw new Error('Perfil de usuario no encontrado');
        }
        
        if (!profile.store_id) {
            console.error('El perfil no tiene store_id asociado:', profile);
            throw new Error('Este usuario no está asociado a ninguna tienda');
        }
        
        console.log('Store ID obtenido exitosamente:', profile.store_id);
        return profile.store_id;
    } catch (error) {
        console.error('Error en getUserStoreId:', error);
        showError(error.message || 'Error al obtener la información de la tienda');
        
        // Redirigir al login si hay un error de autenticación
        if (error.message.includes('authentication') || error.message.includes('No hay usuario autenticado')) {
            console.log('Error de autenticación, redirigiendo a /login.html...');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
        
        return null;
    }
}

// Función para cargar los datos del reporte
async function loadReportData() {
    try {
        console.log('Cargando datos del reporte...');
        showLoading(true);
        
        // Obtener el store_id del usuario autenticado
        const storeId = await getUserStoreId();
        if (!storeId) {
            console.error('No se pudo obtener el store_id del usuario');
            showError('No se pudo obtener la tienda del usuario');
            return;
        }
        
        console.log('Store ID obtenido:', storeId);
        
        // Obtener filtros actuales
        const { startDate, endDate, searchTerm, currentFilter, reportType } = getCurrentFilters();
        
        // Actualizar el tipo de reporte actual
        currentReportType = reportType;
        
        // Construir la consulta base para obtener las órdenes con todas las relaciones necesarias
        let query = window.supabase
            .from('orders')
            .select(`
                *,
                buyer:buyer_id (id, name, email, avatar_url),
                order_items (
                    id, 
                    quantity, 
                    product:products (
                        id, 
                        name, 
                        image_url, 
                        sku, 
                        price,
                        category_id,
                        categories (id, name)
                    )
                )
            `, { count: 'exact' })
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        
        // Aplicar filtros según el tipo de reporte
        if (reportType === 'hoy-ordenes' || reportType === 'hoy-ventas') {
            // Para reportes de hoy, usar la fecha actual
            const today = new Date().toISOString().split('T')[0];
            console.log('Filtrando por hoy:', today);
            query = query
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`);
        } else if (startDate && endDate) {
            // Solo aplicar filtro de fechas si ambas fechas están definidas
            console.log('Filtrando por rango de fechas:', { startDate, endDate });
            query = query
                .gte('created_at', `${startDate}T00:00:00`)
                .lte('created_at', `${endDate}T23:59:59`);
        } else {
            console.log('No se aplicó filtro de fechas');
            // No aplicar ningún filtro de fecha
        }
        
        // Aplicar filtro de estado si existe
        if (currentFilter && currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }
        
        // Aplicar filtro de tipo de reporte
        if (reportType === 'ventas' || reportType === 'hoy-ventas') {
            query = query.eq('status', 'completed');
        }
        
        // Aplicar filtro de búsqueda si existe
        if (searchTerm) {
            // Verificar si es un UUID completo
            const isCompleteUUID = searchTerm.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
            
            if (isCompleteUUID) {
                // Si es un UUID completo, buscar por ID exacto
                query = query.eq('id', searchTerm);
            } else if (searchTerm.match(/^[0-9a-fA-F-]+$/)) {
                // Si parece un UUID pero está incompleto, no buscar para evitar errores
                console.log('Búsqueda parcial de UUID no soportada');
                showLoading(false);
                return;
            } else {
                // Buscar en nombre o email del comprador
                const { data: buyers, error: buyerError } = await window.supabase
                    .from('profiles')
                    .select('id')
                    .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
                    
                if (buyerError) throw buyerError;
                
                if (buyers && buyers.length > 0) {
                    const buyerIds = buyers.map(b => b.id);
                    query = query.in('buyer_id', buyerIds);
                } else {
                    // Si no hay coincidencias, mostrar mensaje y salir
                    if (window.ordersTableBody) {
                        window.ordersTableBody.innerHTML = `
                            <tr>
                                <td colspan="8" class="text-center py-4">
                                    No se encontraron reportes que coincidan con la búsqueda.
                                </td>
                            </tr>`;
                    }
                    updatePaginationUI(0, 0);
                    showLoading(false);
                    return;
                }
            }
        }
        
        // Obtener el conteo total
        const { count, error: countError } = await query;
        
        if (countError) {
            console.error('Error al contar los registros:', countError);
            throw countError;
        }
        
        totalItems = count || 0;
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        
        // Asegurar que la página actual sea válida
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (currentPage < 1) {
            currentPage = 1;
        }
        
        // Calcular el rango de elementos a mostrar
        const from = (currentPage - 1) * itemsPerPage;
        const to = Math.min(from + itemsPerPage - 1, totalItems - 1);
        
        console.log(`Obteniendo órdenes ${from} a ${to} de ${totalItems}...`);
        
        // Obtener los datos de la página actual con las relaciones necesarias
        // Primero, obtener las órdenes sin paginación para los gráficos
        const { data: allOrders, error: allOrdersError } = await query
            .order('created_at', { ascending: false });
            
        if (allOrdersError) {
            console.error('Error al obtener todas las órdenes:', allOrdersError);
            throw allOrdersError;
        }
        
        console.log('Todas las órdenes obtenidas:', allOrders);
        
        // Usar las órdenes paginadas para la tabla
        const orders = allOrders.slice(from, to + 1);
        
        console.log('Órdenes paginadas:', { from, to, total: allOrders.length, paginated: orders.length });
        
        console.log('Órdenes obtenidas:', orders);
        
        // Actualizar la interfaz de usuario
        updatePaginationUI(totalItems, totalPages);
        
        // Renderizar los datos en la tabla
        if (window.ordersTableBody) {
            window.ordersTableBody.innerHTML = orders && orders.length > 0 ? orders.map(order => {
                // Calcular el total de la orden
                const orderTotal = order.order_items.reduce((total, item) => {
                    return total + (item.quantity * (item.product?.price || 0));
                }, 0);
                
                // Formatear la fecha
                const orderDate = order.created_at ? new Date(order.created_at) : null;
                const formattedDate = orderDate ? orderDate.toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Fecha no disponible';
                
                return `
                    <tr class="hover:bg-gray-50">
                        <!-- ID -->
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #${order.id.substring(0, 8)}...
                        </td>
                        
                        <!-- Fecha -->
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${formattedDate}
                        </td>
                        
                        <!-- Cliente -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${order.buyer?.name || 'Cliente no encontrado'}</div>
                            <div class="text-sm text-gray-500">${order.buyer?.email || ''}</div>
                        </td>
                        
                        <!-- Productos -->
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-900">
                                ${order.order_items && order.order_items.length > 0 
                                    ? order.order_items.map(item => 
                                        `${item.quantity} x ${item.product?.name || 'Producto desconocido'}`
                                      ).join('<br>') 
                                    : 'Sin productos'}
                            </div>
                            ${order.order_items && order.order_items.length > 3 
                                ? `<div class="text-xs text-gray-500 mt-1">+${order.order_items.length - 3} más</div>` 
                                : ''}
                        </td>
                        
                        <!-- Total -->
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            S/ ${orderTotal.toFixed(2)}
                        </td>
                        
                        <!-- Estado -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}">
                                ${order.status || 'Desconocido'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('') : `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        No se encontraron reportes.
                    </td>
                </tr>`;
        }
        
        // Si hay órdenes, generar gráficos con todos los datos
        if (allOrders && allOrders.length > 0) {
            console.log('Generando gráficos con', allOrders.length, 'órdenes');
            generateCharts(allOrders);
        } else {
            console.warn('No hay datos para generar gráficos');
        }
        
    } catch (error) {
        console.error('Error al cargar los reportes:', error);
        showError('Ocurrió un error al cargar los reportes. Por favor, intente nuevamente.');
    } finally {
        showLoading(false);
    }
}

// Función para aplicar los filtros
function applyFilters() {
    currentPage = 1; // Reiniciar a la primera página
    loadReportData();
}

// Función para obtener los filtros actuales
function getCurrentFilters() {
    const reportTypeSelect = document.getElementById('report-type');
    const reportType = reportTypeSelect ? reportTypeSelect.value : 'ordenes';
    
    // Inicializar fechas vacías por defecto
    let startDate = '';
    let endDate = '';
    
    // Si hay fechas en los inputs, usarlas
    if (window.startDateInput && window.startDateInput.value) {
        startDate = window.startDateInput.value;
    }
    
    if (window.endDateInput && window.endDateInput.value) {
        endDate = window.endDateInput.value;
    }
    
    // Para reportes de "hoy", usar la fecha actual
    // PERO no actualizar los inputs para no afectar la selección del usuario
    if (reportType === 'hoy-ordenes' || reportType === 'hoy-ventas') {
        const today = new Date().toISOString().split('T')[0];
        startDate = today;
        endDate = today;
    }
    
    // Obtener el término de búsqueda
    const searchTerm = window.searchReportInput ? window.searchReportInput.value.trim() : '';
    
    // Obtener el filtro de estado actual
    const currentFilter = window.currentFilter || 'all';
    
    console.log('Filtros actuales:', { startDate, endDate, searchTerm, currentFilter, reportType });
    
    return {
        startDate,
        endDate,
        searchTerm,
        currentFilter,
        reportType
    };
}

// Variable para almacenar el tipo de reporte seleccionado
let currentReportType = 'ordenes';

// Función para aplicar el filtro de tipo de reporte
function applyReportTypeFilter(orders) {
    if (!orders) return [];
    
    const today = new Date().toISOString().split('T')[0];
    
    switch(currentReportType) {
        case 'ventas':
            // Filtrar solo órdenes completadas
            return orders.filter(order => order.status === 'completed');
            
        case 'hoy-ordenes':
            // Filtrar órdenes de hoy
            return orders.filter(order => {
                const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                return orderDate === today;
            });
            
        case 'hoy-ventas':
            // Filtrar ventas completadas de hoy
            return orders.filter(order => {
                const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                return order.status === 'completed' && orderDate === today;
            });
            
        case 'ordenes':
        default:
            // Mostrar todas las órdenes
            return orders;
    }
}

// Función para configurar los eventos de los filtros
function setupFilterEvents() {
    console.log('Configurando eventos de filtros...');
    
    // Configurar evento para el selector de tipo de reporte
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', async (e) => {
            currentReportType = e.target.value;
            
            // Limpiar los campos de fecha cuando se cambia el tipo de reporte
            // Esto evita que se mezclen los filtros
            if (window.startDateInput) window.startDateInput.value = '';
            if (window.endDateInput) window.endDateInput.value = '';
            
            // Aplicar los filtros
            await loadReportData();
        });
    }
    
    // Configurar eventos de los filtros de fecha
    if (window.startDateInput && window.endDateInput) {
        window.startDateInput.addEventListener('change', applyFilters);
        window.endDateInput.addEventListener('change', applyFilters);
    }
    
    // Configurar evento de búsqueda
    if (window.searchReportInput) {
        // Usar un temporizador para evitar múltiples llamadas mientras se escribe
        let searchTimeout;
        
        window.searchReportInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Buscando:', e.target.value);
                loadReportData();
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        });
    }
}

// Hacer que la función esté disponible globalmente
window.initApp = initApp;

// Función para mostrar el modal de rango de fechas
function showDateRangeModal() {
    console.log('Mostrando modal de rango de fechas');
    
    // Verificar si ya existe un modal
    let modal = document.getElementById('date-range-modal');
    
    if (!modal) {
        // Crear el modal si no existe
        modal = document.createElement('div');
        modal.id = 'date-range-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium">Seleccionar Rango de Fechas</h3>
                    <button id="close-date-range-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                        <input type="date" id="modal-start-date" class="w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                        <input type="date" id="modal-end-date" class="w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button id="cancel-date-range" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button id="apply-date-range" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        Aplicar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Configurar eventos del modal
        document.getElementById('close-date-range-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('cancel-date-range').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('apply-date-range').addEventListener('click', () => {
            const startDate = document.getElementById('modal-start-date').value;
            const endDate = document.getElementById('modal-end-date').value;
            
            if (!startDate || !endDate) {
                showError('Por favor, selecciona un rango de fechas válido');
                return;
            }
            
            // Actualizar los campos de fecha en el formulario principal
            if (window.startDateInput) window.startDateInput.value = startDate;
            if (window.endDateInput) window.endDateInput.value = endDate;
            
            // Cerrar el modal
            modal.remove();
            
            // Aplicar los filtros
            applyFilters();
        });
    }
    
    // Mostrar el modal
    modal.style.display = 'flex';
}

// Función para convertir un array de objetos a formato CSV compatible con Excel
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Obtener los encabezados del CSV (las claves del primer objeto)
    const headers = Object.keys(data[0]);
    
    // Función para escapar un valor para CSV
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        
        // Convertir a string
        let str = String(val);
        
        // Si el valor contiene comillas, comas o saltos de línea, rodearlo con comillas
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
            // Escapar comillas dobles duplicándolas
            str = `"${str.replace(/"/g, '""')}"`;
        }
        
        return str;
    };
    
    // Crear las filas del CSV
    const rows = [];
    
    // Agregar encabezados con comillas
    rows.push(headers.map(h => `"${h}"`).join(','));
    
    // Agregar filas de datos
    for (const item of data) {
        const row = [];
        for (const header of headers) {
            row.push(escapeCSV(item[header]));
        }
        rows.push(row.join(','));
    }
    
    // Unir todo con saltos de línea estilo Windows (\r\n)
    return rows.join('\r\n');
}

// Función para descargar un archivo
function downloadFile(content, fileName, contentType) {
    // Agregar BOM (Byte Order Mark) para asegurar la codificación UTF-8 en Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { 
        type: `${contentType};charset=utf-8;`
    });
    
    // Crear un enlace de descarga
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    // Estilos para hacerlo invisible
    a.style.display = 'none';
    
    // Agregar al documento, hacer clic y limpiar
    document.body.appendChild(a);
    a.click();
    
    // Limpiar después de la descarga
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Función para mostrar el modal de opciones de exportación
function showExportOptions() {
    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.id = 'export-options-modal';
    
    // Contenido del modal
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">Exportar Reporte</h3>
                    <button id="close-export-modal" class="text-gray-400 hover:text-gray-500">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer export-option" data-type="orders">
                        <h4 class="font-medium text-gray-900">Órdenes Totales</h4>
                        <p class="text-sm text-gray-500">Exportar todas las órdenes con sus detalles</p>
                    </div>
                    
                    <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer export-option" data-type="top-products">
                        <h4 class="font-medium text-gray-900">Productos más Vendidos</h4>
                        <p class="text-sm text-gray-500">Exportar lista de productos ordenados por cantidad vendida</p>
                    </div>
                    
                    <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer export-option" data-type="sales-by-date">
                        <h4 class="font-medium text-gray-900">Ventas por Fecha</h4>
                        <p class="text-sm text-gray-500">Exportar resumen de ventas agrupadas por fecha</p>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button id="cancel-export" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar el modal al documento
    document.body.appendChild(modal);
    
    // Función para cerrar el modal
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            modal.remove();
        }, 300);
    };
    
    // Cerrar al hacer clic fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Cerrar con el botón de cerrar
    const closeButton = modal.querySelector('#close-export-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    // Cerrar con el botón de cancelar
    const cancelButton = modal.querySelector('#cancel-export');
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }
    
    // Cerrar con la tecla Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Configurar eventos para las opciones de exportación
    document.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', async () => {
            const exportType = option.dataset.type;
            modal.remove();
            
            try {
                showLoading(true);
                
                switch(exportType) {
                    case 'orders':
                        await exportOrders();
                        break;
                    case 'top-products':
                        await exportTopProducts();
                        break;
                    case 'sales-by-date':
                        await exportSalesByDate();
                        break;
                    case 'customers':
                        await exportCustomers();
                        break;
                    case 'custom-dates':
                        showCustomDateRangeExport();
                        break;
                    default:
                        throw new Error('Tipo de exportación no válido');
                }
            } catch (error) {
                console.error('Error al exportar:', error);
                showError(`Error al exportar: ${error.message}`);
            } finally {
                showLoading(false);
            }
        });
    });
}

// Función para exportar órdenes a Excel
async function exportOrders() {
    try {
        showLoading(true, 'Generando reporte...');
        
        const filters = getCurrentFilters();
        const storeId = await getUserStoreId();
        
        if (!storeId) {
            throw new Error('No se pudo obtener el ID de la tienda');
        }
        
        let query = window.supabase
            .from('orders')
            .select(`
                *,
                buyer:buyer_id (id, name, email, phone),
                order_items (
                    id, 
                    quantity, 
                    product:products (
                        id, 
                        name, 
                        sku, 
                        price,
                        categories (name)
                    )
                )
            `)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });
        
        // Aplicar filtros
        if (filters.startDate && filters.endDate) {
            query = query
                .gte('created_at', `${filters.startDate}T00:00:00`)
                .lte('created_at', `${filters.endDate}T23:59:59`);
        }
        
        if (filters.currentFilter && filters.currentFilter !== 'all') {
            query = query.eq('status', filters.currentFilter);
        }
        
        if (filters.reportType === 'ventas' || filters.reportType === 'hoy-ventas') {
            query = query.eq('status', 'completed');
        }
        
        const { data: orders, error } = await query;
        if (error) throw error;
        
        if (!orders || orders.length === 0) {
            throw new Error('No hay órdenes para exportar');
        }
        
        // Formatear los datos para el Excel
        const excelData = orders.map(order => {
            const total = order.order_items
                .reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0);
                
            return {
                'ID': `#${order.id.substring(0, 8)}`,
                'Fecha': order.created_at ? new Date(order.created_at).toLocaleString('es-PE') : 'N/A',
                'Cliente': order.buyer?.name || 'Cliente no encontrado',
                'Email': order.buyer?.email || '',
                'Teléfono': order.buyer?.phone || '',
                'Productos': order.order_items
                    .map(item => `${item.quantity}x ${item.product?.name || 'Producto desconocido'}`)
                    .join('\n'),
                'Total': total.toFixed(2),
                'Moneda': 'S/',
                'Estado': order.status || 'Desconocido',
                'Método de Pago': order.payment_method || 'No especificado',
                'Dirección de Envío': order.shipping_address || 'No especificada'
            };
        });
        
        // Crear un libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Ajustar el ancho de las columnas
        const colWidths = [
            { wch: 10 },  // ID
            { wch: 20 }, // Fecha
            { wch: 25 }, // Cliente
            { wch: 30 }, // Email
            { wch: 15 }, // Teléfono
            { wch: 40 }, // Productos
            { wch: 15 }, // Total
            { wch: 10 }, // Moneda
            { wch: 15 }, // Estado
            { wch: 20 }, // Método de Pago
            { wch: 40 }  // Dirección
        ];
        ws['!cols'] = colWidths;
        
        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');
        
        // Generar el archivo Excel
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `reporte_ordenes_${today}.xlsx`);
        
        showSuccess('Reporte exportado correctamente a Excel');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showError(`Error al exportar: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Función para exportar productos más vendidos
async function exportTopProducts() {
    const storeId = await getUserStoreId();
    if (!storeId) throw new Error('No se pudo obtener el ID de la tienda');
    
    const { data, error } = await window.supabase
        .from('order_items')
        .select(`
            quantity,
            product:products (id, name, sku, price, categories (name))
        `)
        .eq('products.store_id', storeId);
    
    if (error) throw error;
    
    // Agrupar productos por ID y sumar cantidades
    const productsMap = new Map();
    
    data.forEach(item => {
        if (!item.product) return;
        
        const productId = item.product.id;
        if (!productsMap.has(productId)) {
            productsMap.set(productId, {
                id: productId,
                name: item.product.name || 'Producto desconocido',
                sku: item.product.sku || 'N/A',
                price: item.product.price || 0,
                category: item.product.categories?.name || 'Sin categoría',
                quantity: 0,
                total: 0
            });
        }
        
        const product = productsMap.get(productId);
        product.quantity += item.quantity;
        product.total += item.quantity * (item.product.price || 0);
    });
    
    const products = Array.from(productsMap.values())
        .sort((a, b) => b.quantity - a.quantity);
    
    const formattedData = products.map(product => ({
        'Producto': product.name,
        'SKU': product.sku,
        'Categoría': product.category,
        'Cantidad Vendida': product.quantity,
        'Precio Unitario': `S/ ${product.price.toFixed(2)}`,
        'Total Ventas': `S/ ${product.total.toFixed(2)}`
    }));
    
    const csvContent = convertToCSV(formattedData);
    const today = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `productos_mas_vendidos_${today}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Reporte de productos más vendidos exportado correctamente');
}

// Función para exportar ventas por fecha
async function exportSalesByDate() {
    const storeId = await getUserStoreId();
    if (!storeId) throw new Error('No se pudo obtener el ID de la tienda');
    
    const { data: orders, error } = await window.supabase
        .from('orders')
        .select('created_at, order_items (quantity, product:products (price))')
        .eq('store_id', storeId)
        .eq('status', 'completed');
    
    if (error) throw error;
    
    // Agrupar ventas por fecha
    const salesByDate = new Map();
    
    orders.forEach(order => {
        if (!order.created_at) return;
        
        const date = order.created_at.split('T')[0];
        const dailyTotal = order.order_items.reduce((sum, item) => {
            return sum + (item.quantity * (item.product?.price || 0));
        }, 0);
        
        if (salesByDate.has(date)) {
            salesByDate.get(date).total += dailyTotal;
            salesByDate.get(date).orders++;
        } else {
            salesByDate.set(date, {
                date,
                total: dailyTotal,
                orders: 1
            });
        }
    });
    
    const sortedDates = Array.from(salesByDate.values())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const formattedData = sortedDates.map(day => ({
        'Fecha': new Date(day.date).toLocaleDateString('es-PE'),
        'Total Ventas': `S/ ${day.total.toFixed(2)}`,
        'Número de Órdenes': day.orders,
        'Ticket Promedio': `S/ ${(day.total / day.orders).toFixed(2)}`
    }));
    
    const csvContent = convertToCSV(formattedData);
    const today = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `ventas_por_fecha_${today}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Reporte de ventas por fecha exportado correctamente');
}

// Función para exportar clientes y sus compras
async function exportCustomers() {
    const storeId = await getUserStoreId();
    if (!storeId) throw new Error('No se pudo obtener el ID de la tienda');
    
    const { data: customers, error } = await window.supabase
        .from('profiles')
        .select(`
            id,
            name,
            email,
            phone,
            orders:orders (
                id,
                created_at,
                status,
                total
            )
        `)
        .eq('orders.store_id', storeId)
        .order('created_at', { foreignTable: 'orders', ascending: false });
    
    if (error) throw error;
    
    const formattedData = customers.flatMap(customer => {
        if (!customer.orders || customer.orders.length === 0) {
            return [{
                'Nombre': customer.name || 'Cliente sin nombre',
                'Email': customer.email || '',
                'Teléfono': customer.phone || '',
                'Última Compra': 'Sin compras',
                'Total Gastado': 'S/ 0.00',
                'Número de Órdenes': 0
            }];
        }
        
        const totalSpent = customer.orders
            .filter(order => order.status === 'completed')
            .reduce((sum, order) => sum + (order.total || 0), 0);
        
        return [{
            'Nombre': customer.name || 'Cliente sin nombre',
            'Email': customer.email || '',
            'Teléfono': customer.phone || '',
            'Última Compra': customer.orders[0]?.created_at 
                ? new Date(customer.orders[0].created_at).toLocaleString('es-PE') 
                : 'Nunca',
            'Total Gastado': `S/ ${totalSpent.toFixed(2)}`,
            'Número de Órdenes': customer.orders.length
        }];
    });
    
    const csvContent = convertToCSV(formattedData);
    const today = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `clientes_${today}.csv`, 'text/csv;charset=utf-8;');
    showSuccess('Reporte de clientes exportado correctamente');
}

// Función para mostrar el modal de rango de fechas personalizado
function showCustomDateRangeExport() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.id = 'custom-date-export-modal';
    
    const today = new Date().toISOString().split('T')[0];
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">Exportar por Rango de Fechas</h3>
                    <button id="close-custom-date-export" class="text-gray-400 hover:text-gray-500">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                        <input type="date" id="export-start-date" class="w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                        <input type="date" id="export-end-date" class="w-full rounded-md border-gray-300 shadow-sm" value="${today}">
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
                        <select id="export-report-type" class="w-full rounded-md border-gray-300 shadow-sm">
                            <option value="orders">Órdenes</option>
                            <option value="products">Productos Vendidos</option>
                            <option value="customers">Clientes</option>
                        </select>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-end space-x-3">
                    <button id="cancel-custom-export" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button id="confirm-export" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        Exportar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar eventos
    document.getElementById('close-custom-date-export').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('cancel-custom-export').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('confirm-export').addEventListener('click', async () => {
        const startDate = document.getElementById('export-start-date').value;
        const endDate = document.getElementById('export-end-date').value;
        const reportType = document.getElementById('export-report-type').value;
        
        if (!startDate || !endDate) {
            showError('Por favor, selecciona un rango de fechas válido');
            return;
        }
        
        modal.remove();
        
        try {
            showLoading(true);
            
            // Guardar las fechas actuales para restaurarlas después
            const currentStartDate = window.startDateInput ? window.startDateInput.value : '';
            const currentEndDate = window.endDateInput ? window.endDateInput.value : '';
            
            // Establecer las fechas seleccionadas
            if (window.startDateInput) window.startDateInput.value = startDate;
            if (window.endDateInput) window.endDateInput.value = endDate;
            
            // Ejecutar el reporte correspondiente
            switch(reportType) {
                case 'orders':
                    await exportOrders();
                    break;
                case 'products':
                    await exportTopProducts();
                    break;
                case 'customers':
                    await exportCustomers();
                    break;
                default:
                    throw new Error('Tipo de reporte no válido');
            }
            
            // Restaurar las fechas originales
            if (window.startDateInput) window.startDateInput.value = currentStartDate;
            if (window.endDateInput) window.endDateInput.value = currentEndDate;
            
        } catch (error) {
            console.error('Error al exportar con fechas personalizadas:', error);
            showError(`Error al exportar: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });
}

// Función para exportar el reporte (muestra el modal de opciones)
function exportReport() {
    showExportOptions();
}

// Función para actualizar la interfaz de paginación
function updatePaginationUI(totalItems, totalPages) {
    console.log('Actualizando paginación:', { totalItems, totalPages });
    
    // Asegurarse de que los elementos del DOM existen
    if (!window.currentPageInput || !window.totalItemsSpan || !window.showingFromSpan || 
        !window.showingToSpan || !window.totalPagesSpan || !window.prevPageBtn || !window.nextPageBtn) {
        console.warn('No se encontraron todos los elementos de paginación en el DOM');
        return;
    }
    
    // Actualizar los contadores
    const from = ((currentPage - 1) * itemsPerPage) + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);
    
    window.currentPageInput.value = currentPage;
    window.totalItemsSpan.textContent = totalItems;
    window.showingFromSpan.textContent = from;
    window.showingToSpan.textContent = to;
    window.totalPagesSpan.textContent = totalPages;
    
    // Habilitar/deshabilitar botones de navegación
    window.prevPageBtn.disabled = currentPage <= 1;
    window.nextPageBtn.disabled = currentPage >= totalPages;
    
    // Actualizar también los botones de navegación móviles si existen
    const prevPageMobile = document.getElementById('prev-page-mobile');
    const nextPageMobile = document.getElementById('next-page-mobile');
    
    if (prevPageMobile) prevPageMobile.disabled = currentPage <= 1;
    if (nextPageMobile) nextPageMobile.disabled = currentPage >= totalPages;
}

// Función para obtener las clases CSS según el estado de la orden
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'shipped': 'bg-blue-100 text-blue-800',
        'delivered': 'bg-purple-100 text-purple-800',
        'refunded': 'bg-gray-100 text-gray-800',
        'processing': 'bg-indigo-100 text-indigo-800',
        'on-hold': 'bg-orange-100 text-orange-800'
    };
    
    // Convertir a minúsculas para hacer la comparación insensible a mayúsculas/minúsculas
    const statusKey = status ? status.toLowerCase() : 'pending';
    
    // Devolver las clases correspondientes o las clases por defecto si el estado no está definido
    return statusClasses[statusKey] || 'bg-gray-100 text-gray-800';
}

// Función para actualizar el botón de filtro activo
function updateActiveFilterButton(activeFilter) {
    console.log('Actualizando botón de filtro activo:', activeFilter);
    
    // Remover la clase activa de todos los botones de filtro
    const filterButtons = [
        window.filterAllBtn,
        window.filterPendingBtn,
        window.filterCompletedBtn,
        window.filterCancelledBtn
    ];
    
    filterButtons.forEach(button => {
        if (button) {
            button.classList.remove('bg-blue-600', 'text-white');
            button.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        }
    });
    
    // Agregar la clase activa al botón correspondiente
    let activeButton = null;
    switch(activeFilter) {
        case 'all':
            activeButton = window.filterAllBtn;
            break;
        case 'pending':
            activeButton = window.filterPendingBtn;
            break;
        case 'completed':
            activeButton = window.filterCompletedBtn;
            break;
        case 'cancelled':
            activeButton = window.filterCancelledBtn;
            break;
    }
    
    if (activeButton) {
        activeButton.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        activeButton.classList.add('bg-blue-600', 'text-white');
    }
}

// Función para mostrar detalles de una orden
function showOrderDetails(orderId) {
    // Implementar lógica para mostrar los detalles de la orden
    console.log('Mostrar detalles de la orden:', orderId);
    // Aquí podrías abrir un modal con los detalles de la orden
    // o redirigir a una página de detalles
}

// Función para formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
    }).format(amount);
}

// Función para generar gráficos con los datos de las órdenes
function generateCharts(orders) {
    console.log('Generando gráficos...');
    console.log('Número de órdenes recibidas:', orders.length);
    
    // Verificar si Chart.js está cargado
    if (typeof Chart === 'undefined') {
        console.error('Error: Chart.js no está cargado correctamente');
        return;
    }
    
    if (!orders || orders.length === 0) {
        console.error('No se recibieron órdenes para generar gráficos');
        return;
    }
    
    // Calcular métricas básicas
    console.log('Calculando métricas básicas...');
    const totalVentas = orders.reduce((total, order) => {
        const orderTotal = order.order_items?.reduce((orderTotal, item) => {
            return orderTotal + (item.quantity * (item.product?.price || 0));
        }, 0) || 0;
        
        console.log(`Orden ${order.id} - Total: ${orderTotal}`);
        return total + orderTotal;
    }, 0);
    
    console.log('Total de ventas calculado:', totalVentas);
    
    const totalOrdenes = orders.length;
    const totalProductos = orders.reduce((total, order) => {
        return total + (order.order_items?.reduce((count, item) => {
            return count + (item.quantity || 0);
        }, 0) || 0);
    }, 0);
    
    const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
    const productosPorOrden = totalOrdenes > 0 ? totalProductos / totalOrdenes : 0;
    
    // Actualizar métricas en la UI
    if (document.getElementById('total-sales')) {
        document.getElementById('total-sales').textContent = formatCurrency(totalVentas);
    }
    if (document.getElementById('total-orders')) {
        document.getElementById('total-orders').textContent = totalOrdenes;
    }
    if (document.getElementById('total-products')) {
        document.getElementById('total-products').textContent = totalProductos;
    }
    if (document.getElementById('avg-ticket')) {
        document.getElementById('avg-ticket').textContent = formatCurrency(ticketPromedio);
    }
    if (document.getElementById('avg-products-per-order')) {
        document.getElementById('avg-products-per-order').textContent = productosPorOrden.toFixed(1);
    }
    
    // Agrupar órdenes por día para el gráfico de ventas
    console.log('Agrupando órdenes por día...');
    const ventasPorDia = {};
    orders.forEach(order => {
        if (!order.created_at) {
            console.warn('Orden sin fecha de creación:', order.id);
            return;
        }
        
        const fecha = new Date(order.created_at);
        if (isNaN(fecha.getTime())) {
            console.error('Fecha inválida:', order.created_at, 'en orden:', order.id);
            return;
        }
        
        const fechaStr = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        const totalOrden = order.order_items?.reduce((total, item) => {
            const precio = parseFloat(item.product?.price) || 0;
            const cantidad = parseInt(item.quantity) || 0;
            return total + (cantidad * precio);
        }, 0) || 0;
        
        console.log(`Orden ${order.id} - Fecha: ${fechaStr} - Total: ${totalOrden}`);
        
        if (!ventasPorDia[fechaStr]) {
            ventasPorDia[fechaStr] = 0;
        }
        ventasPorDia[fechaStr] += totalOrden;
    });
    
    // Ordenar fechas
    console.log('Ventas por día:', ventasPorDia);
    const fechas = Object.keys(ventasPorDia).sort();
    const ventas = fechas.map(fecha => ventasPorDia[fecha]);
    
    console.log('Fechas ordenadas:', fechas);
    console.log('Ventas por fecha:', ventas);
    
    // Gráfico de ventas por día
    const salesCtx = document.getElementById('sales-chart');
    console.log('Contexto del gráfico de ventas:', salesCtx);
    
    if (salesCtx) {
        console.log('Creando gráfico de ventas por día...');
        console.log('Datos del gráfico:', {
            labels: fechas,
            datasets: [{
                label: 'Ventas por Día',
                data: ventas
            }]
        });
        
        // Destruir gráfico anterior si existe
        if (window.salesChart) {
            console.log('Destruyendo gráfico anterior...');
            window.salesChart.destroy();
        }
        
        try {
            console.log('Intentando crear el gráfico de ventas...');
            window.salesChart = new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: fechas,
                    datasets: [{
                        label: 'Ventas por Día',
                        data: ventas,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Ventas: ' + formatCurrency(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'S/ ' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error al crear el gráfico de ventas:', error);
            return;
        }
    }
    
    try {
        // Gráfico de productos más vendidos
        console.log('Procesando productos más vendidos...');
        const productosVendidos = {};
        
        if (!orders || !Array.isArray(orders)) {
            console.error('Error: orders no es un array o está indefinido');
            return;
        }
        
        orders.forEach((order, orderIndex) => {
            console.log(`Procesando orden ${orderIndex + 1}/${orders.length} - ID: ${order.id}`);
            
            if (!order.order_items || !Array.isArray(order.order_items)) {
                console.warn(`La orden ${order.id} no tiene items o no es un array`);
                return;
            }
            
            order.order_items.forEach((item, itemIndex) => {
                console.log(`  Item ${itemIndex + 1}:`, item);
                const productName = item.product?.name || 'Producto desconocido';
                if (!productosVendidos[productName]) {
                    productosVendidos[productName] = 0;
                }
                productosVendidos[productName] += parseInt(item.quantity) || 0;
            });
        });
        
        // Ordenar productos por cantidad vendida
        console.log('Productos vendidos:', productosVendidos);
        const productosOrdenados = Object.entries(productosVendidos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Tomar solo los 5 más vendidos
            
        console.log('Productos más vendidos:', productosOrdenados);
        
        const topProductsCtx = document.getElementById('top-products-chart');
        console.log('Contexto del gráfico de productos más vendidos:', topProductsCtx);
        
        if (topProductsCtx) {
            console.log('Creando gráfico de productos más vendidos...');
            console.log('Datos del gráfico:', {
                labels: productosOrdenados.map(p => p[0]),
                datasets: [{
                    label: 'Cantidad Vendida',
                    data: productosOrdenados.map(p => p[1])
                }]
            });
            
            // Destruir gráfico anterior si existe
            if (window.topProductsChart) {
                console.log('Destruyendo gráfico anterior de productos...');
                window.topProductsChart.destroy();
            }
            
            window.topProductsChart = new Chart(topProductsCtx, {
                type: 'bar',
                data: {
                    labels: productosOrdenados.map(p => p[0]),
                    datasets: [{
                        label: 'Cantidad Vendida',
                        data: productosOrdenados.map(p => p[1]),
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.7)',
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(239, 68, 68, 0.7)',
                            'rgba(139, 92, 246, 0.7)'
                        ],
                        borderColor: [
                            'rgb(59, 130, 246)',
                            'rgb(16, 185, 129)',
                            'rgb(245, 158, 11)',
                            'rgb(239, 68, 68)',
                            'rgb(139, 92, 246)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return 'Cantidad: ' + context.raw;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // Gráfico de ventas por categoría
        const salesByCategoryCtx = document.getElementById('sales-by-category-chart');
        console.log('Contexto del gráfico de ventas por categoría:', salesByCategoryCtx);
        
        if (salesByCategoryCtx) {
            console.log('Procesando ventas por categoría...');
            
            // Agrupar ventas por categoría
            const ventasPorCategoria = {};
            
            orders.forEach(order => {
                if (!order.order_items) return;
                
                order.order_items.forEach(item => {
                    if (!item.product) return;
                    
                    const categoria = item.product.categories?.name || 'Sin categoría';
                    const cantidad = item.quantity || 0;
                    const precio = parseFloat(item.product.price) || 0;
                    const total = cantidad * precio;
                    
                    if (!ventasPorCategoria[categoria]) {
                        ventasPorCategoria[categoria] = 0;
                    }
                    
                    ventasPorCategoria[categoria] += total;
                });
            });
            
            console.log('Ventas por categoría:', ventasPorCategoria);
            
            // Ordenar categorías por monto de ventas (de mayor a menor)
            const categoriasOrdenadas = Object.entries(ventasPorCategoria)
                .sort((a, b) => b[1] - a[1]);
            
            const labels = categoriasOrdenadas.map(([categoria]) => categoria);
            const data = categoriasOrdenadas.map(([_, total]) => total);
            
            // Colores para las categorías
            const backgroundColors = [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(199, 199, 199, 0.7)'
            ];
            
            // Destruir gráfico anterior si existe
            if (window.salesByCategoryChart) {
                window.salesByCategoryChart.destroy();
            }
            
            // Crear gráfico de dona para ventas por categoría
            window.salesByCategoryChart = new Chart(salesByCategoryCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    } catch (error) {
        console.error('Error al generar el gráfico de productos más vendidos:', error);
    }
    
    // Gráfico de estado de órdenes
    const estados = {};
    orders.forEach(order => {
        const estado = order.status || 'Desconocido';
        estados[estado] = (estados[estado] || 0) + 1;
    });
    
    const statusCtx = document.getElementById('orders-status-chart');
    if (statusCtx) {
        // Destruir gráfico anterior si existe
        if (window.statusChart) {
            window.statusChart.destroy();
        }
        
        window.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estados),
                datasets: [{
                    data: Object.values(estados),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(236, 72, 153, 0.7)',
                        'rgba(139, 92, 246, 0.7)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(236, 72, 153)',
                        'rgb(139, 92, 246)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.raw;
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    console.log('Gráficos generados correctamente');
}

/**
 * Calcula los días de mora desde la fecha de vencimiento
 * @param {string} fechaVencimiento - Fecha de vencimiento en formato ISO
 * @returns {number} - Días de mora
 */
function calcularDiasMora(fechaVencimiento) {
    if (!fechaVencimiento) return 0;
    
    const fechaVenc = new Date(fechaVencimiento);
    const hoy = new Date();
    const diffTime = hoy - fechaVenc;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
}

/**
 * Verifica el estado de un cliente basado en su crédito usado y última fecha de pago
 * @param {Object} cliente - Objeto con los datos del cliente
 * @returns {Object} - Objeto con el estado y días de mora
 */
function verificarEstadoCliente(cliente) {
    try {
        // Si no tiene crédito usado, no está en mora
        if (!cliente.credit_used || parseFloat(cliente.credit_used) <= 0) {
            return { estado: 'al_dia', diasMora: 0 };
        }
        
        // Obtener la fecha del primer día del mes actual
        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        // Si no tiene fecha de creación, usar la fecha actual
        const fechaCreacion = cliente.created_at ? new Date(cliente.created_at) : new Date();
        
        // Calcular días desde el inicio del mes o desde la creación del usuario (lo que sea más reciente)
        const fechaReferencia = fechaCreacion > primerDiaMes ? fechaCreacion : primerDiaMes;
        
        // Calcular días transcurridos desde la fecha de referencia
        const diffTime = Math.abs(hoy - fechaReferencia);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Asegurarse de que diffDays sea al menos 1
        diffDays = Math.max(1, diffDays);
        
        // Si el crédito usado es mayor que 0, está en mora
        if (parseFloat(cliente.credit_used) > 0) {
            return { 
                estado: 'en_mora', 
                diasMora: diffDays,
                mensaje: `El cliente tiene un saldo pendiente de S/ ${parseFloat(cliente.credit_used).toFixed(2)}`
            };
        }
        
        // Si no tiene deuda, está al día
        return { 
            estado: 'al_dia', 
            diasMora: 0,
            mensaje: 'El cliente está al día con sus pagos'
        };
        
    } catch (error) {
        console.error('Error en verificarEstadoCliente:', error);
        // En caso de error, asumir que está al día
        return { 
            estado: 'al_dia', 
            diasMora: 0,
            mensaje: 'No se pudo verificar el estado del cliente'
        };
    }
}

/**
 * Carga los datos de los deudores desde la base de datos
 */
async function loadDeudoresData() {
    try {
        showLoading(true, 'Cargando datos de deudores...');
        
        // Obtener el ID de la tienda del usuario actual
        const storeId = await getUserStoreId();
        if (!storeId) {
            showError('No se pudo obtener la tienda del usuario');
            return;
        }
        
        // Obtener el usuario actual para verificar permisos
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('Error al obtener el usuario actual:', userError);
            window.location.href = 'login.html';
            return;
        }
        
        // Obtener el perfil del usuario actual
        const { data: currentUserProfile, error: profileError } = await supabase
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
            showError('No tienes permisos para ver los deudores');
            return;
        }
        
        // Obtener los perfiles de clientes con crédito
        const { data: perfiles, error } = await supabase
            .from('profiles')
            .select(`
                id,
                name,
                email,
                phone,
                credit_assigned,
                credit_used,
                status,
                created_at,
                last_sign_in_at
            `)
            .eq('store_id', storeId)
            .eq('role', 'buyer')  // Solo clientes
            .gt('credit_used', 0)  // Solo los que tengan deuda
            .order('credit_used', { ascending: false });
            
        if (error) {
            console.error('Error al cargar los deudores:', error);
            throw error;
        }
        
        console.log('Perfiles de deudores cargados:', perfiles);
        
        // Procesar los datos de los deudores
        deudoresData = perfiles.map(cliente => {
            const { estado, diasMora } = verificarEstadoCliente(cliente);
            const nombre = cliente.name || 'Cliente sin nombre';
            const email = cliente.email || 'Sin correo';
            const telefono = cliente.phone || 'Sin teléfono';
            const creditoAsignado = parseFloat(cliente.credit_assigned || 0);
            const creditoUsado = parseFloat(cliente.credit_used || 0);
            const creditoDisponible = Math.max(0, creditoAsignado - creditoUsado);
            
            return {
                ...cliente,
                id: cliente.id,
                name: nombre, // Usamos name en lugar de full_name
                email: email,
                phone: telefono,
                credit_assigned: creditoAsignado,
                credit_used: creditoUsado,
                estado,
                diasMora,
                saldoPendiente: creditoUsado,
                creditoDisponible: creditoDisponible,
                status: cliente.status || 'active',
                created_at: cliente.created_at,
                last_sign_in_at: cliente.last_sign_in_at
            };
        });
        
        console.log('Datos de deudores procesados:', deudoresData);
        
        // Renderizar la tabla de deudores
        renderDeudoresTable();
        
        // Actualizar las métricas
        updateDeudoresMetrics();
        
    } catch (error) {
        console.error('Error en loadDeudoresData:', error);
        showError('Error al cargar los datos de deudores: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

/**
 * Obtiene la clase CSS y el texto para mostrar el estado de un cliente
 * @param {string} estado - Estado del cliente ('en_mora', 'al_dia', 'inactivo')
 * @returns {Object} Objeto con las propiedades 'clase' y 'texto'
 */
function getEstadoClaseYTexto(estado) {
    switch (estado) {
        case 'en_mora':
            return {
                clase: 'bg-red-100 text-red-800',
                texto: 'En mora'
            };
        case 'al_dia':
            return {
                clase: 'bg-green-100 text-green-800',
                texto: 'Al día'
            };
        case 'inactivo':
            return {
                clase: 'bg-gray-100 text-gray-800',
                texto: 'Inactivo'
            };
        default:
            return {
                clase: 'bg-gray-100 text-gray-800',
                texto: 'Sin estado'
            };
    }
}

/**
 * Verifica el estado de un cliente basado en su crédito utilizado y última fecha de pago
 * @param {Object} cliente - Datos del cliente
 * @returns {Object} Objeto con 'estado' y 'diasMora'
 */
function verificarEstadoCliente(cliente) {
    // Si el cliente no tiene crédito utilizado, está al día
    if (!cliente.credit_used || parseFloat(cliente.credit_used) <= 0) {
        return {
            estado: 'al_dia',
            diasMora: 0,
            mensaje: 'Sin deuda pendiente'
        };
    }
    
    // Si el cliente tiene crédito utilizado, verificar si está en mora
    const hoy = new Date();
    let ultimoPago = cliente.last_sign_in_at ? new Date(cliente.last_sign_in_at) : null;
    
    // Si no hay fecha de último pago, usar la fecha de creación
    if (!ultimoPago || isNaN(ultimoPago.getTime())) {
        ultimoPago = cliente.created_at ? new Date(cliente.created_at) : new Date();
    }
    
    // Calcular días de mora (diferencia en días entre hoy y el último pago)
    const diffTime = Math.abs(hoy - ultimoPago);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Si han pasado más de 30 días desde el último pago, está en mora
    if (diffDays > 30) {
        return {
            estado: 'en_mora',
            diasMora: diffDays - 30, // Días de mora después del período de gracia
            mensaje: `Último pago hace ${diffDays} días`
        };
    }
    
    // Si no está en mora pero tiene deuda, está al día pero con saldo pendiente
    return {
        estado: 'al_dia',
        diasMora: 0,
        mensaje: 'Al día con saldo pendiente'
    };
}

/**
 * Actualiza las métricas de deudores en la interfaz
 */
function updateDeudoresMetrics() {
    try {
        // Calcular total de deudores
        const totalDeudores = deudoresData.length;
        
        // Calcular total de deuda
        const totalDeuda = deudoresData.reduce((sum, d) => sum + (d.credit_used || 0), 0);
        
        // Contar deudores en mora
        const deudoresEnMora = deudoresData.filter(d => d.estado === 'en_mora').length;
        
        // Contar deudores al día
        const deudoresAlDia = deudoresData.filter(d => d.estado === 'al_dia').length;
        
        // Actualizar la interfaz
        document.getElementById('total-deudores').textContent = totalDeudores;
        document.getElementById('total-deuda').textContent = `S/ ${totalDeuda.toFixed(2)}`;
        document.getElementById('deudores-mora').textContent = deudoresEnMora;
        document.getElementById('deudores-aldia').textContent = deudoresAlDia;
        
    } catch (error) {
        console.error('Error al actualizar métricas de deudores:', error);
    }
}
/**
 * Renderiza la tabla de deudores
 */
function renderDeudoresTable() {
    const tbody = document.getElementById('deudores-table-body');
    
    if (!tbody) {
        console.error('No se encontró el elemento con ID "deudores-table-body"');
        return;
    }
    
    if (!deudoresData || deudoresData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    No se encontraron deudores
                </td>
            </tr>`;
        return;
    }
    
    // Ordenar por crédito utilizado de mayor a menor
    const deudoresOrdenados = [...deudoresData].sort((a, b) => parseFloat(b.credit_used || 0) - parseFloat(a.credit_used || 0));
    
    tbody.innerHTML = deudoresOrdenados.map(deudor => {
        // Determinar clase y texto del estado
        const estadoInfo = getEstadoClaseYTexto(deudor.estado);
        
        // Formatear montos
        const creditoAsignado = parseFloat(deudor.credit_assigned || 0).toFixed(2);
        const creditoUsado = parseFloat(deudor.credit_used || 0).toFixed(2);
        const saldoDisponible = (parseFloat(creditoAsignado) - parseFloat(creditoUsado)).toFixed(2);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${escapeHtml(deudor.name || 'Cliente sin nombre')}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${deudor.email ? escapeHtml(deudor.email) : 'Sin correo'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${deudor.phone ? `<a href="tel:${deudor.phone}" class="text-blue-600 hover:text-blue-800">${deudor.phone}</a>` : 'Sin teléfono'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    S/ ${creditoAsignado}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    S/ ${creditoUsado}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoInfo.clase}">
                        ${estadoInfo.texto}
                    </span>
                    ${deudor.diasMora > 0 ? `<div class="text-xs text-gray-500">${deudor.diasMora} días de mora</div>` : ''}
                    ${deudor.mensaje ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(deudor.mensaje)}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="verDetalleDeudor('${deudor.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3"
                            title="Ver detalles"
                            data-bs-toggle="tooltip" data-bs-placement="top">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    <button onclick="enviarRecordatorio('${deudor.id}')" 
                            class="text-yellow-600 hover:text-yellow-900"
                            title="Enviar recordatorio"
                            data-bs-toggle="tooltip" data-bs-placement="top">
                        <i class="fas fa-bell"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
    
    // Inicializar tooltips de Bootstrap
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Actualizar la paginación
    updateDeudoresPagination();
}

/**
 * Actualiza la interfaz de paginación para la tabla de deudores
 */
function updateDeudoresPagination() {
    const totalPages = Math.ceil(deudoresData.length / itemsPerDeudoresPage);
    const paginationContainer = document.getElementById('deudores-pagination');
    
    if (!paginationContainer) return;
    
    let paginationHTML = `
        <div class="flex-1 flex justify-between sm:hidden">
            <button onclick="changeDeudoresPage(${currentDeudoresPage > 1 ? currentDeudoresPage - 1 : 1})" 
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentDeudoresPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    ${currentDeudoresPage === 1 ? 'disabled' : ''}>
                Anterior
            </button>
            <button onclick="changeDeudoresPage(${currentDeudoresPage < totalPages ? currentDeudoresPage + 1 : totalPages})" 
                    class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${currentDeudoresPage >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    ${currentDeudoresPage >= totalPages ? 'disabled' : ''}>
                Siguiente
            </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
                <p class="text-sm text-gray-700">
                    Mostrando <span class="font-medium">${Math.min((currentDeudoresPage - 1) * itemsPerDeudoresPage + 1, deudoresData.length)}</span>
                    a <span class="font-medium">${Math.min(currentDeudoresPage * itemsPerDeudoresPage, deudoresData.length)}</span>
                    de <span class="font-medium">${deudoresData.length}</span> resultados
                </p>
            </div>
            <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
    `;
    
    // Botón Anterior
    paginationHTML += `
        <button onclick="changeDeudoresPage(${currentDeudoresPage - 1})" 
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentDeudoresPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                ${currentDeudoresPage === 1 ? 'disabled' : ''}>
            <span class="sr-only">Anterior</span>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Números de página
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentDeudoresPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="changeDeudoresPage(1)" 
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            `;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changeDeudoresPage(${i})" 
                    class="relative inline-flex items-center px-4 py-2 border ${currentDeudoresPage === i ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'} text-sm font-medium">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                </span>
            `;
        }
        paginationHTML += `
            <button onclick="changeDeudoresPage(${totalPages})" 
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                ${totalPages}
            </button>
        `;
    }
    
    // Botón Siguiente
    paginationHTML += `
        <button onclick="changeDeudoresPage(${currentDeudoresPage + 1})" 
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentDeudoresPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}"
                ${currentDeudoresPage >= totalPages ? 'disabled' : ''}>
            <span class="sr-only">Siguiente</span>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += `
                </nav>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

/**
 * Cambia la página actual de la tabla de deudores
 * @param {number} pageNumber - Número de página a la que se desea ir
 */
function changeDeudoresPage(pageNumber) {
    const totalPages = Math.ceil(deudoresData.length / itemsPerDeudoresPage);
    
    if (pageNumber < 1 || pageNumber > totalPages) {
        return;
    }
    
    currentDeudoresPage = pageNumber;
    renderDeudoresTable();
    
    // Desplazarse al inicio de la tabla
    const tableContainer = document.querySelector('#deudores-content .overflow-x-auto');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Muestra el detalle de un deudor en un modal
 * @param {string} userId - ID del usuario deudor
 */
async function verDetalleDeudor(userId) {
    try {
        // Buscar el deudor en los datos cargados
        const deudor = deudoresData.find(d => d.id === userId);
        
        if (!deudor) {
            showError('No se encontró la información del deudor');
            return;
        }
        
        // Crear el contenido del modal
        const modalContent = `
            <div class="space-y-4">
                <div class="border-b border-gray-200 pb-4">
                    <h3 class="text-lg font-medium text-gray-900">Detalles del Deudor</h3>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Nombre</h4>
                        <p class="mt-1 text-sm text-gray-900">${escapeHtml(deudor.name || 'No especificado')}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Correo Electrónico</h4>
                        <p class="mt-1 text-sm text-gray-900">${escapeHtml(deudor.email || 'No especificado')}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Teléfono</h4>
                        <p class="mt-1 text-sm text-gray-900">${deudor.phone ? escapeHtml(deudor.phone) : 'No especificado'}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Estado</h4>
                        <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoClaseYTexto(deudor.estado).clase}">
                            ${getEstadoClaseYTexto(deudor.estado).texto}
                        </span>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Crédito Asignado</h4>
                        <p class="mt-1 text-sm text-gray-900">S/ ${parseFloat(deudor.credit_assigned || 0).toFixed(2)}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Crédito Utilizado</h4>
                        <p class="mt-1 text-sm text-gray-900">S/ ${parseFloat(deudor.credit_used || 0).toFixed(2)}</p>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Saldo Disponible</h4>
                        <p class="mt-1 text-sm text-gray-900">S/ ${(parseFloat(deudor.credit_assigned || 0) - parseFloat(deudor.credit_used || 0)).toFixed(2)}</p>
                    </div>
                    ${deudor.diasMora > 0 ? `
                    <div class="col-span-2">
                        <h4 class="text-sm font-medium text-gray-500">Días de Mora</h4>
                        <p class="mt-1 text-sm text-red-600">${deudor.diasMora} días</p>
                    </div>` : ''}
                </div>
                
                <div class="mt-4 border-t border-gray-200 pt-4">
                    <h4 class="text-sm font-medium text-gray-500">Último Acceso</h4>
                    <p class="mt-1 text-sm text-gray-900">${deudor.last_sign_in_at ? new Date(deudor.last_sign_in_at).toLocaleString('es-ES') : 'Nunca'}</p>
                </div>
                
                <div class="mt-4 flex justify-end space-x-3">
                    <button type="button" onclick="cerrarModalDetalle()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Cerrar
                    </button>
                    <button type="button" onclick="enviarRecordatorio('${deudor.id}')" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                        <i class="fas fa-bell mr-2"></i> Enviar Recordatorio
                    </button>
                </div>
            </div>
        `;
        
        // Mostrar el modal
        const modal = document.getElementById('modal-detalle-deudor');
        if (modal) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = modalContent;
            }
            modal.classList.remove('hidden');
        } else {
            // Si no existe el modal, mostramos los datos en un alert
            alert(`Detalles del deudor:\n\n` +
                  `Nombre: ${escapeHtml(deudor.name || 'No especificado')}\n` +
                  `Correo: ${escapeHtml(deudor.email || 'No especificado')}\n` +
                  `Teléfono: ${deudor.phone || 'No especificado'}\n` +
                  `Estado: ${getEstadoClaseYTexto(deudor.estado).texto}\n` +
                  `Crédito Asignado: S/ ${parseFloat(deudor.credit_assigned || 0).toFixed(2)}\n` +
                  `Crédito Utilizado: S/ ${parseFloat(deudor.credit_used || 0).toFixed(2)}\n` +
                  `Saldo Disponible: S/ ${(parseFloat(deudor.credit_assigned || 0) - parseFloat(deudor.credit_used || 0)).toFixed(2)}` +
                  (deudor.diasMora > 0 ? `\nDías de Mora: ${deudor.diasMora} días` : ''));
        }
    } catch (error) {
        console.error('Error al mostrar detalle del deudor:', error);
        showError('Error al cargar los detalles del deudor');
    }
}
/**
 * Cierra el modal de detalle del deudor
 */
function cerrarModalDetalle() {
    const modal = document.getElementById('modal-detalle-deudor');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Genera los gráficos para el reporte de deudores
 */
async function generateDeudoresCharts() {
    try {
        // Verificar si Chart está disponible
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no está cargado, no se pueden generar gráficos');
            return;
        }
        
        // Datos para los gráficos
        const totalDeudores = deudoresData.length;
        const totalDeuda = deudoresData.reduce((sum, d) => sum + (d.credit_used || 0), 0);
        
        const deudoresPorEstado = deudoresData.reduce((acc, d) => {
            acc[d.estado] = (acc[d.estado] || 0) + 1;
            return acc;
        }, {});
        
        // Actualizar métricas
        const updateMetric = (id, value, isCurrency = false) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = isCurrency ? formatCurrency(value) : value;
            }
        };
        
        updateMetric('total-deudores', totalDeudores);
        updateMetric('total-deuda', totalDeuda, true);
        updateMetric('deudores-mora', deudoresPorEstado[CREDIT_STATUS.EN_MORA] || 0);
        updateMetric('deudores-aldia', deudoresPorEstado[CREDIT_STATUS.AL_DIA] || 0);
        
        // Gráfico de distribución de deudores por estado
        const ctxEstado = document.getElementById('deudores-estado-chart');
        if (ctxEstado) {
            // Destruir el gráfico anterior si existe
            if (window.deudoresEstadoChart) {
                window.deudoresEstadoChart.destroy();
            }
            
            const labels = Object.keys(CREDIT_STATUS).map(key => {
                const estados = {
                    'EN_MORA': 'En mora',
                    'AL_DIA': 'Al día',
                    'SIN_DEUDA': 'Sin deuda'
                };
                return estados[key] || key;
            });
            
            const data = Object.values(CREDIT_STATUS).map(status => 
                deudoresData.filter(d => d.estado === status).length
            );
            
            const backgroundColors = [
                'rgba(239, 68, 68, 0.7)',  // Rojo para mora
                'rgba(16, 185, 129, 0.7)', // Verde para al día
                'rgba(156, 163, 175, 0.7)' // Gris para sin deuda
            ];
            
            window.deudoresEstadoChart = new Chart(ctxEstado, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Distribución de Deudores por Estado',
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            });
        }
        
        // Gráfico de los 10 mayores deudores
        const ctxTopDeudores = document.getElementById('top-deudores-chart');
        if (ctxTopDeudores && deudoresData.length > 0) {
            // Destruir el gráfico anterior si existe
            if (window.topDeudoresChart) {
                window.topDeudoresChart.destroy();
            }
            
            // Ordenar por deuda descendente y tomar los primeros 10
            const topDeudores = [...deudoresData]
                .sort((a, b) => (b.credit_used || 0) - (a.credit_used || 0))
                .slice(0, 10);
            
            const labels = topDeudores.map(d => d.full_name?.split(' ')[0] || 'Cliente');
            const data = topDeudores.map(d => d.credit_used || 0);
            
            window.topDeudoresChart = new Chart(ctxTopDeudores, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Deuda (S/)',
                        data: data,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Top 10 Mayores Deudores',
                            font: {
                                size: 16
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'S/ ' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error al generar gráficos de deudores:', error);
    }
}

// Función para cambiar entre pestañas
async function switchTab(tabId) {
    console.log(`Cambiando a la pestaña: ${tabId}`);
    
    // Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactivar todos los botones de pestaña
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'text-blue-600');
        button.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    
    // Activar la pestaña seleccionada
    const tabContent = document.getElementById(`${tabId}-content`);
    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    
    if (tabContent) tabContent.classList.add('active');
    if (tabButton) {
        tabButton.classList.add('active', 'text-blue-600');
        tabButton.classList.remove('text-gray-500', 'hover:text-gray-700');
    }
    
    // Cargar el contenido correspondiente a la pestaña seleccionada
    if (tabId === 'ventas') {
        console.log('Cargando reporte de ventas...');
        await loadReportData();
        generateCharts();
    } else if (tabId === 'deudores') {
        console.log('Cargando reporte de deudores...');
        await loadDeudoresData();
        await generateDeudoresCharts();
        // Cargar los pagos cuando se muestre la pestaña de deudores
        await cargarPagos();
    }
}

// Función para inicializar la aplicación
async function initApp() {
    try {
        console.log('Inicializando aplicación de reportes...');
        
        // Mostrar loading
        showLoading(true);
        
        // Inicializar elementos del DOM
        console.log('Inicializando elementos del DOM...');
        initElements();
        
        // Verificar autenticación
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            console.log('No hay sesión activa, redirigiendo a login...');
            window.location.href = '/login.html';
            return;
        }
        
        // Configurar manejadores de eventos
        console.log('Configurando manejadores de eventos...');
        setupEventListeners();
        
        // Configurar eventos de los filtros
        console.log('Configurando eventos de filtros...');
        setupFilterEvents();
        
        // Cargar datos iniciales
        console.log('Cargando datos iniciales...');
        await loadReportData();
        
        // Configurar el botón activo por defecto
        console.log('Actualizando interfaz...');
        updateActiveFilterButton('all');
        
        // Configurar el tipo de reporte por defecto
        const reportTypeSelect = document.getElementById('report-type');
        if (reportTypeSelect) {
            reportTypeSelect.value = currentReportType;
        }
        
        // Configurar eventos de las pestañas
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                if (tabId) {
                    switchTab(tabId);
                }
            });
        });
        
        // Asegurarse de que la pestaña de ventas esté activa al inicio
        switchTab('ventas');
        
        console.log('Aplicación de reportes inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Ocurrió un error al inicializar la aplicación: ' + (error.message || error));
    } finally {
        showLoading(false);
    }
}

/**
 * Exporta el reporte de deudores a un archivo Excel
 * @param {string} tipo - Tipo de exportación: 'todos' o 'morosos'
 */
async function exportarDeudoresAExcel(tipo = 'todos') {
    try {
        // Mostrar indicador de carga
        const loadingToast = Swal.fire({
            title: 'Generando reporte',
            text: 'Por favor espere mientras se generan los datos...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener datos de deudores
        const { data: deudores, error } = await supabase
            .from('profiles')
            .select('*, payments(*)')
            .eq('role', 'buyer')
            .order('credit_used', { ascending: false });

        if (error) throw error;

        // Filtrar según el tipo de reporte
        let deudoresFiltrados = [];
        let tituloReporte = '';
        
        if (tipo === 'todos') {
            // Todos los deudores con crédito utilizado
            deudoresFiltrados = deudores.filter(d => d.credit_used > 0);
            tituloReporte = 'TODOS LOS DEUDORES';
        } else if (tipo === 'morosos') {
            // Solo clientes en mora (crédito utilizado > crédito asignado)
            deudoresFiltrados = deudores.filter(d => d.credit_used > (d.credit_assigned || 0));
            tituloReporte = 'CLIENTES EN MORA';
        }

        // Obtener totales
        const totalDeudores = deudoresFiltrados.length;
        const totalAlDia = deudoresFiltrados.filter(d => d.credit_used <= (d.credit_assigned || 0)).length;
        const totalEnMora = totalDeudores - totalAlDia;

        // Crear hoja de resumen
        const resumen = [
            [`REPORTE DE ${tituloReporte}`],
            ['Fecha de generación:', new Date().toLocaleString('es-ES')],
            ['', ''],
            ['RESUMEN'],
            ['Total de Deudores', totalDeudores]
        ];
        
        // Solo mostrar estos totales si es el reporte de todos los deudores
        if (tipo === 'todos') {
            resumen.push(
                ['Clientes al Día', totalAlDia],
                ['Clientes en Mora', totalEnMora]
            );
        }
        
        resumen.push(
            ['', ''],
            ['DETALLE DE DEUDORES'],
            ['NOMBRE', 'CORREO', 'TELÉFONO', 'CRÉDITO ASIGNADO', 'CRÉDITO UTILIZADO', 'SALDO DISPONIBLE', 'ESTADO', 'DÍAS DE MORA']
        );

        // Agregar datos de deudores
        deudoresFiltrados.forEach(deudor => {
            const saldoDisponible = (deudor.credit_assigned || 0) - (deudor.credit_used || 0);
            const estado = saldoDisponible >= 0 ? 'AL DÍA' : 'EN MORA';
            const estadoInfo = verificarEstadoCliente(deudor);
            
            resumen.push([
                deudor.name || 'Sin nombre',
                deudor.email || 'Sin correo',
                deudor.phone || 'Sin teléfono',
                deudor.credit_assigned || 0,
                deudor.credit_used || 0,
                saldoDisponible,
                estado,
                estadoInfo.diasMora > 0 ? estadoInfo.diasMora : '0'
            ]);
        });

        // Crear hoja de pagos
        const pagosData = [
            ['PAGOS REGISTRADOS'],
            ['', ''],
            ['FECHA', 'CLIENTE', 'MONTO', 'MÉTODO DE PAGO', 'ESTADO', 'NOTAS']
        ];

        // Agregar datos de pagos
        deudoresFiltrados.forEach(deudor => {
            if (deudor.payments && deudor.payments.length > 0) {
                deudor.payments.forEach(pago => {
                    pagosData.push([
                        pago.payment_date ? new Date(pago.payment_date).toLocaleString('es-ES') : 'Sin fecha',
                        deudor.name || 'Cliente sin nombre',
                        pago.amount || 0,
                        pago.payment_method || 'No especificado',
                        pago.status || 'Completado',
                        pago.notes || ''
                    ]);
                });
            }
        });

        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        
        // Agregar hoja de resumen
        const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Deudores');
        
        // Agregar hoja de pagos si hay datos
        if (pagosData.length > 3) {
            const wsPagos = XLSX.utils.aoa_to_sheet(pagosData);
            XLSX.utils.book_append_sheet(wb, wsPagos, 'Pagos');
        }

        // Aplicar formato a la hoja de resumen
        const range = XLSX.utils.decode_range(wsResumen['!ref']);
        
        // Aplicar estilos al título
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = XLSX.utils.encode_cell({r: 0, c: C});
            if (!wsResumen[cell]) wsResumen[cell] = {};
            wsResumen[cell].s = { 
                font: { bold: true, sz: 16, color: { rgb: '2C5282' } },
                alignment: { horizontal: 'center' }
            };
        }

        // Aplicar estilos a los encabezados de tabla
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = XLSX.utils.encode_cell({r: 9, c: C});
            if (!wsResumen[cell]) wsResumen[cell] = {};
            wsResumen[cell].s = { 
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '2C5282' } },
                alignment: { horizontal: 'center' }
            };
        }

        // Formato de moneda para las columnas de montos
        [3, 4, 5].forEach(col => {
            for (let R = 10; R <= range.e.r; R++) {
                const cell = XLSX.utils.encode_cell({r: R, c: col});
                if (wsResumen[cell] && typeof wsResumen[cell].v === 'number') {
                    if (!wsResumen[cell].s) wsResumen[cell].s = {};
                    wsResumen[cell].s.numFmt = '"S/"#,##0.00';
                }
            }
        });

        // Ajustar ancho de columnas
        wsResumen['!cols'] = [
            { wch: 30 }, // Nombre
            { wch: 30 }, // Correo
            { wch: 20 }, // Teléfono
            { wch: 15 }, // Crédito Asignado
            { wch: 15 }, // Crédito Utilizado
            { wch: 15 }, // Saldo Disponible
            { wch: 15 }, // Estado
            { wch: 12 }  // Días de mora
        ];

        // Generar archivo Excel
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = tipo === 'morosos' 
            ? `Reporte_Clientes_Mora_${fecha}.xlsx` 
            : `Reporte_Deudores_${fecha}.xlsx`;
            
        XLSX.writeFile(wb, nombreArchivo);

        // Cerrar indicador de carga
        await loadingToast.close();

    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte. Por favor, intente nuevamente.'
        });
    }
}

/**
 * Exporta el historial de pagos a un archivo Excel
 */
async function exportarPagosAExcel() {
    try {
        // Mostrar indicador de carga
        const loadingToast = Swal.fire({
            title: 'Generando reporte de pagos',
            text: 'Por favor espere mientras se generan los datos...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener datos de pagos con información de clientes
        const { data: pagos, error: errorPagos } = await supabase
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
                updated_at,
                buyer:profiles!buyer_id (name, email, phone)
            `)
            .order('payment_date', { ascending: false });

        if (errorPagos) {
            console.error('Error al obtener pagos:', errorPagos);
            throw errorPagos;
        }

        // Crear hoja de datos
        const datos = [
            ['HISTORIAL DE PAGOS'],
            ['Fecha de generación:', new Date().toLocaleString('es-ES')],
            ['', ''],
            [
                'FECHA', 
                'ID PAGO', 
                'ID ORDEN', 
                'CLIENTE', 
                'CORREO', 
                'TELÉFONO', 
                'MONTO', 
                'MÉTODO DE PAGO', 
                'REFERENCIA',
                'ESTADO', 
                'NOTAS',
                'FECHA CREACIÓN',
                'ÚLTIMA ACTUALIZACIÓN'
            ]
        ];

        // Agregar datos de pagos
        pagos.forEach(pago => {
            datos.push([
                pago.payment_date ? new Date(pago.payment_date).toLocaleString('es-ES') : 'Sin fecha',
                pago.id || 'N/A',
                pago.order_id || 'N/A',
                pago.buyer?.name || 'Cliente sin nombre',
                pago.buyer?.email || 'Sin correo',
                pago.buyer?.phone || 'Sin teléfono',
                pago.amount || 0,
                pago.payment_method || 'No especificado',
                pago.reference_id || 'N/A',
                pago.status || 'Completado',
                pago.notes || '',
                pago.created_at ? new Date(pago.created_at).toLocaleString('es-ES') : 'N/A',
                pago.updated_at ? new Date(pago.updated_at).toLocaleString('es-ES') : 'N/A'
            ]);
        });

        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datos);
        XLSX.utils.book_append_sheet(wb, ws, 'Historial de Pagos');

        // Aplicar formato
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Estilo para el título
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = XLSX.utils.encode_cell({r: 0, c: C});
            if (!ws[cell]) ws[cell] = {};
            ws[cell].s = { 
                font: { bold: true, sz: 16, color: { rgb: '2C5282' } },
                alignment: { horizontal: 'center' }
            };
        }

        // Estilo para los encabezados
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = XLSX.utils.encode_cell({r: 3, c: C});
            if (!ws[cell]) ws[cell] = {};
            ws[cell].s = { 
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '2C5282' } },
                alignment: { horizontal: 'center' },
                wrapText: true
            };
        }

        // Formato de moneda para la columna de monto (columna G, índice 6)
        for (let R = 4; R <= range.e.r; R++) {
            const cell = XLSX.utils.encode_cell({r: R, c: 6});
            if (ws[cell] && typeof ws[cell].v === 'number') {
                if (!ws[cell].s) ws[cell].s = {};
                ws[cell].s.numFmt = '"S/"#,##0.00';
            }
        }

        // Ajustar ancho de columnas
        ws['!cols'] = [
            { wch: 20 }, // Fecha Pago
            { wch: 30 }, // ID Pago
            { wch: 30 }, // ID Orden
            { wch: 25 }, // Cliente
            { wch: 30 }, // Correo
            { wch: 15 }, // Teléfono
            { wch: 12 }, // Monto
            { wch: 20 }, // Método de pago
            { wch: 20 }, // Referencia
            { wch: 15 }, // Estado
            { wch: 30 }, // Notas
            { wch: 20 }, // Fecha Creación
            { wch: 20 }  // Última actualización
        ];

        // Congelar la primera fila (títulos)
        ws['!freeze'] = { x: 0, y: 4 };

        // Generar archivo Excel
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Reporte_Pagos_${fecha}.xlsx`);

        // Cerrar indicador de carga
        await loadingToast.close();

    } catch (error) {
        console.error('Error al exportar pagos a Excel:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte de pagos. Por favor, intente nuevamente.'
        });
    }
}

/**
 * Muestra el modal de exportación de reportes
 */
function mostrarModalExportar() {
    const modal = document.getElementById('modal-exportar-reporte');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Cierra el modal de exportación de reportes
 */
function cerrarModalExportar() {
    const modal = document.getElementById('modal-exportar-reporte');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Función que se ejecuta al seleccionar un tipo de reporte para exportar
 * @param {string} tipo - Tipo de reporte a exportar (todos, morosos, pagos)
 */
async function exportarReporteSeleccionado(tipo) {
    cerrarModalExportar();
    
    switch(tipo) {
        case 'todos':
            await exportarDeudoresAExcel('todos');
            break;
        case 'morosos':
            await exportarDeudoresAExcel('morosos');
            break;
        case 'pagos':
            await exportarPagosAExcel();
            break;
    }
}

/**
 * Carga los pagos en la tabla
 */
async function cargarPagos() {
    try {
        const pagosBody = document.getElementById('pagos-body');
        if (!pagosBody) {
            console.error('No se encontró el elemento pagos-body');
            return;
        }

        console.log('Iniciando carga de pagos...');
        
        // Mostrar indicador de carga
        pagosBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    Cargando pagos...
                </td>
            </tr>`;

        // Obtener el ID del store del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        console.log('ID de usuario autenticado:', user.id);

        // Obtener el perfil del usuario para verificar si es admin
        const { data: perfil, error: perfilError } = await supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single();

        if (perfilError || !perfil) {
            throw new Error('No se pudo obtener la información del perfil');
        }

        console.log('Perfil del usuario:', perfil);
        console.log('Rol del usuario:', perfil.role);
        console.log('Store ID del usuario:', perfil.store_id);

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
                store_id,
                buyer:profiles!buyer_id (name, email, phone, store_id)
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

        // Consulta de depuración: verificar si hay algún pago en la base de datos
        console.log('Realizando consulta de depuración para ver todos los pagos...');
        const { data: todosLosPagos, error: errorTodos } = await supabase
            .from('payments')
            .select('*', { count: 'exact' })
            .limit(5); // Solo obtener los primeros 5 para depuración

        console.log('Resultado de la consulta de depuración (primeros 5 pagos):', todosLosPagos);
        if (errorTodos) {
            console.error('Error en la consulta de depuración:', errorTodos);
        }

        // Ordenar por fecha de pago descendente y limitar resultados
        console.log('Realizando consulta principal con filtros...');
        const { data: pagos, error: pagosError, count } = await query
            .order('payment_date', { ascending: false })
            .limit(50); // Limitar a 50 registros para la vista previa

        if (pagosError) {
            console.error('Error al obtener pagos:', pagosError);
            console.error('Detalles del error:', pagosError);
            throw pagosError;
        }

        console.log(`Se encontraron ${pagos?.length || 0} pagos con los filtros aplicados`);
        console.log('Datos de pagos filtrados:', pagos);
        
        // Mostrar la consulta SQL generada (solo para depuración en desarrollo)
        console.log('Consulta SQL generada (aproximada):', query);

        // Limpiar la tabla
        pagosBody.innerHTML = '';

        if (!pagos || pagos.length === 0) {
            pagosBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                        No se encontraron registros de pagos para esta tienda.
                    </td>
                </tr>`;
            return;
        }

        // Llenar la tabla con los datos
        pagos.forEach(pago => {
            try {
                const fechaPago = pago.payment_date ? new Date(pago.payment_date) : new Date(pago.created_at);
                const fila = document.createElement('tr');
                fila.className = 'hover:bg-gray-50';
                
                // Formatear el monto
                let monto = '0.00';
                try {
                    monto = parseFloat(pago.amount || 0).toFixed(2);
                } catch (e) {
                    console.error('Error al formatear el monto:', e);
                }
                
                // Obtener el nombre del comprador
                let nombreComprador = 'Cliente no encontrado';
                let emailComprador = 'Sin correo';
                
                if (pago.buyer) {
                    nombreComprador = pago.buyer.name || nombreComprador;
                    emailComprador = pago.buyer.email || emailComprador;
                }
                
                fila.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${fechaPago.toLocaleString('es-ES')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="font-mono text-xs" title="${pago.id}">${pago.id.substring(0, 8)}...</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${nombreComprador}</div>
                        <div class="text-sm text-gray-500">${emailComprador}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        S/ ${monto}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${pago.payment_method || 'No especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${pago.status === 'Completado' ? 'bg-green-100 text-green-800' : 
                              pago.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'}">
                            ${pago.status || 'Desconocido'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title="${pago.notes || ''}">
                        ${pago.notes || ''}
                    </td>`;
                pagosBody.appendChild(fila);
            } catch (error) {
                console.error('Error al procesar pago:', error, pago);
            }
        });

        console.log('Pagos cargados exitosamente');

    } catch (error) {
        console.error('Error en cargarPagos:', error);
        const pagosBody = document.getElementById('pagos-body');
        if (pagosBody) {
            pagosBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-sm text-red-600">
                        Error al cargar los pagos: ${error.message || 'Error desconocido'}
                    </td>
                </tr>`;
        }
    }
}

// Inicializar la aplicación cuando el DOM esté completamente cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Configurar evento de exportación de deudores
        const exportBtn = document.getElementById('export-deudores');
        if (exportBtn) {
            exportBtn.addEventListener('click', mostrarModalExportar);
        }
        
        // Inicializar la aplicación
        initApp();
        
        // Cargar los pagos
        cargarPagos();
    });
} else {
    initApp();
    cargarPagos();
}