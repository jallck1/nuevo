// Estado de la aplicación
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let currentFilter = 'all';
let storeId = '';
let searchQuery = '';

// Elementos del DOM - Serán inicializados por HTML
let ordersTableBody, loading, currentPageInput, totalItemsSpan, showingFromSpan, showingToSpan;
let totalPagesSpan, prevPageBtn, nextPageBtn, searchOrdersInput;
let filterAllBtn, filterPendingBtn, filterCompletedBtn, filterCancelledBtn;

// Inicializar elementos del DOM
function initElements() {
    ordersTableBody = document.getElementById('orders-table-body');
    loading = document.getElementById('loading');
    currentPageInput = document.getElementById('current-page');
    totalItemsSpan = document.getElementById('total-items');
    showingFromSpan = document.getElementById('showing-from');
    showingToSpan = document.getElementById('showing-to');
    totalPagesSpan = document.getElementById('total-pages');
    prevPageBtn = document.getElementById('prev-page');
    nextPageBtn = document.getElementById('next-page');
    searchOrdersInput = document.getElementById('search-orders');
    filterAllBtn = document.getElementById('filter-all');
    filterPendingBtn = document.getElementById('filter-pending');
    filterCompletedBtn = document.getElementById('filter-completed');
    filterCancelledBtn = document.getElementById('filter-cancelled');
}



// Configurar manejadores de eventos
function setupEventListeners() {
    try {
        // Evento de búsqueda
        searchOrdersInput = document.getElementById('search-orders');
        if (searchOrdersInput) {
            searchOrdersInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                currentPage = 1;
                loadOrders();
            });
        }

        // Inicializar botones de filtro
        filterAllBtn = document.getElementById('filter-all');
        filterPendingBtn = document.getElementById('filter-pending');
        filterCompletedBtn = document.getElementById('filter-completed');
        filterCancelledBtn = document.getElementById('filter-cancelled');

        // Filtros
        filterAllBtn?.addEventListener('click', () => {
            currentFilter = 'all';
            currentPage = 1;
            updateActiveFilterButton('all');
            loadOrders();
        });
        
        filterPendingBtn?.addEventListener('click', () => {
            currentFilter = 'Pendiente';
            currentPage = 1;
            updateActiveFilterButton('Pendiente');
            loadOrders();
        });
        
        filterCompletedBtn?.addEventListener('click', () => {
            currentFilter = 'Entregado';
            currentPage = 1;
            updateActiveFilterButton('Entregado');
            loadOrders();
        });
        
        filterCancelledBtn?.addEventListener('click', () => {
            currentFilter = 'Cancelado';
            currentPage = 1;
            updateActiveFilterButton('Cancelado');
            loadOrders();
        });
        
        // Paginación
        prevPageBtn = document.getElementById('prev-page');
        nextPageBtn = document.getElementById('next-page');
        currentPageInput = document.getElementById('current-page');
        
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => { 
            if (currentPage > 1) { 
                currentPage--; 
                loadOrders(); 
            } 
        });
        
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => { 
            if (currentPage < Math.ceil(totalItems / itemsPerPage)) { 
                currentPage++; 
                loadOrders(); 
            } 
        });
        
        if (currentPageInput) {
            currentPageInput.addEventListener('change', () => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const newPage = parseInt(currentPageInput.value);
                if (newPage > 0 && newPage <= totalPages) {
                    currentPage = newPage;
                    loadOrders();
                } else {
                    currentPageInput.value = currentPage;
                }
            });
        }
    } catch (error) {
        console.error('Error en setupEventListeners:', error);
        showError('Error al configurar los eventos: ' + error.message);
    }
}

// Función para mostrar/ocultar el indicador de carga
function showLoading(show) {
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

// Función para mostrar mensajes de error
function showError(message) {
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
            confirmButtonText: 'Aceptar'
        });
    } else {
        alert(`Éxito: ${message}`);
    }
}

