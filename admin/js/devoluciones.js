// Elementos del menú móvil y de usuario
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const closeMobileMenu = document.getElementById('close-mobile-menu');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const notificationsButton = document.getElementById('notifications-button');
const notificationsDropdown = document.getElementById('notifications-dropdown');
const userMenuButton = document.getElementById('user-menu-button');
const userDropdown = document.getElementById('user-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const mobileLogoutBtn = document.getElementById('logout-btn-mobile');
const userNameElement = document.getElementById('user-name');
const userInitialsElement = document.getElementById('user-initials');
const userAvatarElement = document.getElementById('user-avatar');
const dropdownUserName = document.getElementById('dropdown-user-name');
const dropdownUserEmail = document.getElementById('dropdown-user-email');

// Estado del menú
let isMobileMenuOpen = false;

// Función para configurar el menú móvil
function setupMobileMenu() {
    if (!mobileMenuButton || !mobileMenu || !closeMobileMenu || !mobileMenuOverlay) {
        console.error('Elementos del menú móvil no encontrados');
        return;
    }

    // Abrir menú
    mobileMenuButton.addEventListener('click', (e) => {
        e.preventDefault();
        isMobileMenuOpen = true;
        mobileMenu.classList.add('open');
        mobileMenuOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    // Cerrar menú con el botón de cerrar
    closeMobileMenu.addEventListener('click', (e) => {
        e.preventDefault();
        isMobileMenuOpen = false;
        mobileMenu.classList.remove('open');
        mobileMenuOverlay.classList.remove('open');
        document.body.style.overflow = '';
    });

    // Cerrar menú al hacer clic en el overlay
    mobileMenuOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        isMobileMenuOpen = false;
        mobileMenu.classList.remove('open');
        mobileMenuOverlay.classList.remove('open');
        document.body.style.overflow = '';
    });
}

// Estado de la aplicación
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let currentFilter = 'all';
let storeId = null;
let searchQuery = '';

// Referencias a elementos del DOM
let returnsTableBody, loading, currentPageInput, totalItemsSpan, showingFromSpan, showingToSpan;
let totalPagesSpan, prevPageBtn, nextPageBtn, searchReturnsInput;
let filterAllBtn, filterPendingBtn, filterApprovedBtn, filterRejectedBtn, filterCompletedBtn;

// Función para inicializar elementos del DOM
function initElements() {
    // Obtener referencias a los elementos del DOM
    returnsTableBody = document.getElementById('returnsTableBody');
    loading = document.getElementById('loading');
    currentPageInput = document.getElementById('currentPage');
    totalItemsSpan = document.getElementById('totalItems');
    showingFromSpan = document.getElementById('showingFrom');
    showingToSpan = document.getElementById('showingTo');
    totalPagesSpan = document.getElementById('totalPages');
    prevPageBtn = document.getElementById('prevPage');
    nextPageBtn = document.getElementById('nextPage');
    searchReturnsInput = document.getElementById('searchReturns');
    filterAllBtn = document.getElementById('filterAll');
    filterPendingBtn = document.getElementById('filterPending');
    filterApprovedBtn = document.getElementById('filterApproved');
    filterRejectedBtn = document.getElementById('filterRejected');
    filterCompletedBtn = document.getElementById('filterCompleted');

    // Configurar manejadores de eventos
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
    if (searchReturnsInput) {
        searchReturnsInput.addEventListener('input', debounce(() => {
            searchQuery = searchReturnsInput.value.trim();
            currentPage = 1;
            loadReturns();
        }, 300));
    }
    
    // Configurar manejadores de eventos para los filtros
    if (filterAllBtn) filterAllBtn.addEventListener('click', () => setFilter('all'));
    if (filterPendingBtn) filterPendingBtn.addEventListener('click', () => setFilter('Pendiente'));
    if (filterApprovedBtn) filterApprovedBtn.addEventListener('click', () => setFilter('Aprobada'));
    if (filterRejectedBtn) filterRejectedBtn.addEventListener('click', () => setFilter('Rechazada'));
    if (filterCompletedBtn) filterCompletedBtn.addEventListener('click', () => setFilter('Completada'));
}

// Configurar manejadores de eventos
function setupEventListeners() {
    try {
        // Evento de búsqueda
        if (searchReturnsInput) {
            searchReturnsInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                currentPage = 1;
                loadReturns();
            });
        }

        // Filtros
        if (filterAllBtn) {
            filterAllBtn.addEventListener('click', () => {
                currentFilter = 'all';
                currentPage = 1;
                updateActiveFilterButton('all');
                loadReturns();
            });
        }
        
        if (filterPendingBtn) {
            filterPendingBtn.addEventListener('click', () => {
                currentFilter = 'Pendiente';
                currentPage = 1;
                updateActiveFilterButton('Pendiente');
                loadReturns();
            });
        }
        
        if (filterApprovedBtn) {
            filterApprovedBtn.addEventListener('click', () => {
                currentFilter = 'Aprobada';
                currentPage = 1;
                updateActiveFilterButton('Aprobada');
                loadReturns();
            });
        }
        
        if (filterRejectedBtn) {
            filterRejectedBtn.addEventListener('click', () => {
                currentFilter = 'Rechazada';
                currentPage = 1;
                updateActiveFilterButton('Rechazada');
                loadReturns();
            });
        }
        
        if (filterCompletedBtn) {
            filterCompletedBtn.addEventListener('click', () => {
                currentFilter = 'Completada';
                currentPage = 1;
                updateActiveFilterButton('Completada');
                loadReturns();
            });
        }
        
        // Paginación
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => { 
                if (currentPage > 1) { 
                    currentPage--; 
                    loadReturns(); 
                } 
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => { 
                if (currentPage < Math.ceil(totalItems / itemsPerPage)) { 
                    currentPage++; 
                    loadReturns(); 
                } 
            });
        }
        
        if (currentPageInput) {
            currentPageInput.addEventListener('change', () => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const newPage = parseInt(currentPageInput.value);
                if (newPage > 0 && newPage <= totalPages) {
                    currentPage = newPage;
                    loadReturns();
                } else {
                    currentPageInput.value = currentPage;
                }
            });
        }
        
        // Botón de nueva devolución
        const newReturnBtn = document.getElementById('new-return-btn');
        if (newReturnBtn) {
            newReturnBtn.addEventListener('click', showNewReturnModal);
        }
        
        // Formulario de nueva devolución
        const newReturnForm = document.getElementById('new-return-form');
        if (newReturnForm) {
            newReturnForm.addEventListener('submit', (e) => {
                e.preventDefault();
                createReturn();
            });
        }
        
    } catch (error) {
        console.error('Error en setupEventListeners:', error);
        showError('Error al configurar los eventos: ' + error.message);
    }
}

