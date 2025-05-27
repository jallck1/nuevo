// Estado de la aplicación
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let storeId = null;
let searchQuery = '';

// Referencias a elementos del DOM
let suppliersTableBody, loading, currentPageInput, totalItemsSpan, showingFromSpan, showingToSpan;
let totalPagesSpan, prevPageBtn, nextPageBtn, searchSuppliersInput;

// Función para inicializar elementos del DOM
function initElements() {
    // Obtener referencias a los elementos del DOM
    suppliersTableBody = document.getElementById('suppliersTableBody');
    loading = document.getElementById('loading');
    currentPageInput = document.getElementById('currentPage');
    totalItemsSpan = document.getElementById('totalItems');
    showingFromSpan = document.getElementById('showingFrom');
    showingToSpan = document.getElementById('showingTo');
    totalPagesSpan = document.getElementById('totalPages');
    prevPageBtn = document.getElementById('prevPage');
    nextPageBtn = document.getElementById('nextPage');
    searchSuppliersInput = document.getElementById('searchSuppliers');

    // Configurar manejadores de eventos
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
    if (searchSuppliersInput) {
        searchSuppliersInput.addEventListener('input', debounce(() => {
            searchQuery = searchSuppliersInput.value.trim();
            currentPage = 1;
            loadSuppliers();
        }, 300));
    }
    
    // No hay filtros de estado activo/inactivo
    
    // Configurar botón de nuevo proveedor
    const btnNewSupplier = document.getElementById('btnNewSupplier');
    if (btnNewSupplier) {
        btnNewSupplier.addEventListener('click', showNewSupplierModal);
    }
    
    // Configurar botones del modal
    const btnSaveSupplier = document.getElementById('btnSaveSupplier');
    if (btnSaveSupplier) {
        btnSaveSupplier.addEventListener('click', saveSupplier);
    }
    
    const btnCancelSupplier = document.getElementById('btnCancelSupplier');
    if (btnCancelSupplier) {
        btnCancelSupplier.addEventListener('click', hideSupplierModal);
    }
    
    // Configurar sidebar
    setupSidebar();
}

// Configurar el sidebar para móviles
function setupSidebar() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay hidden';
    document.body.appendChild(sidebarOverlay);
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
            sidebarOverlay.classList.remove('hidden');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('hidden');
            sidebarOverlay.classList.add('hidden');
        });
    }
    
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        sidebarOverlay.classList.add('hidden');
    });
    
    // Cerrar sidebar al hacer clic en un enlace en móviles
    const navLinks = document.querySelectorAll('#sidebar nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.add('hidden');
                sidebarOverlay.classList.add('hidden');
            }
        });
    });
}

// Función para mostrar/ocultar el indicador de carga
function showLoading(show = true) {
    if (!loading) return;
    
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Función para mostrar mensajes de error
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3b82f6'
    });
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: message,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
    });
}

// Función para obtener el store_id del usuario
async function getUserStoreId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        
        // Obtener el perfil del usuario para obtener el store_id
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (error) throw error;
        
        return profile.store_id;
    } catch (error) {
        console.error('Error al obtener el store_id:', error);
        showError('No se pudo obtener la información de la tienda');
        return null;
    }
}

