// storeManagement.js - Manejo de la funcionalidad de administración de tiendas

// Función para mostrar/ocultar el indicador de carga
function showLoading(show) {
    const loadingElement = document.getElementById('storesLoading');
    const gridElement = document.getElementById('storesGrid');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (gridElement) {
        gridElement.style.display = show ? 'none' : 'grid';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const manageStoresBtn = document.getElementById('manageStoresBtn');
    const manageStoresModal = document.getElementById('manageStoresModal');
    const closeModalBtn = manageStoresModal?.querySelector('.close-modal');
    const cancelBtn = manageStoresModal?.querySelector('.btn-cancel');
    const newStoreBtn = manageStoresModal?.querySelector('.btn-confirm');
    const storeSearch = document.getElementById('storeSearch');
    const searchButton = document.getElementById('searchButton');
    const storeFilter = document.getElementById('storeFilter');
    const storesGrid = document.getElementById('storesGrid');
    
    // Variables de estado
    let allStores = [];
    let filteredStores = [];
    let currentStoreFilter = '';
    let currentPage = 1;
    const itemsPerPage = 6;
    
    // Inicializar el modal de administración de tiendas
    function initStoresModal() {
        if (!manageStoresBtn || !manageStoresModal) return;
        
        // Abrir modal al hacer clic en el botón
        manageStoresBtn.addEventListener('click', async () => {
            manageStoresModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            await loadStores();
            updateStoreFilterOptions();
        });

        // Cerrar modal
        const closeModal = () => {
            manageStoresModal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
            // Limpiar búsquedas al cerrar
            if (storeSearch) storeSearch.value = '';
            if (storeFilter) storeFilter.value = '';
            currentStoreFilter = '';
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', (e) => {
            if (e.target === manageStoresModal) {
                closeModal();
            }
        });
        
        // Buscar tiendas al escribir
        if (storeSearch) {
            let searchTimeout;
            
            // Buscar al hacer clic en el botón
            if (searchButton) {
                searchButton.addEventListener('click', () => {
                    filterStores(storeSearch.value);
                });
            }
            
            // Buscar al presionar Enter
            storeSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    filterStores(storeSearch.value);
                }
            });
            
            // Búsqueda en tiempo real con debounce
            storeSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    filterStores(e.target.value);
                }, 300);
            });
        }
        
        // Filtrar por tienda seleccionada
        if (storeFilter) {
            storeFilter.addEventListener('change', (e) => {
                currentStoreFilter = e.target.value;
                applyFilters();
            });
        }
        
        // Navegación de páginas (si se implementa paginación)
        // ...
    }
    
    // Cargar tiendas desde Supabase
    async function loadStores() {
        try {
            showLoading(true);
            
            // Obtener todas las tiendas ordenadas por nombre
            const { data: storesData, error } = await window.supabaseAdmin
                .from('stores')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) throw error;
            
            allStores = storesData || [];
            filteredStores = [...allStores];
            
            // Obtener información de los administradores para cada tienda
            if (allStores.length > 0) {
                await loadStoreAdmins();
            }
            
            renderStores();
            
        } catch (error) {
            console.error('Error al cargar tiendas:', error);
            showNotification('Error al cargar la lista de tiendas: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Actualizar las opciones del selector de tiendas
    function updateStoreFilterOptions() {
        if (!storeFilter) return;
        
        // Guardar la selección actual
        const currentValue = storeFilter.value;
        
        // Limpiar opciones existentes (excepto la primera)
        storeFilter.innerHTML = '<option value="">Todas las tiendas</option>';
        
        // Agregar opciones de tiendas
        allStores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storeFilter.appendChild(option);
        });
        
        // Restaurar la selección si existe
        if (currentValue && allStores.some(store => store.id === currentValue)) {
            storeFilter.value = currentValue;
        }
    }
    
    // Aplicar todos los filtros
    function applyFilters() {
        let results = [...allStores];
        
        // Aplicar filtro de búsqueda
        const searchTerm = storeSearch ? storeSearch.value.toLowerCase() : '';
        if (searchTerm) {
            results = results.filter(store => 
                (store.name && store.name.toLowerCase().includes(searchTerm)) ||
                (store.address && store.address.toLowerCase().includes(searchTerm)) ||
                (store.admins && store.admins.some(admin => 
                    (admin.name && admin.name.toLowerCase().includes(searchTerm)) ||
                    (admin.email && admin.email.toLowerCase().includes(searchTerm))
                ))
            );
        }
        
        // Aplicar filtro de tienda seleccionada
        if (currentStoreFilter) {
            results = results.filter(store => store.id === currentStoreFilter);
        }
        
        filteredStores = results;
        renderStores();
    }
    
    // Cargar información de administradores para cada tienda
    async function loadStoreAdmins() {
        try {
            // Obtener IDs de tiendas únicos
            const storeIds = allStores.map(store => store.id);
            
            if (storeIds.length === 0) {
                console.log('No hay tiendas para cargar administradores');
                return;
            }
            
            console.log('Cargando administradores para tiendas:', storeIds);
            
            // Obtener todos los administradores para las tiendas actuales
            const { data: admins, error } = await window.supabaseAdmin
                .from('profiles')
                .select('id, name, email, store_id, created_at, status')
                .eq('role', 'admin')
                .in('store_id', storeIds);
                
            if (error) {
                console.error('Error al cargar administradores:', error);
                throw error;
            }
            
            console.log('Administradores encontrados:', admins);
            
            // Crear un mapa de administradores por tienda
            const storeAdmins = new Map();
            
            // Inicializar arrays vacíos para cada tienda
            allStores.forEach(store => {
                storeAdmins.set(store.id, []);
            });
            
            // Agrupar administradores por tienda
            if (admins && admins.length > 0) {
                admins.forEach(admin => {
                    if (admin.store_id && storeAdmins.has(admin.store_id)) {
                        storeAdmins.get(admin.store_id).push(admin);
                    }
                });
            }
            
            // Agregar la información de administradores a cada tienda
            allStores = allStores.map(store => ({
                ...store,
                admins: storeAdmins.get(store.id) || []
            }));
            
            console.log('Tiendas con administradores:', allStores);
            
            // Actualizar la lista filtrada
            filteredStores = [...allStores];
            
        } catch (error) {
            console.error('Error al cargar administradores de tiendas:', error);
            showNotification('Error al cargar administradores: ' + (error.message || 'Error desconocido'), 'error');
            throw error;
        }
    }
    
    // Filtrar tiendas según el término de búsqueda
    function filterStores(searchTerm = '') {
        // Si el término de búsqueda está vacío y no hay filtro de tienda, mostrar todas
        if (!searchTerm && !currentStoreFilter) {
            filteredStores = [...allStores];
        } else {
            applyFilters();
        }
        
        currentPage = 1; // Volver a la primera página al filtrar
        renderStores();
    }
    
    // Renderizar la lista de tiendas
    function renderStores() {
        if (!storesGrid) return;
        
        // Mostrar mensaje si no hay tiendas
        if (filteredStores.length === 0) {
            storesGrid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-store-slash text-4xl text-gray-500 mb-2"></i>
                    <p class="text-gray-400">No se encontraron tiendas</p>
                </div>
            `;
            return;
        }
        
        // Crear el grid de tiendas
        storesGrid.innerHTML = filteredStores.map(store => `
            <div class="store-card bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 hover:border-blue-500 transition-colors">
                <div class="p-4 border-b border-gray-700">
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-bold text-white">${store.name || 'Sin nombre'}</h3>
                        <span class="text-xs text-gray-400">
                            ${new Date(store.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">
                        <i class="fas fa-map-marker-alt mr-1"></i>
                        ${store.address || 'Sin dirección'}
                    </p>
                </div>
                
                <div class="p-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">
                        <i class="fas fa-users-cog mr-1"></i> Administradores
                        <span class="ml-2 px-2 py-1 bg-blue-900 bg-opacity-50 text-blue-300 text-xs rounded-full">
                            ${store.admins?.length || 0}
                        </span>
                    </h4>
                    
                    <div class="space-y-2 max-h-32 overflow-y-auto pr-2">
                        ${store.admins?.length > 0 
                            ? store.admins.map(admin => `
                                <div class="flex items-center justify-between text-sm bg-gray-700 bg-opacity-50 p-2 rounded">
                                    <div>
                                        <p class="text-white">${admin.name || 'Sin nombre'}</p>
                                        <p class="text-xs text-gray-400">${admin.email}</p>
                                    </div>
                                    <button class="text-red-400 hover:text-red-300 text-sm" 
                                            onclick="removeAdminFromStore('${admin.id}', '${store.id}')">
                                        <i class="fas fa-user-minus"></i>
                                    </button>
                                </div>
                            `).join('')
                            : `<p class="text-sm text-gray-500 italic">No hay administradores asignados</p>`
                        }
                    </div>
                    
                    <div class="mt-4 pt-3 border-t border-gray-700">
                        <button class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                                onclick="openAddAdminModal('${store.id}')">
                            <i class="fas fa-user-plus mr-1"></i> Agregar Administrador
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Inicializar el modal
    initStoresModal();
});

// Función para abrir el modal de agregar administrador (se llama desde el HTML)
window.openAddAdminModal = async function(storeId) {
    // Implementar lógica para abrir el modal de agregar administrador
    console.log('Abrir modal para agregar administrador a la tienda:', storeId);
    
    // Aquí puedes implementar un modal similar al de creación de administradores
    // pero que solo permita seleccionar un usuario existente o crear uno nuevo
    // y asignarlo a la tienda seleccionada
    
    // Ejemplo de implementación básica:
    const adminEmail = prompt('Ingrese el correo electrónico del administrador a agregar:');
    if (adminEmail) {
        await addAdminToStore(storeId, adminEmail);
    }
};

// Función para agregar un administrador a una tienda
window.addAdminToStore = async function(storeId, email) {
    try {
        // 1. Buscar el usuario por correo electrónico
        const { data: users, error: userError } = await window.supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .single();
            
        if (userError || !users) {
            // Si el usuario no existe, puedes crear uno nuevo o mostrar un mensaje
            const createAdmin = confirm(`El usuario ${email} no existe. ¿Desea crearlo como administrador de esta tienda?`);
            
            if (createAdmin) {
                // Aquí podrías abrir el modal de creación de administrador
                // con el correo electrónico prellenado
                console.log('Abrir modal de creación de administrador con email:', email);
                // Por ahora, solo mostramos un mensaje
                showNotification('Por favor, cree el administrador primero', 'info');
            }
            return;
        }
        
        // 2. Actualizar el perfil del usuario para asignarlo a la tienda y establecer el rol
        const { error: updateError } = await window.supabaseAdmin
            .from('profiles')
            .update({
                store_id: storeId,
                role: 'admin',
                updated_at: new Date().toISOString()
            })
            .eq('id', users.id);
            
        if (updateError) throw updateError;
        
        showNotification('Administrador agregado correctamente', 'success');
        
        // 3. Recargar la lista de tiendas
        if (window.loadStores) {
            await window.loadStores();
        }
        
    } catch (error) {
        console.error('Error al agregar administrador:', error);
        showNotification('Error al agregar administrador: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Función para quitar un administrador de una tienda
window.removeAdminFromStore = async function(adminId, storeId) {
    if (!confirm('¿Está seguro de quitar a este administrador de la tienda?')) {
        return;
    }
    
    try {
        // Actualizar el perfil del administrador para quitar la tienda
        const { error } = await window.supabaseAdmin
            .from('profiles')
            .update({
                store_id: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', adminId);
            
        if (error) throw error;
        
        showNotification('Administrador quitado de la tienda', 'success');
        
        // Recargar la lista de tiendas
        if (window.loadStores) {
            await window.loadStores();
        }
        
    } catch (error) {
        console.error('Error al quitar administrador:', error);
        showNotification('Error al quitar administrador: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Hacer la función loadStores accesible globalmente
window.loadStores = async function() {
    const storeManagement = document.querySelector('#manageStoresModal');
    if (storeManagement) {
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
    }
};
