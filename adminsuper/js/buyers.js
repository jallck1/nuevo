// buyers.js - Manejo de la funcionalidad de compradores

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del modal de lista de administradores
    const viewBuyersBtn = document.getElementById('viewBuyersBtn');
    const viewBuyersModal = document.getElementById('viewBuyersModal');
    const closeModalBtn = viewBuyersModal?.querySelector('.close-modal');
    const cancelBtn = viewBuyersModal?.querySelector('.btn-cancel');
    const buyersList = document.getElementById('buyersList');
    const buyerSearch = document.getElementById('buyerSearch');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const showingBuyersSpan = document.getElementById('showingBuyers');
    const totalBuyersSpan = document.getElementById('totalBuyers');
    
    // Elementos del modal de edición
    const editAdminModal = document.getElementById('editAdminModal');
    const closeEditModalBtn = editAdminModal?.querySelector('.close-edit-modal');
    const editAdminForm = document.getElementById('editAdminForm');
    const cancelEditBtn = editAdminModal?.querySelector('.btn-cancel');
    const saveEditBtn = editAdminModal?.querySelector('.btn-confirm');
    let currentEditingAdmin = null;

    // Variables de paginación
    let currentPage = 1;
    const itemsPerPage = 10;
    let totalBuyers = 0;
    let allBuyers = [];
    let filteredBuyers = [];

    // Inicializar el modal de compradores
    function initBuyersModal() {
        if (!viewBuyersBtn || !viewBuyersModal) return;

        // Abrir modal al hacer clic en el botón
        viewBuyersBtn.addEventListener('click', async () => {
            viewBuyersModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            await loadBuyers();
        });

        // Cerrar modal
        const closeModal = () => {
            viewBuyersModal.style.display = 'none';
            document.body.style.overflow = '';
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', (e) => {
            if (e.target === viewBuyersModal) {
                closeModal();
            }
        });

        // Buscar compradores
        if (buyerSearch) {
            let searchTimeout;
            buyerSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage = 1;
                    filterBuyers(e.target.value);
                }, 300);
            });
        }

        // Navegación de páginas
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderBuyers();
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const maxPage = Math.ceil(filteredBuyers.length / itemsPerPage);
                if (currentPage < maxPage) {
                    currentPage++;
                    renderBuyers();
                }
            });
        }
    }


    // Cargar administradores de tiendas desde Supabase
    window.loadBuyers = async function() {
        try {
            showLoading(true);
            
            // 1. Obtenemos los perfiles de administradores que tienen tienda asignada
            const { data: admins, error: adminsError } = await window.supabaseAdmin
                .from('profiles')
                .select('*')
                .not('store_id', 'is', null)
                .eq('role', 'admin'); // Solo administradores

            if (adminsError) {
                console.error('Error al cargar administradores:', adminsError);
                throw adminsError;
            }

            if (!admins || admins.length === 0) {
                console.log('No se encontraron administradores con tienda asignada');
                allBuyers = [];
                filteredBuyers = [];
                totalBuyers = 0;
                renderBuyers();
                return;
            }


            // 2. Usamos directamente la lista de administradores
            const filteredBuyersList = admins;
            
            // 3. Obtenemos los IDs de tiendas únicos
            const storeIds = [...new Set(filteredBuyersList.map(b => b.store_id).filter(Boolean))];
            
            // 4. Obtenemos la información de las tiendas
            let storesMap = new Map();
            
            if (storeIds.length > 0) {
                const { data: stores, error: storesError } = await window.supabaseAdmin
                    .from('stores')
                    .select('*')
                    .in('id', storeIds);
                
                if (storesError) {
                    console.error('Error al cargar tiendas:', storesError);
                } else if (stores) {
                    // Creamos un mapa de tiendas para acceso rápido
                    stores.forEach(store => {
                        storesMap.set(store.id, store);
                    });
                }
            }
            
            // 5. Combinamos la información de compradores con sus tiendas
            allBuyers = filteredBuyersList.map(buyer => ({
                ...buyer,
                store: storesMap.get(buyer.store_id) || { id: buyer.store_id, name: 'Tienda no encontrada' }
            }));
            
            filteredBuyers = [...allBuyers];
            totalBuyers = allBuyers.length;
            
            // Actualizar contadores
            updateCounters();
            renderBuyers();
            
        } catch (error) {
            console.error('Error al cargar compradores:', error);
            showNotification('Error al cargar la lista de compradores', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Filtrar compradores según el término de búsqueda
    function filterBuyers(searchTerm = '') {
        if (!searchTerm.trim()) {
            filteredBuyers = [...allBuyers];
        } else {
            const term = searchTerm.toLowerCase();
            filteredBuyers = allBuyers.filter(buyer => 
                (buyer.name && buyer.name.toLowerCase().includes(term)) ||
                (buyer.email && buyer.email.toLowerCase().includes(term)) ||
                (buyer.stores && buyer.stores.name && buyer.stores.name.toLowerCase().includes(term))
            );
        }
        
        currentPage = 1; // Volver a la primera página al filtrar
        updateCounters();
        renderBuyers();
    }

    // Renderizar la lista de compradores
    function renderBuyers() {
        if (!buyersList) return;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const buyersToShow = filteredBuyers.slice(start, end);
        
        buyersList.innerHTML = '';
        
        if (buyersToShow.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="py-4 text-center text-gray-400">
                    No se encontraron compradores
                </td>
            `;
            buyersList.appendChild(row);
            return;
        }
        
        buyersToShow.forEach(buyer => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-700 hover:bg-gray-800';
            
            const statusClass = buyer.status === 'Activo' ? 'text-green-400' : 'text-red-400';
            const storeName = buyer.store ? buyer.store.name : 'Sin tienda';
            
            row.innerHTML = `
                <td class="py-3">${buyer.name || 'N/A'}</td>
                <td class="py-3">${buyer.email || 'N/A'}</td>
                <td class="py-3">${storeName}</td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded-full text-xs ${statusClass} bg-opacity-20 ${buyer.status === 'Activo' ? 'bg-green-900' : 'bg-red-900'}">
                        ${buyer.status || 'N/A'}
                    </span>
                </td>
                <td class="py-3">
                    <button class="text-blue-400 hover:text-blue-300 mr-3 edit-admin-btn" data-admin-id="${buyer.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-400 hover:text-red-300 delete-admin-btn" data-admin-id="${buyer.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            buyersList.appendChild(row);
        });
        
        // Actualizar controles de paginación
        updatePaginationControls();
    }

    // Actualizar contadores
    function updateCounters() {
        if (showingBuyersSpan) {
            const start = Math.min((currentPage - 1) * itemsPerPage + 1, filteredBuyers.length);
            const end = Math.min(start + itemsPerPage - 1, filteredBuyers.length);
            showingBuyersSpan.textContent = `${start}-${end}`;
        }
        
        if (totalBuyersSpan) {
            totalBuyersSpan.textContent = filteredBuyers.length;
        }
    }

    // Actualizar controles de paginación
    function updatePaginationControls() {
        if (!prevPageBtn || !nextPageBtn || !currentPageSpan) return;
        
        const maxPage = Math.ceil(filteredBuyers.length / itemsPerPage);
        
        currentPageSpan.textContent = currentPage;
        
        // Deshabilitar botones según corresponda
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= maxPage;
    }

    // Mostrar/ocultar indicador de carga
    function showLoading(show) {
        // Implementar lógica de carga si es necesario
    }

    // Inicializar el modal de compradores
    initBuyersModal();
    
    // Inicializar el modal de edición si existe
    if (editAdminModal) {
        // Cerrar modal al hacer clic en la X
        if (closeEditModalBtn) {
            closeEditModalBtn.addEventListener('click', () => {
                editAdminModal.style.display = 'none';
                currentEditingAdmin = null;
            });
        }
        
        // Cerrar modal al hacer clic en Cancelar
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                editAdminModal.style.display = 'none';
                currentEditingAdmin = null;
            });
        }
        
        // Cerrar modal al hacer clic fuera del contenido
        editAdminModal.addEventListener('click', (e) => {
            if (e.target === editAdminModal) {
                editAdminModal.style.display = 'none';
                currentEditingAdmin = null;
            }
        });
        
        // Manejar el envío del formulario de edición
        if (saveEditBtn && editAdminForm) {
            saveEditBtn.addEventListener('click', handleSaveAdmin);
        }
        
        // Delegación de eventos para los botones de editar y eliminar
        if (buyersList) {
            buyersList.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.edit-admin-btn');
                const deleteBtn = e.target.closest('.delete-admin-btn');
                
                if (editBtn) {
                    e.preventDefault();
                    const adminId = editBtn.getAttribute('data-admin-id');
                    // Encontrar el administrador en la lista
                    const admin = filteredBuyers.find(b => b.id === adminId);
                    if (admin) {
                        await openEditAdminModal(admin);
                    }
                } else if (deleteBtn) {
                    // Aquí puedes agregar la lógica para eliminar si es necesario
                    console.log('Eliminar administrador:', deleteBtn.getAttribute('data-admin-id'));
                }
            });
        }
    }
});

