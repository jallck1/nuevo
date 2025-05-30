// Configuración de paginación
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalItems = 0;
let auditLogs = [];
let currentStoreId = null;

// Obtener el store_id del perfil del usuario
async function getCurrentUserStoreId() {
    try {
        // Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('Error de autenticación:', sessionError);
            window.location.href = 'login.html';
            return null;
        }
        
        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', session.user.id)
            .single();
            
        if (profileError || !profile) {
            console.error('Error al cargar el perfil:', profileError);
            return null;
        }
        
        if (!profile.store_id) {
            console.error('El usuario no tiene un store_id asignado');
            return null;
        }
        
        return profile.store_id;
        
    } catch (error) {
        console.error('Error al obtener el store_id del usuario:', error);
        return null;
    }
}

// Función para verificar autenticación y rol (si no está definida globalmente)
if (typeof checkAuthAndRole === 'undefined') {
    window.checkAuthAndRole = async (requiredRole) => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error || !user) {
                return { isAuthenticated: false, user: null };
            }
            
            // Verificar rol si es necesario
            if (requiredRole) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                    
                if (profileError || !profile || profile.role !== requiredRole) {
                    return { isAuthenticated: false, user: null };
                }
            }
            
            return { isAuthenticated: true, user };
        } catch (error) {
            console.error('Error en checkAuthAndRole:', error);
            return { isAuthenticated: false, user: null };
        }
    };
}

// Verificar autenticación y rol
async function checkAuth() {
    try {
        const { isAuthenticated, user } = await checkAuthAndRole('admin');
        if (!isAuthenticated || !user) {
            showError('No estás autenticado o no tienes permisos suficientes');
            return false;
        }
        
        console.log('Usuario autenticado:', user);
        
        // Obtener el perfil del usuario
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single();
            
        if (error || !profile) {
            console.error('Error al cargar el perfil:', error);
            showError('No se pudo cargar la información del perfil');
            return false;
        }
        
        console.log('Perfil cargado:', profile);
        
        if (!profile.store_id) {
            showError('Tu cuenta no está asociada a ninguna tienda');
            return false;
        }
        
        currentStoreId = profile.store_id;
        console.log('Store ID establecido:', currentStoreId);
        return true;
    } catch (error) {
        console.error('Error en checkAuth:', error);
        showError('Error al verificar la autenticación');
        return false;
    }
}

// Elementos del DOM
const tbody = document.getElementById('audit-logs-table-body');
const searchInput = document.getElementById('search');
const actionFilter = document.getElementById('action-filter');
const currentPageInput = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const totalItemsSpan = document.getElementById('total-items');
const showingFromSpan = document.getElementById('showing-from');
const showingToSpan = document.getElementById('showing-to');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const prevPageMobileBtn = document.getElementById('prev-page-mobile');
const nextPageMobileBtn = document.getElementById('next-page-mobile');
const detailsModal = document.getElementById('audit-details-modal');
const closeDetailsBtn = document.getElementById('close-details-modal');
const detailsContent = document.getElementById('audit-details-content');

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading(true);
        console.log('Iniciando inicialización...');
        
        // Verificar autenticación
        const isAuthenticated = await checkAuth();
        console.log('Autenticación verificada:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('Usuario no autenticado, redirigiendo...');
            return;
        }
        
        console.log('Inicializando aplicación con store_id:', currentStoreId);
        
        // Inicializar la aplicación
        await initializeApp();
        console.log('Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showError(error.message || 'Error al cargar la página');
    } finally {
        showLoading(false);
    }
});