// Función para mostrar/ocultar el indicador de carga
function showLoading(show = true) {
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
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
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado');
        }

        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
            window.location.href = '/login.html';
            return null;
        }
        
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
        
        if (error.message.includes('authentication') || error.message.includes('No hay usuario autenticado')) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
        
        return null;
    }
}

// Cargar devoluciones
async function loadReturns() {
    try {
        showLoading(true);
        
        // Obtener el ID de la tienda
        storeId = await getUserStoreId();
        if (!storeId) return;
        
        console.log('Cargando devoluciones para storeId:', storeId);
        console.log('Filtro actual:', currentFilter);
        console.log('Término de búsqueda:', searchQuery);
        
        // Obtener las devoluciones con la información básica
        let query = supabase
            .from('returns')
            .select('*', { count: 'exact' })
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
        
        // Aplicar filtros
        if (currentFilter !== 'all') {
            query = query.eq('status', currentFilter);
        }
        
        console.log('Ejecutando consulta de devoluciones...');
        const { data: returns, error, count } = await query;
        
        if (error) {
            console.error('Error en la consulta de devoluciones:', error);
            throw error;
        }
        
        console.log('Devoluciones obtenidas:', returns);
        
        // Si no hay devoluciones, renderizar lista vacía
        if (!returns || returns.length === 0) {
            console.log('No se encontraron devoluciones');
            renderReturns([]);
            updatePaginationUI(0, 0);
            return;
        }
        
        // Aplicar filtro de búsqueda si existe
        let filteredReturns = returns;
        if (searchQuery) {
            const search = searchQuery.toLowerCase().trim();
            filteredReturns = returns.filter(ret => {
                const orderId = ret.order_id?.toLowerCase() || '';
                const reason = ret.reason?.toLowerCase() || '';
                const description = ret.description?.toLowerCase() || '';
                const status = ret.status?.toLowerCase() || '';
                const refundMethod = ret.refund_method?.toLowerCase() || '';
                const returnId = ret.id?.toLowerCase() || '';
                
                return orderId.includes(search) || 
                       reason.includes(search) ||
                       description.includes(search) ||
                       status.includes(search) ||
                       refundMethod.includes(search) ||
                       returnId.includes(search);
            });
        }
        
        console.log('Devoluciones filtradas:', filteredReturns);
        
        // Actualizar la interfaz
        totalItems = count || 0;
        updatePaginationUI(totalItems, Math.ceil(totalItems / itemsPerPage));
        renderReturns(filteredReturns);
        
    } catch (error) {
        console.error('Error al cargar las devoluciones:', error);
        showError('Error al cargar las devoluciones: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para formatear fechas
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para formatear montos monetarios
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

// Función para obtener la clase CSS según el estado
function getReturnStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'aprobada':
            return 'bg-green-100 text-green-800';
        case 'rechazada':
            return 'bg-red-100 text-red-800';
        case 'pendiente':
            return 'bg-yellow-100 text-yellow-800';
        case 'completada':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Función para renderizar las devoluciones en la tabla
function renderReturns(returns) {
    if (!returnsTableBody) return;
    
    returnsTableBody.innerHTML = '';
    
    if (returns.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="text-center py-4 text-gray-500">
                No se encontraron devoluciones
            </td>
        `;
        returnsTableBody.appendChild(row);
        return;
    }
    
    returns.forEach(ret => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Estado con color
        const statusClass = getReturnStatusClass(ret.status);
        
        // Formatear información bancaria si existe
        let bankInfo = 'No especificada';
        if (ret.bank_account_info) {
            try {
                const bankData = typeof ret.bank_account_info === 'string' ? 
                    JSON.parse(ret.bank_account_info) : ret.bank_account_info;
                bankInfo = `Banco: ${bankData.bank_name || 'N/A'}, Cuenta: ${bankData.account_number || 'N/A'}`;
            } catch (e) {
                console.error('Error al parsear bank_account_info:', e);
                bankInfo = 'Información bancaria no disponible';
            }
        }
        
        row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="font-medium text-gray-900">
                    #${ret.id.substring(0, 8).toUpperCase()}
                </div>
                <div class="text-gray-500 text-xs">
                    ${formatDate(ret.return_date)}
                </div>
            </td>
            <td class="px-4 py-3">
                <div class="text-sm text-gray-900 order-reason-cell">
                    Orden: ${ret.order_id || 'N/A'}
                </div>
                <div class="text-xs text-gray-500 order-reason-cell">
                    ${ret.reason || 'Sin razón especificada'}
                </div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <div class="text-gray-900">${formatCurrency(ret.refund_amount)}</div>
                <div class="text-xs text-gray-500">${ret.refund_method || 'Método no especificado'}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                    ${ret.status || 'Pendiente'}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                <div class="text-xs">${bankInfo}</div>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="showReturnDetails('${ret.id}')" 
                        class="text-indigo-600 hover:text-indigo-900 mr-3"
                        title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${ret.status === 'Pendiente' ? `
                    <button onclick="approveReturn('${ret.id}')" 
                            class="text-green-600 hover:text-green-900 mr-2"
                            title="Aprobar devolución">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="rejectReturn('${ret.id}')" 
                            class="text-red-600 hover:text-red-900"
                            title="Rechazar devolución">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                ${ret.admin_notes ? `
                    <button onclick="showAdminNotes('${ret.id}')" 
                            class="text-yellow-600 hover:text-yellow-900 ml-2"
                            title="Ver notas del administrador">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                ` : ''}
            </td>
        `;
        
        returnsTableBody.appendChild(row);
    });
}

// Función para mostrar las notas del administrador
function showAdminNotes(returnId) {
    // Aquí puedes implementar la lógica para mostrar las notas del administrador
    // Por ejemplo, usando un modal de SweetAlert2
    const returnItem = returns.find(r => r.id === returnId);
    if (returnItem?.admin_notes) {
        Swal.fire({
            title: 'Notas del Administrador',
            text: returnItem.admin_notes,
            icon: 'info',
            confirmButtonText: 'Cerrar'
        });
    } else {
        Swal.fire({
            title: 'Sin notas',
            text: 'No hay notas del administrador para esta devolución.',
            icon: 'info',
            confirmButtonText: 'Cerrar'
        });
    }
}

// Función para actualizar la interfaz de paginación
function updatePaginationUI(totalItems, totalPages) {
    if (!totalItemsSpan || !showingFromSpan || !showingToSpan || !totalPagesSpan || !currentPageInput) return;
    
    const from = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const to = Math.min(currentPage * itemsPerPage, totalItems);
    
    totalItemsSpan.textContent = totalItems;
    showingFromSpan.textContent = from;
    showingToSpan.textContent = to;
    totalPagesSpan.textContent = Math.ceil(totalItems / itemsPerPage);
    currentPageInput.value = currentPage;
    
    // Habilitar/deshabilitar botones de paginación
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

// Función para actualizar el botón de filtro activo
function updateActiveFilterButton(activeFilter) {
    const buttons = [
        { id: 'all', element: filterAllBtn },
        { id: 'Pendiente', element: filterPendingBtn },
        { id: 'Aprobada', element: filterApprovedBtn },
        { id: 'Rechazada', element: filterRejectedBtn },
        { id: 'Completada', element: filterCompletedBtn }
    ];
    
    buttons.forEach(btn => {
        if (btn.element) {
            if (btn.id === activeFilter) {
                btn.element.classList.add('bg-blue-600', 'text-white');
                btn.element.classList.remove('bg-white', 'text-gray-700');
            } else {
                btn.element.classList.remove('bg-blue-600', 'text-white');
                btn.element.classList.add('bg-white', 'text-gray-700');
            }
        }
    });
}

// Función para obtener la clase CSS según el estado
function getStatusClass(status) {
    switch (status) {
        case 'Pendiente':
            return 'bg-yellow-100 text-yellow-800';
        case 'Aprobada':
            return 'bg-green-100 text-green-800';
        case 'Rechazada':
            return 'bg-red-100 text-red-800';
        case 'Completada':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Función para mostrar el modal de nueva devolución
function showNewReturnModal() {
    // Implementar lógica para mostrar el modal de nueva devolución
    console.log('Mostrar modal de nueva devolución');
}

// Función para mostrar los detalles de una devolución
async function showReturnDetails(returnId) {
    try {
        showLoading(true);
        
        // Obtener solo los datos de la devolución sin relaciones
        const { data: returnItem, error } = await supabase
            .from('returns')
            .select('*')
            .eq('id', returnId)
            .single();
            
        if (error) throw error;
        
        // Obtener información del usuario que resolvió la devolución (si existe)
        let resolvedByEmail = 'N/A';
        if (returnItem.resolved_by) {
            const { data: resolvedByUser } = await supabase
                .from('users')
                .select('email')
                .eq('id', returnItem.resolved_by)
                .single();
                
            if (resolvedByUser) {
                resolvedByEmail = resolvedByUser.email;
            }
        }
        
        // Formatear fechas
        const formattedDate = returnItem.return_date ? new Date(returnItem.return_date).toLocaleString('es-ES') : 'N/A';
        const updatedDate = returnItem.updated_at ? new Date(returnItem.updated_at).toLocaleString('es-ES') : 'N/A';
        
        // Formatear información bancaria si existe
        let bankInfo = 'No especificada';
        if (returnItem.bank_account_info) {
            try {
                const bankData = typeof returnItem.bank_account_info === 'string' ? 
                    JSON.parse(returnItem.bank_account_info) : returnItem.bank_account_info;
                bankInfo = `
                    <p class="text-sm"><strong>Banco:</strong> ${bankData.bank_name || 'N/A'}</p>
                    <p class="text-sm"><strong>Tipo de cuenta:</strong> ${bankData.account_type || 'N/A'}</p>
                    <p class="text-sm"><strong>Número de cuenta:</strong> ${bankData.account_number || 'N/A'}</p>
                    <p class="text-sm"><strong>Nombre del titular:</strong> ${bankData.account_holder || 'N/A'}</p>
                    <p class="text-sm"><strong>Identificación:</strong> ${bankData.identification || 'N/A'}</p>
                `;
            } catch (e) {
                console.error('Error al parsear bank_account_info:', e);
                bankInfo = 'Información bancaria no disponible';
            }
        }
        
        // Construir el contenido del modal
        let modalContent = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm font-medium text-gray-500">ID de Devolución</p>
                        <p class="mt-1 text-sm text-gray-900">${returnItem.id}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">ID de Orden</p>
                        <p class="mt-1 text-sm text-gray-900">${returnItem.order_id || 'N/A'}</p>
                    </div>
                    <div class="md:col-span-2">
                        <p class="text-sm font-medium text-gray-500">Razón de la Devolución</p>
                        <p class="mt-1 text-sm text-gray-900">${returnItem.reason || 'No especificado'}</p>
                    </div>
                    <div class="md:col-span-2">
                        <p class="text-sm font-medium text-gray-500">Descripción</p>
                        <p class="mt-1 text-sm text-gray-900">${returnItem.description || 'Sin descripción'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Estado</p>
                        <span class="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReturnStatusClass(returnItem.status)}">
                            ${returnItem.status || 'Pendiente'}
                        </span>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Método de Reembolso</p>
                        <p class="mt-1 text-sm text-gray-900">${returnItem.refund_method || 'No especificado'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Monto del Reembolso</p>
                        <p class="mt-1 text-sm text-gray-900">${formatCurrency(returnItem.refund_amount)}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Fecha de Creación</p>
                        <p class="mt-1 text-sm text-gray-900">${formattedDate}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Última Actualización</p>
                        <p class="mt-1 text-sm text-gray-900">${updatedDate}</p>
                    </div>
                    ${returnItem.resolved_by ? `
                        <div>
                            <p class="text-sm font-medium text-gray-500">Resuelto por</p>
                            <p class="mt-1 text-sm text-gray-900">${resolvedByEmail}</p>
                        </div>
                    ` : ''}
                    <div class="md:col-span-2">
                        <p class="text-sm font-medium text-gray-500">Notas del Administrador</p>
                        <div class="mt-1">
                            <textarea 
                                id="adminNotesInput" 
                                class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                                rows="3" 
                                placeholder="Agregar notas sobre esta devolución..."
                            >${returnItem.admin_notes || ''}</textarea>
                            <div class="flex justify-end mt-2">
                                <button 
                                    onclick="updateAdminNotes('${returnItem.id}')" 
                                    class="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    Guardar Notas
                                </button>
                            </div>
                        </div>
                        ${returnItem.admin_notes ? `
                            <div class="mt-2 p-2 bg-yellow-50 rounded-md">
                                <p class="text-xs text-gray-500">Nota actual:</p>
                                <p class="text-sm text-gray-900">${returnItem.admin_notes}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="md:col-span-2">
                        <p class="text-sm font-medium text-gray-500">Información Bancaria</p>
                        <div class="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                            ${bankInfo}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar el modal con SweetAlert2
        await Swal.fire({
            title: 'Detalles de la Devolución',
            html: modalContent,
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            width: '800px',
            padding: '2rem'
        });
        
    } catch (error) {
        console.error('Error al cargar los detalles de la devolución:', error);
        showError('Error al cargar los detalles de la devolución: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para actualizar las notas del administrador
async function updateAdminNotes(returnId) {
    try {
        const notes = document.getElementById('adminNotesInput').value;
        
        const { error } = await supabase
            .from('returns')
            .update({ 
                admin_notes: notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', returnId);
            
        if (error) throw error;
        
        // Mostrar mensaje de éxito
        showSuccess('Notas actualizadas correctamente');
        
        // Recargar los detalles de la devolución para mostrar los cambios
        setTimeout(() => {
            showReturnDetails(returnId);
        }, 1000);
        
    } catch (error) {
        console.error('Error al actualizar las notas:', error);
        showError('Error al actualizar las notas: ' + (error.message || 'Error desconocido'));
    }
}

// Función para aprobar una devolución
async function approveReturn(returnId) {
    try {
        const { value: adminNotes } = await Swal.fire({
            title: '¿Aprobar devolución?',
            text: '¿Está seguro de que desea aprobar esta devolución?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar',
            input: 'textarea',
            inputLabel: 'Notas del administrador (opcional)',
            inputPlaceholder: 'Ingrese cualquier nota adicional sobre esta devolución...',
            inputAttributes: {
                'aria-label': 'Notas del administrador'
            }
        });
        
        if (adminNotes === undefined) return; // Usuario canceló
        
        showLoading(true);
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        // Obtener la devolución actual
        const { data: returnData, error: fetchError } = await supabase
            .from('returns')
            .select('*')
            .eq('id', returnId)
            .single();
            
        if (fetchError || !returnData) {
            throw new Error('No se pudo encontrar la devolución');
        }
        
        // Verificar que la devolución está pendiente
        if (returnData.status !== 'Pendiente') {
            throw new Error('La devolución ya fue procesada anteriormente');
        }
        
        // Verificar la orden
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('status')
            .eq('id', returnData.order_id)
            .single();
            
        if (orderError || !orderData) {
            throw new Error('No se pudo verificar el estado de la orden');
        }
        
        if (orderData.status !== 'Entregado') {
            throw new Error('Solo se pueden devolver órdenes en estado "Entregado"');
        }
        
        // Actualizar el stock de los productos
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', returnData.order_id);
            
        if (itemsError) throw itemsError;
        
        // Actualizar cada producto
        for (const item of orderItems) {
            // Primero obtener el stock actual
            const { data: productData, error: fetchError } = await supabase
                .from('products')
                .select('stock')
                .eq('id', item.product_id)
                .eq('store_id', returnData.store_id)
                .single();
                
            if (fetchError) {
                console.error('Error al obtener stock actual:', fetchError);
                continue; // Continuar con el siguiente producto
            }
            
            // Calcular nuevo stock
            const currentStock = productData?.stock || 0;
            const newStock = currentStock + item.quantity;
            
            // Actualizar el stock
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    stock: newStock,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.product_id)
                .eq('store_id', returnData.store_id);
                
            if (updateError) {
                console.error('Error al actualizar stock:', updateError);
                throw new Error('No se pudo actualizar el stock del producto');
            }
        }
        
        // Formatear la fecha
        const formattedDate = new Date().toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Actualizar la devolución
        const { data: updatedReturn, error: updateError } = await supabase
            .from('returns')
            .update({
                status: 'Aprobada',
                admin_notes: `[Aprobado el ${formattedDate} por ${user.email}]\n${adminNotes || ''}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', returnId)
            .select();
            
        if (updateError) throw updateError;

        console.log('Devolución aprobada exitosamente:', updatedReturn);
        
        // Recargar las devoluciones para reflejar los cambios
        await loadReturns();
        
        // Cerrar el modal si está abierto
        const modalEl = document.getElementById('returnDetailsModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) {
                modal.hide();
            }
        }
        
        // Mostrar mensaje de éxito
        showSuccess('La devolución ha sido aprobada exitosamente');
        
    } catch (error) {
        console.error('Error al aprobar la devolución:', error);
        showError(error.message || 'No se pudo aprobar la devolución');
        
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo aprobar la devolución. ' + (error.message || 'Por favor, intente de nuevo.'),
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    } finally {
        showLoading(false);
    }
}

// Función para rechazar una devolución
async function rejectReturn(returnId) {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'Rechazar Devolución',
            html: `
                <div class="text-left">
                    <label for="rejectionReason" class="block text-sm font-medium text-gray-700 mb-1">Motivo del Rechazo *</label>
                    <textarea id="rejectionReason" class="swal2-textarea" placeholder="Indique el motivo del rechazo..." required></textarea>
                    <label for="rejectionNotes" class="block text-sm font-medium text-gray-700 mt-3 mb-1">Notas del Administrador (opcional)</label>
                    <textarea id="rejectionNotes" class="swal2-textarea" placeholder="Ingrese cualquier nota adicional..."></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Confirmar Rechazo',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const reason = document.getElementById('rejectionReason').value.trim();
                const notes = document.getElementById('rejectionNotes').value.trim();
                
                if (!reason) {
                    Swal.showValidationMessage('El motivo del rechazo es obligatorio');
                    return false;
                }
                
                return { reason, notes: notes || null };
            }
        });
        
        if (!formValues) return; // Usuario canceló
        
        showLoading(true);
        
        // Obtener el ID del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        // Actualizar el estado de la devolución
        const updateData = {
            status: 'Rechazada',
            admin_notes: `MOTIVO DE RECHAZO: ${formValues.reason}\n\n` + 
                        (formValues.notes ? `${formValues.notes}\n\n` : '') +
                        `[Rechazado el ${new Date().toLocaleString('es-ES')} por ${user.email}]`,
            updated_at: new Date().toISOString()
        };
        
        // Actualizamos la devolución
        const { error: updateError } = await supabase
            .from('returns')
            .update(updateData)
            .eq('id', returnId);
            
        if (updateError) throw updateError;
        
        showSuccess('Devolución rechazada correctamente');
        loadReturns();
        
        // Cerrar el modal de detalles si está abierto
        Swal.close();
    } catch (error) {
        console.error('Error al rechazar la devolución:', error);
        showError('Error al rechazar la devolución: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para actualizar el stock del producto
async function updateProductStock(returnId, action) {
    try {
        console.log(`Actualizando stock para devolución ${returnId} con acción: ${action}`);
        
        // 1. Obtener los datos de la devolución
        const { data: returnData, error: returnError } = await supabase
            .from('returns')
            .select('order_id, admin_notes, reason, description')
            .eq('id', returnId)
            .single();
            
        if (returnError) throw returnError;
        if (!returnData || !returnData.order_id) {
            console.warn('No se encontró la devolución o no tiene order_id');
            return true; // Continuamos sin error
        }
        
        console.log('Datos de la devolución:', returnData);
        
        // 2. Obtener los productos de la orden relacionada con los detalles del producto
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select(`
                quantity, 
                product:products (
                    id,
                    stock,
                    name
                )
            `)
            .eq('order_id', returnData.order_id);
            
        if (orderItemsError) {
            console.error('Error al obtener los productos de la orden:', orderItemsError);
            return true; // Continuamos sin error
        }
        
        if (!orderItems || orderItems.length === 0) {
            console.warn('No se encontraron productos en la orden:', returnData.order_id);
            return true; // Continuamos sin error
        }
        
        console.log('Productos de la orden:', orderItems);
        
        // 3. Actualizar el stock de cada producto
        for (const item of orderItems) {
            try {
                if (!item.product || !item.product.id) {
                    console.warn('Producto no encontrado o sin ID en el item:', item);
                    continue;
                }
                
                const productId = item.product.id;
                const productName = item.product.name || 'producto sin nombre';
                const currentStock = Number(item.product.stock) || 0;
                const quantity = Number(item.quantity) || 1;
                
                const newStock = action === 'increment' 
                    ? currentStock + quantity
                    : Math.max(0, currentStock - quantity);
                
                console.log(`Actualizando producto ${productId} (${productName}):`, {
                    stockAnterior: currentStock,
                    cantidad: quantity,
                    accion: action,
                    nuevoStock: newStock
                });
                
                // Actualizar el stock en la base de datos
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ 
                        stock: newStock,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId);
                    
                if (updateError) {
                    console.error(`Error al actualizar el stock del producto ${productId}:`, updateError);
                    continue; // Continuamos con el siguiente producto
                }
                
                console.log(`Stock del producto ${productId} (${productName}) actualizado a ${newStock}`);
                
            } catch (itemError) {
                console.error('Error al procesar el producto:', item, 'Error:', itemError);
                // Continuamos con el siguiente producto
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Error en updateProductStock:', error);
        // No lanzamos el error para no bloquear el flujo principal
        // solo lo registramos y continuamos
        return true;
    }
}

// Función para configurar el menú de notificaciones
function setupNotificationsMenu() {
    if (!notificationsButton || !notificationsDropdown) return;

    notificationsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationsDropdown.classList.toggle('hidden');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!notificationsButton.contains(e.target) && !notificationsDropdown.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
    });
}

// Función para cargar el perfil del usuario
async function loadUserProfile() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        if (!user) return;

        // Obtener el perfil completo del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        // Mostrar información del usuario
        const displayName = profile.full_name || user.email.split('@')[0];
        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        // Actualizar la interfaz de usuario
        if (userNameElement) userNameElement.textContent = displayName;
        if (userInitialsElement) userInitialsElement.textContent = initials;
        if (dropdownUserName) dropdownUserName.textContent = displayName;
        if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;
        
        // Si el usuario tiene una imagen de perfil, mostrarla
        if (userAvatarElement && profile.avatar_url) {
            userAvatarElement.src = profile.avatar_url;
            userAvatarElement.classList.remove('hidden');
            userInitialsElement.classList.add('hidden');
        }

    } catch (error) {
        console.error('Error al cargar el perfil del usuario:', error);
    }
}

// Función para configurar el menú de usuario
function setupUserMenu() {
    if (!userMenuButton || !userDropdown) return;

    userMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
    });
}

// Función para manejar el cierre de sesión
function setupLogout() {
    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showError('Error al cerrar sesión. Por favor, intente de nuevo.');
        }
    };

    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// Función para inicializar la aplicación
async function initApp() {
    try {
        console.log('Inicializando aplicación...');
        
        // Configurar el menú móvil
        console.log('Configurando menú móvil...');
        setupMobileMenu();
        
        // Configurar menú de notificaciones
        console.log('Configurando menú de notificaciones...');
        setupNotificationsMenu();
        
        // Configurar menú de usuario
        console.log('Configurando menú de usuario...');
        setupUserMenu();
        
        // Configurar cierre de sesión
        console.log('Configurando cierre de sesión...');
        setupLogout();
        
        // Inicializar elementos del DOM
        console.log('Inicializando elementos del DOM...');
        initElements();
        
        // Verificar autenticación
        console.log('Verificando autenticación...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('Usuario no autenticado, redirigiendo a login...');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Usuario autenticado:', user.email);
        
        // Cargar perfil del usuario
        console.log('Cargando perfil del usuario...');
        await loadUserProfile();
        
        // Obtener el ID de la tienda del usuario
        console.log('Obteniendo ID de la tienda...');
        storeId = await getUserStoreId();
        
        if (!storeId) {
            showError('No se pudo obtener la tienda del usuario');
            return;
        }
        
        console.log('Store ID obtenido:', storeId);
        
        // Cargar devoluciones
        console.log('Cargando devoluciones...');
        await loadReturns();
        
        // Inicializar tooltips
        if (window.tippy) {
            tippy('[data-tippy-content]');
        }
        
        console.log('Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError('Error al inicializar la aplicación: ' + (error.message || 'Error desconocido'));
        
        // Redirigir a login si hay error de autenticación
        if (error.message && (error.message.includes('authentication') || error.message.includes('No hay usuario autenticado'))) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    } finally {
        // Ocultar el indicador de carga
        showLoading(false);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});