// Cargar proveedores
async function loadSuppliers() {
    try {
        showLoading(true);
        
        // Obtener el ID de la tienda
        storeId = await getUserStoreId();
        if (!storeId) return;
        
        console.log('Cargando proveedores para storeId:', storeId);
        
        if (searchQuery) {
            console.log('Buscando proveedores con término:', searchQuery);
        }
        
        // Obtener los proveedores
        const { data: suppliers, error, count } = await supabase
            .from('suppliers')
            .select('*', { count: 'exact' })
            .eq('store_id', storeId)
            .order('name', { ascending: true })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
        
        if (error) {
            console.error('Error en la consulta de proveedores:', error);
            throw error;
        }
        
        console.log('Proveedores obtenidos:', suppliers);
        
        // Si no hay proveedores, renderizar lista vacía
        if (!suppliers || suppliers.length === 0) {
            console.log('No se encontraron proveedores');
            renderSuppliers([]);
            updatePaginationUI(0, 0);
            return;
        }
        
        // Aplicar filtro de búsqueda si existe
        let filteredSuppliers = suppliers;
        if (searchQuery) {
            const search = searchQuery.toLowerCase().trim();
            filteredSuppliers = suppliers.filter(supplier => {
                const name = supplier.name?.toLowerCase() || '';
                const contactPerson = supplier.contact_person?.toLowerCase() || '';
                const email = supplier.email?.toLowerCase() || '';
                const phone = supplier.phone?.toLowerCase() || '';
                const category = supplier.category?.toLowerCase() || '';
                
                return name.includes(search) || 
                       contactPerson.includes(search) ||
                       email.includes(search) ||
                       phone.includes(search) ||
                       category.includes(search);
            });
            
            console.log(`Encontrados ${filteredSuppliers.length} proveedores que coinciden con la búsqueda`);
        }
        
        // Actualizar la interfaz
        totalItems = filteredSuppliers.length > 0 ? count : 0;
        updatePaginationUI(totalItems, Math.ceil(totalItems / itemsPerPage));
        renderSuppliers(filteredSuppliers);
        
    } catch (error) {
        console.error('Error al cargar los proveedores:', error);
        showError('Error al cargar los proveedores: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para renderizar los proveedores en la tabla
function renderSuppliers(suppliers) {
    if (!suppliersTableBody) return;
    
    suppliersTableBody.innerHTML = '';
    
    if (suppliers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center py-4 text-gray-500">
                No se encontraron proveedores
            </td>
        `;
        suppliersTableBody.appendChild(row);
        return;
    }
    
    suppliers.forEach(supplier => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${supplier.name || 'Sin nombre'}</div>
                <div class="text-xs text-gray-500">${supplier.category || 'Sin categoría'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${supplier.contact_person || 'No especificado'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${supplier.phone || 'No especificado'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${supplier.email || 'No especificado'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Activo
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editSupplier('${supplier.id}')" 
                        class="text-indigo-600 hover:text-indigo-900"
                        title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        suppliersTableBody.appendChild(row);
    });
}

// Función para actualizar la interfaz de paginación
function updatePaginationUI(totalItems, totalPages) {
    if (!totalItemsSpan || !showingFromSpan || !showingToSpan || !totalPagesSpan || !currentPageInput) return;
    
    totalItemsSpan.textContent = totalItems;
    totalPagesSpan.textContent = totalPages;
    currentPageInput.textContent = currentPage;
    
    const from = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const to = Math.min(currentPage * itemsPerPage, totalItems);
    
    showingFromSpan.textContent = from;
    showingToSpan.textContent = to;
    
    // Habilitar/deshabilitar botones de paginación
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

// Función para cambiar de página
function changePage(delta) {
    const newPage = currentPage + delta;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadSuppliers();
    }
}

// Función para establecer el filtro actual
function setFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    
    // Actualizar botones de filtro activo
    updateActiveFilterButton(filter);
    
    // Cargar proveedores con el nuevo filtro
    loadSuppliers();
}

// Función para actualizar el botón de filtro activo
function updateActiveFilterButton(activeFilter) {
    const filterButtons = [
        { id: 'all', element: filterAllBtn },
        { id: 'active', element: filterActiveBtn },
        { id: 'inactive', element: filterInactiveBtn }
    ];
    
    filterButtons.forEach(btn => {
        if (btn.element) {
            if (btn.id === activeFilter) {
                btn.element.classList.add('bg-blue-100', 'text-blue-800');
                btn.element.classList.remove('text-gray-600', 'hover:bg-gray-100');
            } else {
                btn.element.classList.remove('bg-blue-100', 'text-blue-800');
                btn.element.classList.add('text-gray-600', 'hover:bg-gray-100');
            }
        }
    });
}

// Función para mostrar el modal de nuevo/editar proveedor
function showNewSupplierModal() {
    const modal = document.getElementById('supplierModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('supplierForm');
    
    if (!modal || !modalTitle || !form) return;
    
    // Restablecer el formulario
    form.reset();
    document.getElementById('supplierId').value = '';
    
    // Actualizar título del modal
    modalTitle.textContent = 'Nuevo Proveedor';
    
    // Mostrar el modal
    modal.classList.remove('hidden');
}

// Función para cargar los productos de un proveedor
async function loadSupplierProducts(supplierId) {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, stock')
            .eq('supplier_id', supplierId)
            .order('name', { ascending: true });
            
        if (error) throw error;
        
        const productSelect = document.getElementById('productSelect');
        if (!productSelect) return;
        
        // Guardar la selección actual
        const currentValue = productSelect.value;
        
        // Limpiar opciones excepto la primera
        while (productSelect.options.length > 1) {
            productSelect.remove(1);
        }
        
        // Agregar los productos al select
        if (products && products.length > 0) {
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Stock: ${product.stock})`;
                option.setAttribute('data-stock', product.stock);
                productSelect.appendChild(option);
            });
            
            // Restaurar la selección anterior si existe
            if (currentValue) {
                productSelect.value = currentValue;
            }
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay productos para este proveedor';
            option.disabled = true;
            productSelect.appendChild(option);
        }
        
        return products;
    } catch (error) {
        console.error('Error al cargar los productos del proveedor:', error);
        showError('Error al cargar los productos del proveedor');
        return [];
    }
}

