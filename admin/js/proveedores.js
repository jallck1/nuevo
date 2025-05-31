// Estado de la aplicación
let currentPage = 1;
const itemsPerPage = 10;
let totalItems = 0;
let storeId = null;
let searchQuery = '';

// Referencias a elementos del DOM
let suppliersTableBody, loading, currentPageInput, totalItemsSpan, showingFromSpan, showingToSpan;
let totalPagesSpan, prevPageBtn, nextPageBtn, searchSuppliersInput;

// Elementos del menú de usuario y notificaciones
let userMenuButton, userDropdown, notificationsButton, notificationsDropdown, logoutBtn;
let userInitialsElement, userAvatarElement, dropdownUserName, dropdownUserEmail;

// Función para inicializar elementos del DOM
function initElements() {
    console.log('Inicializando elementos del DOM...');
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
    
    // Obtener referencias a los elementos del menú de usuario
    userMenuButton = document.getElementById('user-menu-button');
    userDropdown = document.getElementById('user-dropdown');
    userInitialsElement = document.getElementById('user-initials');
    userAvatarElement = document.getElementById('user-avatar');
    dropdownUserName = document.getElementById('dropdown-user-name');
    dropdownUserEmail = document.getElementById('dropdown-user-email');
    notificationsButton = document.getElementById('notifications-button');
    notificationsDropdown = document.getElementById('notifications-dropdown');
    logoutBtn = document.getElementById('logout-btn');

    console.log('Elementos del DOM inicializados');
    
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

// Función para generar PDF de entrada de almacén
function generarEntradaAlmacenPDF(datos) {
    try {
        // Usar jsPDF desde el objeto global
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración del documento
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = 20;
        
        // Logo y encabezado
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('ENTRADA DE ALMACÉN', pageWidth - margin - 80, y);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        y += 5;
        doc.text(`N° ${datos.numeroEntrada}`, pageWidth - margin - 80, y);
        
        // Información de la empresa
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('HORIZONT', margin, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
        doc.setFontSize(10);
        doc.text('RUC: 20605929281', margin, y);
        y += 5;
        doc.text('Av. Los Girasoles 123', margin, y);
        y += 5;
        doc.text('Lima, Perú', margin, y);
        y += 5;
        doc.text('Tel: (01) 123-4567', margin, y);
        y += 10;
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        // Información de la entrada
        doc.setFont('helvetica', 'bold');
        doc.text('Tipo de Movimiento:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text('Entrada por compra a proveedor', margin + 50, y);
        y += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Proveedor:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.proveedor, margin + 30, y);
        y += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.fecha, margin + 20, y);
        y += 10;
        
        // Tabla de detalles
        const headers = [['Código', 'Producto', 'Cant.', 'P. Unit.', 'Total']];
        const data = [
            [
                datos.producto.codigo || 'N/A', 
                datos.producto.nombre, 
                datos.cantidad.toString(), 
                `S/ ${datos.producto.precio_unitario?.toFixed(2) || '0.00'}`, 
                `S/ ${(datos.cantidad * (datos.producto.precio_unitario || 0)).toFixed(2)}`
            ],
            ['', '', '', 'Subtotal:', `S/ ${(datos.cantidad * (datos.producto.precio_unitario || 0)).toFixed(2)}`],
            ['', '', '', 'IGV (18%):', 'S/ 0.00'],
            ['', '', '', 'TOTAL:', `S/ ${(datos.cantidad * (datos.producto.precio_unitario || 0)).toFixed(2)}`]
        ];
        
        doc.autoTable({
            startY: y,
            head: headers,
            body: data,
            margin: { left: margin },
            styles: { 
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 80 },
                2: { cellWidth: 15 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 }
            },
            didDrawPage: function(data) {
                // Pie de página
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                doc.setFontSize(8);
                doc.text('Documento generado automáticamente', pageWidth / 2, pageHeight - 20, { align: 'center' });
                doc.text('Horizont - Control de Inventarios', pageWidth / 2, pageHeight - 15, { align: 'center' });
            }
        });
        
        // Guardar el PDF
        doc.save(`Entrada-Almacen-${datos.numeroEntrada}.pdf`);
        
        return true;
    } catch (error) {
        console.error('Error al generar el PDF de entrada de almacén:', error);
        return false;
    }
}