// Inicializar la aplicación
async function initializeApp() {
    try {
        console.log('Inicializando módulo de auditoría...');
        showLoading(true);

        // Obtener el store_id del usuario actual
        const storeId = await getCurrentUserStoreId();
        if (!storeId) {
            throw new Error('No se pudo identificar la tienda. Asegúrate de que tu perfil tenga un store_id asignado.');
        }
        
        currentStoreId = storeId;
        console.log('Store ID obtenido:', currentStoreId);

        // Configurar eventos
        setupEventListeners();
        
        // Cargar registros de auditoría
        await loadAuditLogs();
        
        console.log('Módulo de auditoría inicializado correctamente');
        
    } catch (error) {
        console.error('Error al inicializar el módulo de auditoría:', error);
        showError('Error al cargar los registros de auditoría: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Cargar registros de auditoría
async function loadAuditLogs() {
    try {
        showLoading(true);
        console.log('Cargando registros de auditoría...');
        
        // Verificar que tengamos un store_id válido
        if (!currentStoreId) {
            const errorMsg = 'Error: No se pudo identificar la tienda del usuario';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('Buscando registros para store_id:', currentStoreId);
        
        // Obtener filtros
        const search = searchInput ? searchInput.value.trim() : '';
        const action = actionFilter ? actionFilter.value : '';
        
        // Construir consulta base
        console.log(`Buscando registros para store_id: ${currentStoreId}`);
        
        try {
            // Primero verificamos si hay algún registro para este store_id
            const { count: totalCount, error: countError } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', currentStoreId);
                
            console.log(`Total de registros para store_id ${currentStoreId}:`, totalCount || 0);
            
            if (countError) {
                console.error('Error al contar registros:', countError);
                throw countError;
            }
            
            // Si no hay registros, mostramos mensaje y salimos
            if (!totalCount) {
                console.log('No hay registros de auditoría para mostrar');
                auditLogs = [];
                totalItems = 0;
                renderAuditLogs();
                updatePagination();
                return;
            }
            
            // Si hay registros, procedemos con la consulta completa
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .eq('store_id', currentStoreId)
                .order('timestamp', { ascending: false });
                
            // Aplicar filtros adicionales
            if (search) {
                console.log('Aplicando filtro de búsqueda:', search);
                query = query.or(
                    `action.ilike.%${search}%`,
                    `target_entity.ilike.%${search}%`,
                    `details->>'old_data'->>'name'.ilike.%${search}%`
                );
            }
            
            if (action) {
                console.log('Filtrando por acción:', action);
                query = query.eq('action', action);
            }
            
            // Aplicar paginación
            console.log('Aplicando paginación...');
            const { data, error, count } = await query
                .range((currentPage - 1) * ITEMS_PER_PAGE, (currentPage * ITEMS_PER_PAGE) - 1);
                
            console.log('Resultados de la consulta:', { data, error, count });
            
            if (error) throw error;
            
            auditLogs = data || [];
            totalItems = count || 0;
            
        } catch (error) {
            console.error('Error en loadAuditLogs:', error);
            showError('Error al cargar los registros de auditoría');
            auditLogs = [];
            totalItems = 0;
        }
        
        renderAuditLogs();
        updatePagination();
        
    } catch (error) {
        const errorMsg = `Error al cargar registros: ${error.message}`;
        console.error(errorMsg, error);
        showError('No se pudieron cargar los registros de auditoría');
        throw error; // Propagar el error
    } finally {
        showLoading(false);
    }
}

// Renderizar registros en la tabla
function renderAuditLogs() {
    tbody.innerHTML = '';
    
    if (!auditLogs || auditLogs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-medium">No hay registros de auditoría</p>
                    <p class="text-sm mt-1">Los registros de actividad aparecerán aquí</p>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    auditLogs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Formatear acción
        let actionBadge = '';
        switch(log.action) {
            case 'INSERT':
                actionBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Inserción</span>';
                break;
            case 'UPDATE':
                actionBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Actualización</span>';
                break;
            case 'DELETE':
                actionBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Eliminación</span>';
                break;
            default:
                actionBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${log.action}</span>`;
        }
        
        // Formatear fecha
        const formattedDate = new Date(log.timestamp).toLocaleString();
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${actionBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap">${log.target_entity || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${log.target_id || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${log.profile_id || 'Sistema'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="text-blue-600 hover:text-blue-900" onclick="showAuditDetails('${log.id}')">
                    <i class="fas fa-eye"></i> Ver detalles
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Mostrar detalles del registro
function showAuditDetails(logId) {
    const log = auditLogs.find(l => l.id === logId);
    if (!log) return;
    
    let detailsHtml = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold">Acción</h4>
                <p>${log.action}</p>
            </div>
            <div>
                <h4 class="font-semibold">Entidad</h4>
                <p>${log.target_entity || 'N/A'}</p>
            </div>
            <div>
                <h4 class="font-semibold">ID de Entidad</h4>
                <p>${log.target_id || 'N/A'}</p>
            </div>
            <div>
                <h4 class="font-semibold">Usuario</h4>
                <p>${log.profile_id || 'Sistema'}</p>
            </div>
            <div>
                <h4 class="font-semibold">Fecha/Hora</h4>
                <p>${new Date(log.timestamp).toLocaleString()}</p>
            </div>
    `;
    
    // Mostrar detalles específicos si existen
    if (log.details) {
        detailsHtml += `
            <div class="mt-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-semibold">Detalles Adicionales</h4>
                    <button onclick="showJsonHelp()" class="text-blue-500 hover:text-blue-700" title="Ayuda con el formato">
                        <i class="fas fa-question-circle"></i> Ayuda
                    </button>
                </div>
                <div class="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                    ${formatJsonDetails(log.details)}
                </div>
            </div>
        `;
    }
    
    detailsHtml += `</div>`;
    detailsContent.innerHTML = detailsHtml;
    detailsModal.classList.remove('hidden');
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        loadAuditLogs();
    }, 500);
    
    searchInput.addEventListener('input', debouncedSearch);
    actionFilter.addEventListener('change', () => {
        currentPage = 1;
        loadAuditLogs();
    });
    
    // Paginación
    currentPageInput.addEventListener('change', (e) => {
        const page = parseInt(e.target.value) || 1;
        if (page >= 1 && page <= Math.ceil(totalItems / ITEMS_PER_PAGE)) {
            currentPage = page;
            loadAuditLogs();
        } else {
            currentPageInput.value = currentPage;
        }
    });
    
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
    prevPageMobileBtn.addEventListener('click', () => changePage(-1));
    nextPageMobileBtn.addEventListener('click', () => changePage(1));
    
    // Cerrar modal
    closeDetailsBtn.addEventListener('click', () => {
        detailsModal.classList.add('hidden');
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            detailsModal.classList.add('hidden');
        }
    });
    
    // Cerrar sesión
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showError('Error al cerrar sesión');
        }
    });
}