// Función para obtener el store_id del usuario
async function getUserStoreId() {
    try {
        // Verificar que supabase esté disponible
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado');
        }

        // Obtener el usuario actual
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
            // Redirigir al login si no hay usuario autenticado
            window.location.href = '/login.html';
            return null;
        }
        
        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error al obtener el perfil:', profileError);
            throw new Error('No se pudo cargar la información del perfil');
        }
        
        if (!profile) {
            throw new Error('Perfil de usuario no encontrado');
        }
        
        if (!profile.store_id) {
            throw new Error('Este usuario no está asociado a ninguna tienda');
        }
        
        return profile.store_id;
    } catch (error) {
        console.error('Error en getUserStoreId:', error);
        showError(error.message || 'Error al obtener la información de la tienda');
        
        // Redirigir al dashboard si hay un error de autenticación
        if (error.message.includes('authentication') || error.message.includes('No hay usuario autenticado')) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
        
        return null;
    }
}

// Función para cargar las órdenes
async function loadOrders() {
    try {
        showLoading(true);
        
        // Obtener los estados únicos de la base de datos
        const uniqueStatuses = await getUniqueStatuses();
        console.log('Estados únicos en la base de datos:', uniqueStatuses);
        
        // Obtener el store_id del usuario autenticado
        storeId = await getUserStoreId();
        if (!storeId) {
            showError('No se pudo obtener la tienda del usuario');
            return;
        }
        
        // Construir la consulta base con las relaciones necesarias
        let query = window.supabase
            .from('orders')
            .select(`
                *,
                buyer:buyer_id (id, name, email, avatar_url),
                order_items (id, quantity, product:products (id, name, image_url, sku, price))
            `, { count: 'exact' })
            .eq('store_id', storeId);
            
        // Aplicar filtros
        if (currentFilter === 'pending' || currentFilter === 'Pendiente') {
            query = query.eq('status', 'Pendiente');
        } else if (currentFilter === 'completed' || currentFilter === 'Entregado') {
            query = query.eq('status', 'Entregado');
        } else if (currentFilter === 'cancelled' || currentFilter === 'Cancelado') {
            query = query.eq('status', 'Cancelado');
        }
        
        // Aplicar búsqueda
        const searchTerm = searchQuery || (searchOrdersInput?.value?.trim() || '');
        if (searchTerm) {
            // Validar si es un UUID completo (8-4-4-4-12 caracteres hexadecimales)
            const isCompleteUUID = searchTerm.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
            
            if (isCompleteUUID) {
                // Si es un UUID completo, buscar por ID exacto
                query = query.eq('id', searchTerm);
            } else if (searchTerm.match(/^[0-9a-fA-F-]+$/)) {
                // Si parece un UUID pero está incompleto, no buscar para evitar errores
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
                    ordersTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center py-4">
                                No se encontraron órdenes que coincidan con la búsqueda.
                            </td>
                        </tr>`;
                    updatePaginationUI(0, 0);
                    showLoading(false);
                    return;
                }
            }
        }
        
        // Obtener el conteo total
        const { count, error: countError } = await query;
        
        if (countError) throw countError;
        
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
        
        // Obtener los datos de la página actual con las relaciones necesarias
        const { data: orders, error } = await window.supabase
            .from('orders')
            .select(`
                *,
                buyer:buyer_id (name, email, avatar_url),
                order_items (quantity, product:products (name, image_url, sku, price))
            `)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .range(from, to);
            
        if (error) throw error;
        
        // Actualizar la interfaz de usuario
        updatePaginationUI(totalItems, totalPages);
        
        // Renderizar las órdenes en la tabla
        console.log('Órdenes cargadas:', orders); // Depuración
        if (ordersTableBody) {
            ordersTableBody.innerHTML = orders.map(order => {
                // Calcular el total de la orden
                const orderTotal = order.order_items.reduce((total, item) => {
                    return total + (item.quantity * (item.product?.price || 0));
                }, 0);

                // Obtener el primer producto para mostrar en la lista
                const firstProduct = order.order_items[0]?.product || { name: 'Producto no disponible', image_url: '' };
                
                // Mapear el estado a un texto legible
                const statusText = {
                    'pending': 'Pendiente',
                    'completed': 'Completada',
                    'cancelled': 'Cancelada'
                }[order.status] || order.status;

                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div class="font-mono text-xs">${order.id}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10">
                                    <img class="h-10 w-10 rounded-full" 
                                        src="${order.buyer?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(order.buyer?.name || 'U')}" 
                                        alt="${order.buyer?.name || 'Usuario'}">
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${order.buyer?.name || 'Cliente'}</div>
                                    <div class="text-sm text-gray-500">${order.buyer?.email || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10">
                                    <img class="h-10 w-10 rounded" 
                                        src="${firstProduct.image_url || 'https://via.placeholder.com/40'}" 
                                        alt="${firstProduct.name}">
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm text-gray-900">${firstProduct.name}</div>
                                    <div class="text-sm text-gray-500">
                                        ${order.order_items.length} ${order.order_items.length === 1 ? 'producto' : 'productos'}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">$${orderTotal.toFixed(2)}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)} capitalize">
                                ${statusText}
                            </span>
                        </td>
                        <td class="px-2 py-4 whitespace-nowrap text-center">
                            <button onclick="showOrderDetails('${order.id}')" 
                                    class="text-indigo-600 hover:text-indigo-900 hover:underline">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <select id="status-${order.id}" 
                                    onchange="updateOrderStatus('${order.id}', this.value)"
                                    class="block w-full rounded-md border border-gray-300 py-1 px-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                ${['Pendiente', 'Entregado'].map(status => 
                                    `<option value="${status}" ${order.status === status ? 'selected' : ''}>
                                        ${status}
                                    </option>`
                                ).join('')}
                            </select>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
    } catch (error) {
        console.error('Error al cargar las órdenes:', error);
        showError('Error al cargar las órdenes: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para actualizar la interfaz de paginación
window.updatePaginationUI = function(totalItems, totalPages) {
    try {
        // Actualizar contadores
        const totalItemsEl = document.getElementById('total-items');
        const totalPagesEl = document.getElementById('total-pages');
        const showingFromEl = document.getElementById('showing-from');
        const showingToEl = document.getElementById('showing-to');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const currentPageEl = document.getElementById('current-page');
        
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        
        // Calcular y actualizar el rango mostrado
        const from = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
        const to = Math.min(currentPage * itemsPerPage, totalItems);
        
        if (showingFromEl) showingFromEl.textContent = from;
        if (showingToEl) showingToEl.textContent = to;
        
        // Actualizar estado de los botones de navegación
        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
        
        // Actualizar el campo de página actual
        if (currentPageEl) currentPageEl.value = currentPage;
    } catch (error) {
        console.error('Error en updatePaginationUI:', error);
    }
};

// Función para obtener la clase CSS según el estado
function getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusStr = String(status); // Asegurarse de que sea string
    
    // Mapear los estados (mayúsculas y minúsculas)
    const statusClasses = {
        // Estados en español
        'Pendiente': 'bg-yellow-100 text-yellow-800',
        'pendiente': 'bg-yellow-100 text-yellow-800',
        'Entregado': 'bg-green-100 text-green-800',
        'entregado': 'bg-green-100 text-green-800',
        // Estados en inglés (por compatibilidad)
        'pending': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'delivered': 'bg-green-100 text-green-800',
        // Estado por defecto
        'all': 'bg-gray-100 text-gray-800'
    };
    
    // Buscar coincidencia exacta primero
    if (statusClasses[statusStr] !== undefined) {
        return statusClasses[statusStr];
    }
    
    // Si no hay coincidencia exacta, intentar con minúsculas
    const statusLower = statusStr.toLowerCase();
    return statusClasses[statusLower] || statusClasses['all'];
}

// Función para mostrar detalles de una orden
async function showOrderDetails(orderId) {
    try {
        showLoading(true);
        
        // Verificar que supabase esté disponible
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado');
        }

        // Obtener los detalles completos de la orden
        const { data: order, error } = await window.supabase
            .from('orders')
            .select(`
                *,
                buyer:buyer_id (name, email, phone, address),
                order_items (
                    quantity, 
                    product:products (name, image_url, sku, price)
                )
            `)
            .eq('id', orderId)
            .single();

        if (error) throw error;
        if (!order) throw new Error('Orden no encontrada');

        // Calcular el total de la orden
        const orderTotal = order.order_items.reduce((total, item) => {
            return total + (item.quantity * (item.product?.price || 0));
        }, 0);

        // Formatear la fecha
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Mapear el estado a un texto legible
        const statusText = {
            'pending': 'Pendiente',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        }[order.status] || order.status;

        // Construir el HTML de los items de la orden
        const orderItemsHtml = order.order_items && order.order_items.length > 0 
            ? order.order_items.map(item => `
                <div class="flex items-center space-x-4 py-4 border-b border-gray-200">
                    <img src="${item.product?.image_url || 'https://via.placeholder.com/64'}" 
                         alt="${item.product?.name || 'Producto'}" 
                         class="h-16 w-16 object-cover rounded">
                    <div class="flex-1">
                        <h4 class="text-sm font-medium text-gray-900">${item.product?.name || 'Producto no disponible'}</h4>
                        <p class="text-sm text-gray-500">SKU: ${item.product?.sku || 'N/A'}</p>
                        <p class="text-sm text-gray-500">Cantidad: ${item.quantity}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium text-gray-900">
                            $${(item.product?.price || 0).toFixed(2)} c/u
                        </p>
                        <p class="text-sm font-medium text-gray-900">
                            Total: $${(item.quantity * (item.product?.price || 0)).toFixed(2)}
                        </p>
                    </div>
                </div>
            `).join('')
            : '<p class="text-sm text-gray-500 py-4">No hay productos en esta orden</p>';

        // Construir el HTML de la dirección de envío
        const shippingAddress = order.shipping_address ? 
            JSON.parse(order.shipping_address) : 
            { street: '', city: '', state: '', postal_code: '', country: '' };

        const shippingAddressHtml = `
            <p class="text-sm text-gray-700">${shippingAddress.street || 'No especificada'}</p>
            <p class="text-sm text-gray-700">${shippingAddress.city || ''}${shippingAddress.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress.postal_code || ''}</p>
            <p class="text-sm text-gray-700">${shippingAddress.country || ''}</p>
        `;

        // Construir el HTML completo del modal
        const detailsHtml = `
            <div class="space-y-6">
                <!-- Información del cliente -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="text-lg font-medium text-gray-900 mb-3">Información del Cliente</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Nombre</h4>
                            <p class="mt-1 text-sm text-gray-900">${order.buyer?.name || 'No disponible'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Correo Electrónico</h4>
                            <p class="mt-1 text-sm text-gray-900">${order.buyer?.email || 'No disponible'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Teléfono</h4>
                            <p class="mt-1 text-sm text-gray-900">${order.buyer?.phone || 'No disponible'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Estado</h4>
                            <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(order.status)} capitalize">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Dirección de envío -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="text-lg font-medium text-gray-900 mb-3">Dirección de Envío</h3>
                    <div class="text-sm text-gray-700">
                        ${shippingAddressHtml}
                    </div>
                </div>

                <!-- Resumen de la orden -->
                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-3">Resumen de la Orden</h3>
                    <div class="bg-white shadow overflow-hidden sm:rounded-md">
                        ${orderItemsHtml}
                        <div class="bg-gray-50 px-4 py-4 sm:px-6">
                            <div class="flex justify-between text-base font-medium text-gray-900">
                                <p>Total</p>
                                <p>$${orderTotal.toFixed(2)}</p>
                            </div>
                            <p class="mt-0.5 text-sm text-gray-500">Incluye impuestos y envío</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Acciones -->
            <div class="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button type="button" 
                        class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onclick="bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal')).hide()">
                    Cerrar
                </button>
                ${order.status === 'pending' ? `
                    <button type="button" 
                            class="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            onclick="markOrderAsCompleted('${order.id}')">
                        Marcar como Completado
                    </button>
                    <button type="button" 
                            class="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            onclick="cancelOrder('${order.id}')">
                        Cancelar Orden
                    </button>
                ` : ''}
            </div>
        `;

        // Actualizar el contenido del modal y mostrarlo
        const modalContent = document.getElementById('order-details-content');
        if (modalContent) {
            modalContent.innerHTML = detailsHtml;
            
            // Inicializar el modal de Bootstrap
            const modalElement = document.getElementById('orderDetailsModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            }
        }
    } catch (error) {
        console.error('Error al cargar los detalles de la orden:', error);
        showError('No se pudieron cargar los detalles de la orden: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para actualizar el botón de filtro activo
function updateActiveFilterButton(activeFilter) {
    // Remover la clase activa de todos los botones
    const filterButtons = [
        document.getElementById('filter-all'),
        document.getElementById('filter-pending'),
        document.getElementById('filter-completed'),
        document.getElementById('filter-cancelled')
    ];
    
    filterButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        }
    });
    
    // Agregar la clase activa al botón correspondiente
    let activeButton = null;
    switch(activeFilter.toLowerCase()) {
        case 'all':
            activeButton = document.getElementById('filter-all');
            break;
        case 'pendiente':
        case 'pending':
            activeButton = document.getElementById('filter-pending');
            break;
        case 'entregado':
        case 'completed':
            activeButton = document.getElementById('filter-completed');
            break;
        case 'cancelado':
        case 'cancelled':
            activeButton = document.getElementById('filter-cancelled');
            break;
    }
    
    if (activeButton) {
        activeButton.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50');
        activeButton.classList.add('bg-blue-600', 'text-white');
    }
}

// Función para inicializar la aplicación
async function initApp() {
    try {
        // Inicializar elementos del DOM
        initElements();
        
        // Configurar manejadores de eventos
        setupEventListeners();
        
        // Establecer el filtro activo inicial
        updateActiveFilterButton(currentFilter);
        
        // Cargar las órdenes iniciales
        await loadOrders();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Error al inicializar la aplicación: ' + error.message);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Función auxiliar para actualizar el estado con múltiples intentos
async function updateOrderStatusWithRetry(orderId, status, currentStatus) {
    try {
        console.log(`Intentando actualizar orden ${orderId} a estado:`, status);
        
        // 1. Actualizar el estado en la base de datos
        const { data, error } = await window.supabase
            .from('orders')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select();
            
        if (error) {
            console.error('Error al actualizar el estado:', error);
            return { data: null, error };
        }
        
        // 2. Registrar la acción en el log de auditoría
        const { error: logError } = await window.supabase
            .from('audit_logs')
            .insert({
                action: 'update_order_status',
                table_name: 'orders',
                record_id: orderId,
                old_value: currentStatus,
                new_value: status,
                user_id: (await window.supabase.auth.getUser()).data.user?.id,
                details: `Estado cambiado de "${currentStatus}" a "${status}"`
            });
            
        if (logError) {
            console.error('Error al registrar en el log de auditoría:', logError);
            // No lanzamos error aquí para no interrumpir el flujo principal
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Error en updateOrderStatusWithRetry:', error);
        return { data: null, error };
    }
}

// Función auxiliar para intentar actualizar con diferentes variantes de estado
async function updateWithStatusVariants(orderId, newStatus, allowedStatuses) {
    console.log('Intentando actualizar con variantes de estado. Permitidos:', allowedStatuses);
    
    // Crear variantes del estado
    const statusVariants = [
        newStatus,
        newStatus.toLowerCase(),
        newStatus.toUpperCase(),
        newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase()
    ];
    
    // Agregar traducciones si es necesario
    if (newStatus.toLowerCase() === 'completed') {
        statusVariants.push('completada', 'Completada');
    } else if (newStatus.toLowerCase() === 'cancelled') {
        statusVariants.push('cancelada', 'Cancelada');
    } else if (newStatus.toLowerCase() === 'pending') {
        statusVariants.push('pendiente', 'Pendiente');
    }
    
    // Eliminar duplicados
    const uniqueVariants = [...new Set(statusVariants)];
    console.log('Variantes a probar:', uniqueVariants);
    
    // Probar cada variante
    for (const variant of uniqueVariants) {
        try {
            console.log('Intentando con estado:', variant);
            
            // 1. Primero intentamos con la función RPC
            try {
                const { data: rpcData, error: rpcError } = await window.supabase
                    .rpc('update_order_status', {
                        p_order_id: orderId,
                        p_new_status: variant
                    });
                
                if (!rpcError) {
                    console.log('Estado actualizado exitosamente con RPC:', variant);
                    // Verificar si la actualización fue realmente exitosa
                    const { data: orderData, error: fetchError } = await window.supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single();
                    
                    if (!fetchError) {
                        console.log('Estado actual en la base de datos:', orderData.status);
                        return orderData;
                    }
                } else {
                    console.log('Error en RPC:', rpcError);
                }
            } catch (rpcError) {
                console.log('Excepción en RPC:', rpcError);
            }
            
            // 2. Si la función RPC falla, intentamos con el método directo
            console.log('Intentando actualización directa...');
            const { data, error } = await window.supabase
                .from('orders')
                .update({ 
                    status: variant,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select();
            
            if (!error && data && data.length > 0) {
                console.log('Estado actualizado exitosamente con método directo:', variant);
                return data[0];
            }
            
            console.log('Error al actualizar estado:', error || 'Error desconocido');
            
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            // Continuar con la siguiente variante
        }
    }
    
    // Si llegamos aquí, ninguna variante funcionó
    throw new Error(`No se pudo actualizar el estado. Valores permitidos: ${allowedStatuses.join(', ')}`);
}

// Función para obtener los valores del enum de la columna status
async function getStatusEnumValues() {
    try {
        // Consultar los valores del enum de la columna status
        const { data, error } = await window.supabase.rpc('get_enum_values', {
            enum_name: 'order_status'
        });
        
        if (error) {
            console.error('Error al obtener valores del enum:', error);
            return null;
        }
        
        console.log('Valores del enum order_status:', data);
        return data;
    } catch (error) {
        console.error('Error en getStatusEnumValues:', error);
        return null;
    }
}

// Función para verificar las restricciones de la tabla orders
async function checkTableConstraints() {
    try {
        // Consultar las restricciones de la tabla orders
        const { data, error } = await window.supabase.rpc('get_table_constraints', {
            table_name: 'orders'
        });
        
        if (error) {
            console.error('Error al obtener restricciones:', error);
            return null;
        }
        
        console.log('Restricciones de la tabla orders:', data);
        return data;
    } catch (error) {
        console.error('Error en checkTableConstraints:', error);
        return null;
    }
}

// Función para obtener los estados únicos de la base de datos
async function getUniqueStatuses() {
    try {
        const { data, error } = await window.supabase
            .from('orders')
            .select('status')
            .not('status', 'is', null);
            
        if (error) throw error;
        
        // Extraer valores únicos
        const uniqueStatuses = [...new Set(data.map(item => item.status))];
        console.log('Estados únicos en la base de datos:', uniqueStatuses);
        return uniqueStatuses;
    } catch (error) {
        console.error('Error al obtener estados únicos:', error);
        return [];
    }
}

// Función para actualizar el estado de una orden
async function updateOrderStatus(orderId, newStatus) {
    try {
        showLoading(true);
        console.log('Iniciando actualización de estado:', { orderId, newStatus });
        
        // 1. Definir los estados permitidos exactamente como están en la base de datos
        const allowedStatuses = ['Pendiente', 'Entregado'];
        console.log('Estados permitidos en la base de datos:', allowedStatuses);
        
        // 2. Mapeo de estados para mostrar al usuario
        const statusLabels = {
            // Estados principales
            'Pendiente': 'Pendiente',
            'Entregado': 'Entregado',
            // Mantener compatibilidad con minúsculas
            'pendiente': 'Pendiente',
            'entregado': 'Entregado',
            // Compatibilidad con estados en inglés
            'pending': 'Pendiente',
            'completed': 'Entregado',
            'delivered': 'Entregado'
        };
        
        // 3. Mapeo de estados de UI a BD (para compatibilidad)
        const statusToDB = {
            // Estados en minúsculas a mayúsculas
            'pendiente': 'Pendiente',
            'entregado': 'Entregado',
            // Estados en mayúsculas
            'Pendiente': 'Pendiente',
            'Entregado': 'Entregado',
            // Mapeo de estados en inglés a español
            'pending': 'Pendiente',
            'completed': 'Entregado',
            'delivered': 'Entregado'
        };
        
        // 4. Normalizar el estado
        const normalizedNewStatus = newStatus.toLowerCase();
        const dbStatus = statusToDB[normalizedNewStatus] || normalizedNewStatus;
        
        console.log('Estado normalizado:', normalizedNewStatus);
        console.log('Estado para BD:', dbStatus);
        console.log('Estados permitidos:', allowedStatuses);
        
        // 5. Verificar que el estado sea válido
        if (!allowedStatuses.includes(dbStatus)) {
            const errorMsg = `El estado "${newStatus}" no es válido. Los estados permitidos son: ${Object.entries(statusLabels).map(([key, value]) => `${key} (${value})`).join(', ')}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        // 6. Obtener la orden actual para registrar el cambio
        const { data: orderData, error: orderError } = await window.supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
            
        if (orderError) {
            console.error('Error al obtener la orden:', orderError);
            throw new Error('No se pudo obtener la información de la orden');
        }
        
        const currentOrder = orderData;
        console.log('Datos actuales de la orden:', {
            id: currentOrder.id,
            status: currentOrder.status,
            status_type: typeof currentOrder.status,
            status_length: currentOrder.status?.length,
            status_chars: currentOrder.status?.split('').map(c => c.charCodeAt(0)),
            all_fields: Object.entries(currentOrder).filter(([_, v]) => v !== null)
        });
        
        // 7. Mostrar confirmación al usuario
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Deseas cambiar el estado de la orden #${orderId.slice(0, 8)} a "${statusLabels[dbStatus] || dbStatus}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cambiar estado',
            cancelButtonText: 'Cancelar',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    // 8. Actualizar el estado en la base de datos
                    const updateData = { 
                        status: dbStatus.trim(),
                        updated_at: new Date().toISOString()
                    };
                    
                    console.log('Datos a actualizar:', JSON.stringify(updateData, null, 2));
                    
                    const { data, error } = await window.supabase
                        .from('orders')
                        .update(updateData)
                        .eq('id', orderId)
                        .select()
                        .single();
                        
                    console.log('Respuesta de la actualización:', { 
                        data, 
                        error,
                        status: error?.status,
                        code: error?.code,
                        message: error?.message,
                        details: error?.details
                    });
                    
                    if (error) {
                        console.error('Error al actualizar el estado:', error);
                        throw new Error('No se pudo actualizar el estado de la orden');
                    }
                    
                    // Registrar en el log de auditoría
                    const { error: logError } = await window.supabase
                        .from('audit_logs')
                        .insert({
                            action: 'update_order_status',
                            table_name: 'orders',
                            record_id: orderId,
                            old_value: currentOrder.status,
                            new_value: dbStatus,
                            details: `Estado cambiado de "${currentOrder.status}" a "${dbStatus}" (seleccionado: ${normalizedNewStatus})`,
                            user_id: (await window.supabase.auth.getUser()).data.user?.id
                        });
                    
                    if (logError) {
                        console.error('Error al registrar en el log de auditoría:', logError);
                        // No lanzamos error para no interrumpir el flujo principal
                    }
                    
                    return data?.[0];
                } catch (error) {
                    console.error('Error en preConfirm:', error);
                    Swal.showValidationMessage(`Error: ${error.message}`);
                    return null;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        });
        
        if (result.isConfirmed) {
            if (result.value) {
                showSuccess(`Orden #${orderId.slice(0, 8)} actualizada correctamente`);
                await loadOrders();
                
                // Cerrar el modal de detalles si está abierto
                const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
                if (modal) {
                    modal.hide();
                }
                
                return result.value;
            } else {
                // Restaurar el valor anterior en el select
                const select = document.querySelector(`#status-${orderId}`);
                if (select) {
                    select.value = currentOrder.status;
                }
                throw new Error('No se pudo actualizar el estado de la orden');
            }
        } else {
            // Si el usuario cancela, restaurar el valor anterior en el select
            const select = document.querySelector(`#status-${orderId}`);
            if (select) {
                select.value = currentOrder.status;
            }
        }
    } catch (error) {
        console.error('Error en updateOrderStatus:', error);
        showError('Error al actualizar el estado de la orden: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para marcar una orden como completada (mantenida por compatibilidad)
async function markOrderAsCompleted(orderId) {
    // Usamos 'delivered' en lugar de 'completed' porque es uno de los estados permitidos
    console.log('Marcando orden como entregada (delivered):', orderId);
    await updateOrderStatus(orderId, 'delivered');
}

// Función para cancelar una orden (mantenida por compatibilidad)
async function cancelOrder(orderId) {
    await updateOrderStatus(orderId, 'cancelled');
}