// Función para actualizar el stock de un producto
async function updateProductStock(productId, quantityToAdd, supplierId = null) {
    if (!productId || !quantityToAdd || quantityToAdd <= 0) return null;
    
    try {
        // Obtener el stock actual del producto y su información
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
            
        if (productError) throw productError;
        if (!product) throw new Error('Producto no encontrado');
        
        // Calcular el nuevo stock
        const newStock = (parseInt(product.stock) || 0) + parseInt(quantityToAdd);
        
        // Actualizar el stock del producto
        const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ 
                stock: newStock,
                updated_at: new Date().toISOString()
            })
            .eq('id', productId)
            .select();
            
        if (updateError) throw updateError;
        
        // Si se proporcionó un ID de proveedor, generar el PDF de entrada de almacén
        if (supplierId) {
            // Obtener información del proveedor
            const { data: supplier, error: supplierError } = await supabase
                .from('suppliers')
                .select('name')
                .eq('id', supplierId)
                .single();
                
            if (!supplierError && supplier) {
                // Generar número de entrada (año-mes-dia-numero-aleatorio)
                const ahora = new Date();
                const numeroEntrada = `E-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
                
                // Generar PDF de entrada de almacén
                generarEntradaAlmacenPDF({
                    numeroEntrada: numeroEntrada,
                    proveedor: supplier.name || 'Proveedor no especificado',
                    fecha: ahora.toLocaleDateString('es-PE', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    producto: {
                        codigo: product.code || product.id,
                        nombre: product.name,
                        precio_unitario: product.price || 0
                    },
                    cantidad: parseInt(quantityToAdd)
                });
            }
        }
        
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
                await updateProductStock(productId, stockToAdd, supplierId);
                showSuccess(`Proveedor actualizado y se agregaron ${stockToAdd} unidades al stock del producto. Se generó la entrada de almacén.`);
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
                // Usar el ID del proveedor recién creado
                await updateProductStock(productId, stockToAdd, result[0]?.id);
                showSuccess(`Proveedor creado y se agregaron ${stockToAdd} unidades al stock del producto. Se generó la entrada de almacén.`);
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

// Función para actualizar la notificación en la campanita
function actualizarNotificacionStock(estado, cantidad = 0, productos = []) {
  const notificationBadge = document.getElementById('notification-badge');
  const notificationList = document.getElementById('notification-list');
  
  // Verificar si los elementos existen
  if (!notificationList) {
    console.warn('❌ No se encontró el elemento notification-list');
    return; // Salir si no existe el elemento
  }
  
  // Limpiar notificaciones anteriores
  notificationList.innerHTML = '';
  
  // Configurar notificación según el estado
  if (estado === 'bajo') {
    // Notificación para stock bajo
    notificationBadge.classList.remove('hidden');
    notificationBadge.textContent = cantidad > 9 ? '9+' : cantidad.toString();
    notificationBadge.classList.remove('bg-blue-500', 'bg-green-500');
    notificationBadge.classList.add('bg-yellow-500');
    
    // Agregar notificación a la lista
    const notificationItem = document.createElement('a');
    notificationItem.href = '#';
    notificationItem.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    notificationItem.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <i class="fas fa-exclamation-triangle text-yellow-500"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">Stock Bajo</p>
          <p class="text-xs text-gray-500">${cantidad} productos con stock bajo</p>
        </div>
      </div>
    `;
    notificationList.appendChild(notificationItem);
    
  } else if (estado === 'exceso') {
    // Notificación para exceso de stock
    notificationBadge.classList.remove('hidden');
    notificationBadge.textContent = cantidad > 9 ? '9+' : cantidad.toString();
    notificationBadge.classList.remove('bg-yellow-500', 'bg-green-500');
    notificationBadge.classList.add('bg-blue-500');
    
    // Agregar notificación a la lista
    const notificationItem = document.createElement('a');
    notificationItem.href = '#';
    notificationItem.className = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    notificationItem.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <i class="fas fa-boxes text-blue-500"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-900">Exceso de Stock</p>
          <p class="text-xs text-gray-500">${cantidad} productos con exceso de stock</p>
        </div>
      </div>
    `;
    notificationList.appendChild(notificationItem);
    
  } else {
    // Estado óptimo - Ocultar notificación
    if (notificationBadge) {
      notificationBadge.classList.add('hidden');
    }
  }
}

// Función para verificar y mostrar el estado del stock
async function checkStockBajo() {
  console.log('🔍 Verificando estado del stock...');
  const alertasContainer = document.getElementById('alertas-container');
  
  // Verificar si el contenedor de alertas existe
  if (!alertasContainer) {
    console.error('❌ No se encontró el contenedor de alertas');
    // Intentar crear el contenedor si no existe
    const mainContent = document.querySelector('main');
    if (mainContent) {
      const newAlertContainer = document.createElement('div');
      newAlertContainer.id = 'alertas-container';
      newAlertContainer.className = 'w-full mb-6';
      mainContent.prepend(newAlertContainer);
      console.log('✅ Contenedor de alertas creado dinámicamente');
      return checkStockBajo(); // Volver a intentar después de crear el contenedor
    }
    return;
  }

  try {
    // Obtener todos los productos
    console.log('🔎 Consultando productos...');
    const { data: todosProductos, error: errorTodos } = await supabase
      .from('products')
      .select('*')
      .order('stock', { ascending: true });

    if (errorTodos) {
      console.error('❌ Error en la consulta de productos:', errorTodos);
      throw errorTodos;
    }

    // Filtrar productos por estado
    const productosBajoStock = todosProductos.filter(p => p.stock < 5);
    const productosExcesoStock = todosProductos.filter(p => p.stock > 5000);

    // Determinar el estado principal (prioridad: bajo > exceso > óptimo)
    if (productosBajoStock.length > 0) {
      // Estado: Stock Bajo
      console.log(`⚠️ Se encontraron ${productosBajoStock.length} productos con stock bajo`);
      actualizarNotificacionStock('bajo', productosBajoStock.length, productosBajoStock);
      
      alertasContainer.innerHTML = `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fas fa-exclamation-triangle text-yellow-400 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">
                <strong>¡Atención!</strong> Hay ${productosBajoStock.length} productos con stock bajo (menos de 5 unidades).
                <a href="proveedores.html" class="font-medium text-yellow-700 underline hover:text-yellow-600">
                  Ver productos
                </a>
              </p>
              <div class="mt-2 text-sm text-yellow-700">
                <p>Productos con stock crítico:</p>
                <ul class="list-disc pl-5 mt-1">
                  ${productosBajoStock.slice(0, 3).map(p => 
                    `<li>${p.name || 'Producto sin nombre'} - ${p.stock} unidades</li>`
                  ).join('')}
                  ${productosBajoStock.length > 3 ? `<li>...y ${productosBajoStock.length - 3} más</li>` : ''}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Si también hay exceso de stock, mostrarlo como advertencia secundaria
      if (productosExcesoStock.length > 0) {
        alertasContainer.innerHTML += `
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-boxes text-blue-400 text-xl"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-blue-700">
                  <strong>Exceso de stock:</strong> Hay ${productosExcesoStock.length} productos con más de 5000 unidades.
                </p>
              </div>
            </div>
          </div>
        `;
      }
      
    } else if (productosExcesoStock.length > 0) {
      // Estado: Exceso de Stock
      console.log(`ℹ️ Se encontraron ${productosExcesoStock.length} productos con exceso de stock`);
      actualizarNotificacionStock('exceso', productosExcesoStock.length, productosExcesoStock);
      
      alertasContainer.innerHTML = `
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fas fa-boxes text-blue-400 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">
                <strong>Exceso de stock:</strong> Hay ${productosExcesoStock.length} productos con más de 5000 unidades.
                <a href="proveedores.html" class="font-medium text-blue-700 underline hover:text-blue-600">
                  Ver productos
                </a>
              </p>
              <div class="mt-2 text-sm text-blue-700">
                <p>Productos con exceso de stock:</p>
                <ul class="list-disc pl-5 mt-1">
                  ${productosExcesoStock.slice(0, 3).map(p => 
                    `<li>${p.name || 'Producto sin nombre'} - ${p.stock} unidades</li>`
                  ).join('')}
                  ${productosExcesoStock.length > 3 ? `<li>...y ${productosExcesoStock.length - 3} más</li>` : ''}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
      
    } else {
      // Estado: Stock Óptimo
      console.log('✅ Estado de stock óptimo');
      actualizarNotificacionStock('optimo');
      
      alertasContainer.innerHTML = `
        <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="fas fa-check-circle text-green-400 text-xl"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">
                <strong>¡Excelente!</strong> Todos los productos tienen niveles de stock óptimos (entre 5 y 5000 unidades).
              </p>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Error en checkStockBajo:', error);
  }
}