// Función para editar un proveedor
async function editSupplier(supplierId) {
    if (!supplierId) return;
    
    showLoading(true);
    
    try {
        // Obtener los datos del proveedor
        const { data: supplier, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', supplierId)
            .single();
            
        if (error) throw error;
        if (!supplier) {
            showError('No se encontró el proveedor');
            return;
        }
        
        // Mostrar el modal con los datos del proveedor
        const modal = document.getElementById('supplierModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('supplierForm');
        
        if (!modal || !modalTitle || !form) return;
        
        // Llenar el formulario con los datos del proveedor
        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('name').value = supplier.name || '';
        document.getElementById('contactPerson').value = supplier.contact_person || '';
        document.getElementById('email').value = supplier.email || '';
        document.getElementById('phone').value = supplier.phone || '';
        document.getElementById('address').value = supplier.address || '';
        document.getElementById('category').value = supplier.category || '';
        document.getElementById('notes').value = supplier.notes || '';
        
        // Limpiar campos de stock
        document.getElementById('stockToAdd').value = '';
        
        // Cargar productos del proveedor
        await loadSupplierProducts(supplierId);
        
        // Actualizar título del modal
        modalTitle.textContent = 'Editar Proveedor';
        
        // Mostrar el modal
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error al obtener el proveedor:', error);
        showError('Error al cargar los datos del proveedor: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para actualizar el stock de un producto
async function updateProductStock(productId, quantityToAdd) {
    if (!productId || !quantityToAdd || quantityToAdd <= 0) return null;
    
    try {
        // Obtener el stock actual del producto
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single();
            
        if (productError) throw productError;
        if (!product) throw new Error('Producto no encontrado');
        
        // Calcular el nuevo stock
        const newStock = (parseInt(product.stock) || 0) + parseInt(quantityToAdd);
        
        // Actualizar el stock del producto
        const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', productId)
            .select();
            
        if (updateError) throw updateError;
        
        return updatedProduct;
    } catch (error) {
        console.error('Error al actualizar el stock del producto:', error);
        throw error;
    }
}

// Función para guardar un proveedor (crear o actualizar)
async function saveSupplier() {
    try {
        const form = document.getElementById('supplierForm');
        if (!form) return;
        
        const supplierId = document.getElementById('supplierId').value;
        const name = document.getElementById('name').value.trim();
        const stockToAdd = parseInt(document.getElementById('stockToAdd').value) || 0;
        const productId = document.getElementById('productSelect').value;
        
        // Validaciones básicas
        if (!name) {
            showError('El nombre del proveedor es obligatorio');
            return;
        }
        
        // Validar que si se ingresó stock, se haya seleccionado un producto
        if (stockToAdd > 0 && !productId) {
            showError('Debe seleccionar un producto para actualizar el stock');
            return;
        }
        
        showLoading(true);
        
        const supplierData = {
            name: name,
            contact_person: document.getElementById('contactPerson').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            category: document.getElementById('category').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            store_id: storeId || (await getUserStoreId())
        };
        
        let result;
        
        if (supplierId) {
            // Actualizar proveedor existente
            const { data, error } = await supabase
                .from('suppliers')
                .update(supplierData)
                .eq('id', supplierId)
                .select();
                
            if (error) throw error;
            result = data;
            
            // Si se especificó stock para agregar, actualizar el producto
            if (stockToAdd > 0 && productId) {
                await updateProductStock(productId, stockToAdd);
                showSuccess(`Proveedor actualizado y se agregaron ${stockToAdd} unidades al stock del producto`);
            } else {
                showSuccess('Proveedor actualizado correctamente');
            }
        } else {
            // Crear nuevo proveedor
            const { data, error } = await supabase
                .from('suppliers')
                .insert([supplierData])
                .select();
                
            if (error) throw error;
            result = data;
            
            // Si se especificó stock para agregar, actualizar el producto
            if (stockToAdd > 0 && productId) {
                await updateProductStock(productId, stockToAdd);
                showSuccess(`Proveedor creado y se agregaron ${stockToAdd} unidades al stock del producto`);
            } else {
                showSuccess('Proveedor creado correctamente');
            }
        }
        
        // Ocultar el modal
        hideSupplierModal();
        
        // Recargar la lista de proveedores
        loadSuppliers();
        
    } catch (error) {
        console.error('Error al guardar el proveedor:', error);
        showError('Error al guardar el proveedor: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
    }
}

// Función para ocultar el modal de proveedor
function hideSupplierModal() {
    const modal = document.getElementById('supplierModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Función para debounce (retrasar ejecución de funciones)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Función para inicializar la aplicación
async function initApp() {
    try {
        console.log('Inicializando aplicación de proveedores...');
        
        // Verificar que Supabase esté disponible
        if (!window.supabase) {
            console.error('Error: Supabase no está disponible');
            showError('Error al inicializar la aplicación: No se pudo conectar con el servidor');
            return;
        }
        
        // Inicializar elementos del DOM
        console.log('Inicializando elementos del DOM...');
        initElements();
        
        // Verificar autenticación
        console.log('Verificando autenticación...');
        const { data: { user }, error: authError } = await window.supabase.auth.getUser();
        
        if (authError) {
            console.error('Error de autenticación:', authError);
            window.location.href = 'login.html';
            return;
        }
        
        if (!user) {
            console.log('Usuario no autenticado, redirigiendo a login...');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Usuario autenticado:', user.email);
        
        // Obtener el ID de la tienda del usuario
        console.log('Obteniendo ID de la tienda...');
        storeId = await getUserStoreId();
        
        if (!storeId) {
            showError('No se pudo obtener la tienda del usuario');
            return;
        }
        
        console.log('Store ID obtenido:', storeId);
        
        // Cargar proveedores
        console.log('Cargando proveedores...');
        await loadSuppliers();
        
        console.log('Aplicación de proveedores inicializada correctamente');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación de proveedores:', error);
        showError('Error al inicializar la aplicación: ' + (error.message || 'Error desconocido'));
        
        // Redirigir a login si hay error de autenticación
        if (error.message?.includes('authentication') || error.message?.includes('No hay usuario autenticado')) {
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