// Cambiar de página
function changePage(delta) {
    const newPage = currentPage + delta;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        currentPageInput.value = currentPage;
        loadAuditLogs();
    }
}

// Actualizar controles de paginación
function updatePagination() {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    
    // Actualizar total de páginas
    totalPagesSpan.textContent = totalPages;
    totalItemsSpan.textContent = totalItems;
    
    // Actualizar rango mostrado
    const from = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    showingFromSpan.textContent = from;
    showingToSpan.textContent = to;
    
    // Habilitar/deshabilitar botones
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    prevPageMobileBtn.disabled = currentPage === 1;
    nextPageMobileBtn.disabled = currentPage >= totalPages;
    
    // Asegurar que la página actual no sea mayor que el total de páginas
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
        currentPageInput.value = currentPage;
        loadAuditLogs();
    }
}

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Mostrar/ocultar loading
function showLoading(show = true) {
    const loadingElement = document.getElementById('loading');
    if (!loadingElement) return;
    
    if (show) {
        loadingElement.classList.remove('hidden');
    } else {
        loadingElement.classList.add('hidden');
    }
}

// Mostrar mensaje de error
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'Aceptar'
    });
}

// Función para formatear los detalles del JSON
function formatJsonDetails(details) {
    if (!details) return '';
    
    // Si hay cambios específicos
    if (details.changes) {
        let html = '<div class="space-y-4">';
        
        // Mostrar campos actualizados
        if (details.updated_fields && details.updated_fields.length > 0) {
            html += '<div class="mb-4">';
            html += '<span class="font-medium">Campos actualizados:</span> ';
            html += `<span class="text-sm text-gray-600">${details.updated_fields.join(', ')}</span>`;
            html += '</div>';
        }
        
        // Mostrar cambios
        html += '<div class="space-y-3">';
        for (const [field, values] of Object.entries(details.changes)) {
            html += `
                <div class="border-l-4 border-blue-200 pl-3 py-1">
                    <div class="font-medium text-gray-800">${field}</div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="bg-green-50 p-2 rounded">
                            <div class="text-xs text-green-600 font-medium">Valor anterior:</div>
                            <div class="text-green-800">${formatValue(values.from)}</div>
                        </div>
                        <div class="bg-blue-50 p-2 rounded">
                            <div class="text-xs text-blue-600 font-medium">Nuevo valor:</div>
                            <div class="text-blue-800">${formatValue(values.to)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>'; // cierra space-y-3
        html += '</div>'; // cierra space-y-4
        
        return html;
    }
    
    // Si no hay cambios específicos, mostrar el JSON formateado
    return `<pre class="text-sm">${JSON.stringify(details, null, 2)}</pre>`;
}

// Función auxiliar para formatear valores
function formatValue(value) {
    if (value === null || value === undefined) return '<span class="text-gray-400">No definido</span>';
    if (value === '') return '<span class="text-gray-400">Vacío</span>';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return value;
}

// Mostrar ayuda de JSON
function showJsonHelp() {
    const helpModal = `
        <div id="jsonHelpModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-800">Ayuda con los detalles de auditoría</h3>
                        <button onclick="document.getElementById('jsonHelpModal').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="space-y-4 text-sm text-gray-700">
                        <p>Los cambios en los registros se muestran de la siguiente manera:</p>
                        <ul class="list-disc pl-5 space-y-2">
                            <li><span class="font-medium">Valor anterior:</span> Muestra el valor que tenía el campo antes del cambio (en verde).</li>
                            <li><span class="font-medium">Nuevo valor:</span> Muestra el valor actualizado del campo (en azul).</li>
                        </ul>
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-info-circle text-yellow-500"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-yellow-700">
                                        Si necesitas ver el formato JSON completo, puedes usar un 
                                        <a href="https://jsonformatter.org/" target="_blank" class="text-blue-600 hover:underline">formateador de JSON en línea</a>.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button onclick="document.getElementById('jsonHelpModal').remove()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eliminar el modal si ya existe
    const existingModal = document.getElementById('jsonHelpModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar el nuevo modal al documento
    document.body.insertAdjacentHTML('beforeend', helpModal);
}

// Hacer funciones accesibles globalmente
window.showAuditDetails = showAuditDetails;
window.initializeAuditApp = initializeApp;
window.showJsonHelp = showJsonHelp;