// Función para cargar el perfil del usuario
async function loadUserProfile() {
    try {
        console.log('Cargando perfil del usuario...');
        
        // Asegurarse de que los elementos del DOM estén disponibles
        userAvatarElement = document.getElementById('user-avatar');
        userInitialsElement = document.getElementById('user-initials');
        dropdownUserName = document.getElementById('dropdown-user-name');
        dropdownUserEmail = document.getElementById('dropdown-user-email');
        
        console.log('Elementos del perfil:', { userAvatarElement, userInitialsElement, dropdownUserName, dropdownUserEmail });
        
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
            console.error('No hay usuario autenticado');
            return;
        }
        
        console.log('Usuario autenticado:', user);
        
        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.error('Error al cargar el perfil:', profileError);
            throw profileError;
        }
        
        console.log('Perfil cargado:', profile);
        
        // Actualizar la interfaz de usuario con la información del perfil
        const userName = profile.full_name || user.email.split('@')[0];
        const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        // Actualizar elementos en la barra superior
        if (userInitialsElement) {
            userInitialsElement.textContent = userInitials;
            console.log('Iniciales del usuario actualizadas:', userInitials);
        }
        
        if (dropdownUserName) {
            dropdownUserName.textContent = userName;
            console.log('Nombre de usuario actualizado:', userName);
        }
        
        if (dropdownUserEmail) {
            dropdownUserEmail.textContent = user.email;
            console.log('Email del usuario actualizado:', user.email);
        }
        
        // Actualizar avatar si existe
        if (userAvatarElement) {
            if (profile.avatar_url) {
                console.log('Actualizando avatar con URL:', profile.avatar_url);
                userAvatarElement.src = profile.avatar_url;
                userAvatarElement.onload = function() {
                    console.log('Imagen de perfil cargada correctamente');
                    userAvatarElement.classList.remove('hidden');
                    if (userInitialsElement) userInitialsElement.classList.add('hidden');
                };
                userAvatarElement.onerror = function() {
                    console.error('Error al cargar la imagen de perfil');
                    userAvatarElement.classList.add('hidden');
                    if (userInitialsElement) userInitialsElement.classList.remove('hidden');
                };
            } else {
                console.log('No se encontró avatar para el usuario');
                userAvatarElement.classList.add('hidden');
                if (userInitialsElement) userInitialsElement.classList.remove('hidden');
            }
        } else {
            console.error('Elemento userAvatarElement no encontrado');
        }
        
        console.log('Perfil del usuario cargado correctamente');
    } catch (error) {
        console.error('Error al cargar el perfil del usuario:', error);
    }
}