// Función para manejar el guardado de cambios del administrador
async function handleSaveAdmin() {
    if (!editAdminForm || !currentEditingAdmin) return;
    
    const formData = new FormData(editAdminForm);
    const adminData = {
        name: formData.get('name'),
        email: formData.get('email'),
        store_id: formData.get('storeId') || null,
        status: formData.get('status') || 'Activo'
    };
    
    const saveBtn = document.querySelector('#editAdminModal .btn-confirm');
    const originalBtnText = saveBtn.innerHTML;
    
    try {
        // Deshabilitar botón y mostrar carga
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        // Actualizar el perfil en la base de datos
        const { error } = await window.supabaseAdmin
            .from('profiles')
            .update({
                name: adminData.name,
                store_id: adminData.store_id,
                status: adminData.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentEditingAdmin.id);
            
        if (error) throw error;
        
        // Si el correo cambió, actualizarlo en la autenticación
        if (adminData.email !== currentEditingAdmin.email) {
            const { error: authError } = await window.supabaseAdmin.auth.admin.updateUserById(
                currentEditingAdmin.id,
                { email: adminData.email }
            );
            
            if (authError) throw authError;
        }
        
        // Mostrar mensaje de éxito y recargar
        showNotification('Administrador actualizado correctamente', 'success');
        document.getElementById('editAdminModal').style.display = 'none';
        currentEditingAdmin = null;
        
        // Recargar la lista de administradores
        await loadBuyers();
        
    } catch (error) {
        console.error('Error al actualizar el administrador:', error);
        showNotification('Error al actualizar el administrador: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        // Restaurar botón
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

// Función para abrir el modal de edición con los datos del administrador
async function openEditAdminModal(admin) {
    if (!editAdminModal) return;
    
    try {
        // Mostrar indicador de carga
        editAdminModal.style.display = 'block';
        editAdminForm.reset();
        
        // Cargar tiendas
        await loadStoresForEdit(admin.store_id);
        
        // Llenar el formulario con los datos del administrador
        document.getElementById('editAdminId').value = admin.id;
        document.getElementById('editAdminName').value = admin.name || '';
        document.getElementById('editAdminEmail').value = admin.email || '';
        document.getElementById('editAdminStatus').value = admin.status || 'Activo';
        
        // Si hay una tienda asignada, seleccionarla
        if (admin.store_id) {
            document.getElementById('editAdminStore').value = admin.store_id;
        }
        
        // Guardar referencia al administrador que se está editando
        currentEditingAdmin = admin;
        
    } catch (error) {
        console.error('Error al abrir el formulario de edición:', error);
        showNotification('Error al cargar los datos del administrador', 'error');
    }
}

// Función para cargar las tiendas en el select de edición
async function loadStoresForEdit(selectedStoreId = null) {
    const storeSelect = document.getElementById('editAdminStore');
    if (!storeSelect) return;
    
    try {
        const { data: stores, error } = await window.supabaseAdmin
            .from('stores')
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        
        // Limpiar opciones existentes
        storeSelect.innerHTML = '<option value="">SELECCIONE UNA TIENDA</option>';
        
        // Agregar tiendas al select
        if (stores && stores.length > 0) {
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                if (selectedStoreId && store.id === selectedStoreId) {
                    option.selected = true;
                }
                storeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar las tiendas para edición:', error);
    }
}