// Función para alternar el menú de notificaciones
function toggleNotificationsMenu() {
  console.log('Alternando menú de notificaciones...');
  
  // Asegurarse de que los elementos del DOM estén disponibles
  if (!notificationsDropdown) notificationsDropdown = document.getElementById('notifications-dropdown');
  if (!notificationsButton) notificationsButton = document.getElementById('notifications-button');
  if (!userDropdown) userDropdown = document.getElementById('user-dropdown');
  
  console.log('Elementos del menú de notificaciones:', { notificationsDropdown, notificationsButton, userDropdown });
  
  if (notificationsDropdown) {
    const isHidden = notificationsDropdown.classList.contains('hidden');
    console.log('Estado actual del menú de notificaciones:', isHidden ? 'oculto' : 'visible');
    
    // Cerrar menú de usuario si está abierto
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      userDropdown.classList.add('hidden');
      console.log('Menú de usuario cerrado');
    }
    
    // Alternar visibilidad del menú de notificaciones
    if (isHidden) {
      notificationsDropdown.classList.remove('hidden');
      console.log('Menú de notificaciones mostrado');
    } else {
      notificationsDropdown.classList.add('hidden');
      console.log('Menú de notificaciones ocultado');
    }
  } else {
    console.error('Elemento notificationsDropdown no encontrado');
  }
}

// Función para alternar el menú de usuario
function toggleUserMenu() {
    console.log('Alternando menú de usuario...');
    
    // Asegurarse de que los elementos del DOM estén disponibles
    if (!userDropdown) userDropdown = document.getElementById('user-dropdown');
    if (!userMenuButton) userMenuButton = document.getElementById('user-menu-button');
    if (!notificationsDropdown) notificationsDropdown = document.getElementById('notifications-dropdown');
    
    console.log('Elementos del menú de usuario:', { userDropdown, userMenuButton, notificationsDropdown });
    
    if (userDropdown) {
        const isHidden = userDropdown.classList.contains('hidden');
        console.log('Estado actual del menú de usuario:', isHidden ? 'oculto' : 'visible');
        
        // Cerrar menú de notificaciones si está abierto
        if (notificationsDropdown && !notificationsDropdown.classList.contains('hidden')) {
            notificationsDropdown.classList.add('hidden');
            console.log('Menú de notificaciones cerrado');
        }
        
        // Alternar visibilidad del menú de usuario
        if (isHidden) {
            userDropdown.classList.remove('hidden');
            console.log('Menú de usuario mostrado');
        } else {
            userDropdown.classList.add('hidden');
            console.log('Menú de usuario ocultado');
        }
    } else {
        console.error('Elemento userDropdown no encontrado');
    }
}

// Función para configurar el menú de usuario
function setupUserMenu() {
    console.log('Configurando menú de usuario...');
    
    // Si los elementos no están definidos, intentar obtenerlos nuevamente
    if (!userMenuButton) userMenuButton = document.getElementById('user-menu-button');
    if (!userDropdown) userDropdown = document.getElementById('user-dropdown');
    if (!userInitialsElement) userInitialsElement = document.getElementById('user-initials');
    if (!userAvatarElement) userAvatarElement = document.getElementById('user-avatar');
    if (!dropdownUserName) dropdownUserName = document.getElementById('dropdown-user-name');
    if (!dropdownUserEmail) dropdownUserEmail = document.getElementById('dropdown-user-email');
    
    console.log('Elementos del menú de usuario:', { userMenuButton, userDropdown, userInitialsElement, userAvatarElement, dropdownUserName, dropdownUserEmail });
    
    if (userMenuButton && userDropdown) {
        console.log('Añadiendo event listeners al menú de usuario');
        // Eliminar event listeners existentes para evitar duplicados
        const newButton = userMenuButton.cloneNode(true);
        userMenuButton.parentNode.replaceChild(newButton, userMenuButton);
        userMenuButton = newButton;
        
        // Añadir event listener para el clic
        userMenuButton.onclick = function(e) {
            e.stopPropagation();
            toggleUserMenu();
        };
        
        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', (e) => {
            if (userDropdown && !userDropdown.contains(e.target) && 
                userMenuButton && !userMenuButton.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    } else {
        console.error('No se pudo configurar el menú de usuario: elementos no encontrados');
    }
}

// Función para configurar el menú de notificaciones
function setupNotificationsMenu() {
    console.log('Configurando menú de notificaciones...');
    
    // Si los elementos no están definidos, intentar obtenerlos nuevamente
    if (!notificationsButton) notificationsButton = document.getElementById('notifications-button');
    if (!notificationsDropdown) notificationsDropdown = document.getElementById('notifications-dropdown');
    
    console.log('Elementos del menú de notificaciones:', { notificationsButton, notificationsDropdown });
    
    if (notificationsButton && notificationsDropdown) {
        console.log('Añadiendo event listeners al menú de notificaciones');
        // Eliminar event listeners existentes para evitar duplicados
        const newButton = notificationsButton.cloneNode(true);
        notificationsButton.parentNode.replaceChild(newButton, notificationsButton);
        notificationsButton = newButton;
        
        // Añadir event listener para el clic
        notificationsButton.onclick = function(e) {
            e.stopPropagation();
            toggleNotificationsMenu();
        };
        
        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', (e) => {
            if (notificationsDropdown && !notificationsDropdown.contains(e.target) && 
                notificationsButton && !notificationsButton.contains(e.target)) {
                notificationsDropdown.classList.add('hidden');
            }
        });
    } else {
        console.error('No se pudo configurar el menú de notificaciones: elementos no encontrados');
    }
}

// Función para configurar el cierre de sesión
function setupLogout() {
    logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                const { error } = await window.supabase.auth.signOut();
                if (error) throw error;
                
                // Redirigir a la página de inicio de sesión
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                showError('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
            }
        });
    }
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
        initElements();
        
        // Configurar menú de usuario y notificaciones
        console.log('Configurando menú de usuario y notificaciones...');
        setupUserMenu();
        setupNotificationsMenu();
        setupLogout();
        
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
        
        // Cargar proveedores
        console.log('Cargando proveedores...');
        await loadSuppliers();
        
        // Verificar estado del stock
        await checkStockBajo();
        
        // Configurar actualización periódica de datos (cada minuto)
        setInterval(loadSuppliers, 60000);
        
        // Configurar actualización periódica del estado del stock (cada 5 minutos)
        setInterval(checkStockBajo, 5 * 60 * 1000);
        
        // Ocultar loading
        showLoading(false);
        
        console.log('✅ Aplicación inicializada correctamente');
        
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

// Hacer que las funciones estén disponibles globalmente
window.toggleUserMenu = toggleUserMenu;
window.toggleNotificationsMenu = toggleNotificationsMenu;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, inicializando aplicación...');
    
    try {
        // Inicializar la aplicación
        await initApp();
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        
        // Si hay un error de autenticación, redirigir a login
        if (error.message?.includes('authentication') || error.message?.includes('No hay usuario autenticado')) {
            console.log('Redirigiendo a login...');
            window.location.href = 'login.html';
        } else {
            // Mostrar mensaje de error al usuario
            showError('Error al cargar la aplicación. Por favor, recarga la página.');
        }
    }
});