// Usar el cliente de Supabase desde window
const supabase = window.supabase;

// Configuración de paginación
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalItems = 0;
let totalPages = 1;
let products = [];

// Elementos del DOM
const productsTableBody = document.getElementById('products-table-body');
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const productForm = document.getElementById('product-form');
const searchInput = document.getElementById('search');
const categoryFilter = document.getElementById('category-filter');
const statusFilter = document.getElementById('status');

// Elementos de paginación
const currentPageInput = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const totalItemsSpan = document.getElementById('total-items');
const showingFromSpan = document.getElementById('showing-from');
const showingToSpan = document.getElementById('showing-to');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');

// Elementos del menú y perfil
const mobileMenuButton = document.getElementById('mobile-menu-button');
const desktopSidebar = document.getElementById('desktop-sidebar');
const mobileMenu = document.getElementById('mobile-menu');
const closeMobileMenu = document.getElementById('close-mobile-menu');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
const toggleSidebar = document.getElementById('toggle-sidebar');
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
let isDesktopSidebarCollapsed = false;

// Función para verificar autenticación
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Cargar proveedores desde Supabase
async function loadSuppliers() {
    try {
        console.log('Cargando proveedores...');
        
        // Obtener el store_id del usuario autenticado
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) throw new Error('No hay usuario autenticado');
        
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (!profile) throw new Error('No se pudo obtener el perfil del usuario');
        
        // Obtener proveedores del store del usuario
        const { data: suppliers, error } = await window.supabase
            .from('suppliers')
            .select('*')
            .eq('store_id', profile.store_id)
            .order('name', { ascending: true });
            
        if (error) throw error;
        
        console.log('Proveedores obtenidos:', suppliers);
        
        // Actualizar el select de proveedores
        const supplierSelect = document.getElementById('supplier');
        if (supplierSelect) {
            // Guardar la selección actual
            const currentValue = supplierSelect.value;
            
            // Limpiar opciones excepto la primera
            while (supplierSelect.options.length > 1) {
                supplierSelect.remove(1);
            }
            
            // Agregar los proveedores
            if (suppliers && suppliers.length > 0) {
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    supplierSelect.appendChild(option);
                });
                
                // Restaurar la selección anterior si existe
                if (currentValue) {
                    supplierSelect.value = currentValue;
                }
            }
        }
        
        return suppliers;
    } catch (error) {
        console.error('Error al cargar proveedores:', error);
        showError('No se pudieron cargar los proveedores. Por favor, intente de nuevo.');
        return [];
    }
}

// Cargar categorías desde Supabase
async function loadCategories() {
    try {
        console.log('Cargando categorías...');
        
        // Verificar si supabase está definido
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado correctamente');
        }
        
        // Obtener el store_id del usuario autenticado
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            throw new Error('No hay usuario autenticado');
        }
        
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        if (!profile) {
            console.error('No se pudo obtener el perfil del usuario');
            return [];
        }
        
        console.log('Cargando categorías para el store_id:', profile.store_id);
        
        // Obtener categorías del store del usuario
        const { data: categories, error } = await window.supabase
            .from('categories')
            .select('*')
            .eq('store_id', profile.store_id)
            .order('name', { ascending: true });
            
        if (error) throw error;
        
        console.log('Categorías obtenidas:', categories);
        
        // Actualizar los selects de categorías
        updateCategorySelects(categories);
        
        return categories;
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        showError('No se pudieron cargar las categorías. Por favor, intente de nuevo.');
        return [];
    }
}

// Actualizar los selects de categorías en el formulario y en el filtro
function updateCategorySelects(categories) {
    console.log('Actualizando selects de categorías con:', categories);
    
    // Actualizar el select del filtro de categorías
    const categoryFilter = document.getElementById('category-filter');
    const categorySelect = document.getElementById('categories'); // Cambiado de 'category' a 'categories'
    
    // Actualizar el select del filtro
    if (categoryFilter) {
        console.log('Actualizando filtro de categorías');
        // Guardar la selección actual
        const currentValue = categoryFilter.value;
        
        // Limpiar opciones excepto la primera
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Agregar la opción por defecto si no existe
        if (!categoryFilter.querySelector('option[value=""]')) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Todas las categorías';
            categoryFilter.appendChild(defaultOption);
        }
        
        // Agregar las categorías
        if (categories && categories.length > 0) {
            categories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categoryFilter.appendChild(option);
            });
            
            // Restaurar la selección anterior si existe
            if (currentValue) {
                categoryFilter.value = currentValue;
            }
        }
        
        console.log('Filtro de categorías actualizado:', categoryFilter.innerHTML);
    }
    
    // Actualizar el select del formulario de producto
    if (categorySelect) {
        console.log('Actualizando select de categorías en el formulario');
        // Guardar la selección actual
        const currentValue = categorySelect.value;
        
        // Limpiar opciones
        categorySelect.innerHTML = '';
        
        // Agregar la opción por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecciona una categoría';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        categorySelect.appendChild(defaultOption);
        
        // Agregar las categorías
        if (categories && categories.length > 0) {
            categories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
            
            // Restaurar la selección anterior si existe
            if (currentValue) {
                categorySelect.value = currentValue;
            }
        }
    }
    
    // Actualizar el select del modal de producto si existe
    const productCategorySelect = document.getElementById('category');
    if (productCategorySelect) {
        // Guardar la selección actual
        const currentValue = productCategorySelect.value;
        
        // Limpiar opciones excepto la primera
        while (productCategorySelect.options.length > 1) {
            productCategorySelect.remove(1);
        }
        
        // Agregar las categorías
        if (categories && categories.length > 0) {
            categories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                productCategorySelect.appendChild(option);
            });
            
            // Restaurar la selección anterior si existe
            if (currentValue) {
                productCategorySelect.value = currentValue;
            }
        }
    }
}

// Función para configurar el menú móvil
function setupMobileMenu() {
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            isMobileMenuOpen = !isMobileMenuOpen;
            if (mobileMenu) mobileMenu.classList.toggle('open', isMobileMenuOpen);
            if (mobileMenuOverlay) mobileMenuOverlay.classList.toggle('open', isMobileMenuOpen);
        });
    }

    if (closeMobileMenu) {
        closeMobileMenu.addEventListener('click', () => {
            isMobileMenuOpen = false;
            if (mobileMenu) mobileMenu.classList.remove('open');
            if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('open');
        });
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', () => {
            isMobileMenuOpen = false;
            if (mobileMenu) mobileMenu.classList.remove('open');
            mobileMenuOverlay.classList.remove('open');
        });
    }
}

// Función para configurar el menú de escritorio
function setupDesktopMenu() {
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed;
            if (desktopSidebar) {
                desktopSidebar.classList.toggle('collapsed', isDesktopSidebarCollapsed);
            }
            updateMainContent();
        });
    }
}

// Función para actualizar el contenido principal cuando se alterna el sidebar
function updateMainContent() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (window.innerWidth >= 768) {
        if (isDesktopSidebarCollapsed) {
            mainContent.style.marginLeft = '4rem';
            mainContent.style.width = 'calc(100% - 4rem)';
        } else {
            mainContent.style.marginLeft = '16rem';
            mainContent.style.width = 'calc(100% - 16rem)';
        }
    } else {
        mainContent.style.marginLeft = '0';
        mainContent.style.width = '100%';
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

// Inicializar la aplicación
async function initApp() {
    try {
        console.log('Iniciando aplicación...');
        
        // Verificar autenticación
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.log('Usuario no autenticado, redirigiendo...');
            return;
        }
        
        console.log('Usuario autenticado, configurando UI...');
        
        // Configurar menús
        setupMobileMenu();
        setupDesktopMenu();
        setupUserMenu();
        setupNotificationsMenu();
        setupLogout();
        
        // Cargar perfil del usuario
        await loadUserProfile();
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar categorías primero
        console.log('Cargando categorías...');
        await loadCategories();
        
        // Cargar proveedores
        console.log('Cargando proveedores...');
        await loadSuppliers();
        
        // Luego cargar productos
        console.log('Cargando productos...');
        await loadProducts();
        
        // Actualizar el contenido principal
        updateMainContent();
        
        // Manejar cambios de tamaño de ventana
        window.addEventListener('resize', updateMainContent);
        
        console.log('Aplicación iniciada correctamente');
    } catch (error) {
        console.error('Error en initApp:', error);
        showError('Error al iniciar la aplicación. Por favor, recarga la página.');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Botón de agregar producto
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductModal());
    }
    
    // Cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeProductModal);
    }
    
    // Cancelar edición
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeProductModal);
    }
    
    // Enviar formulario de producto
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Filtros
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            console.log('Filtro de categoría cambiado a:', categoryFilter.value);
            currentPage = 1; // Reiniciar a la primera página
            loadProducts();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            console.log('Filtro de estado cambiado a:', statusFilter.value);
            currentPage = 1; // Reiniciar a la primera página
            loadProducts();
        });
    }
    
    // Paginación
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    }
    
    if (currentPageInput) {
        currentPageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                    changePage(page);
                } else {
                    e.target.value = currentPage;
                }
            }
        });
    }
    
    // Delegación de eventos para los botones de editar y eliminar
    document.addEventListener('click', (e) => {
        // Botón de editar
        if (e.target.closest('.edit-product-btn')) {
            const button = e.target.closest('.edit-product-btn');
            const productId = button.getAttribute('data-id');
            editProduct(productId);
            return;
        }
        
        // Botón de eliminar
        if (e.target.closest('.delete-product-btn')) {
            const button = e.target.closest('.delete-product-btn');
            const productId = button.getAttribute('data-id');
            deleteProduct(productId);
            return;
        }
    });
}

// Cargar productos
async function loadProducts() {
    try {
        console.log('Iniciando carga de productos...');
        showLoading(true);
        
        // Verificar si supabase está definido
        if (!window.supabase) {
            throw new Error('Supabase no está inicializado correctamente');
        }
        
        // Obtener el usuario autenticado
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            throw new Error('No hay usuario autenticado');
        }
        
        console.log('Usuario autenticado:', user);
        
        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        if (!profile) {
            throw new Error('No se pudo obtener el perfil del usuario');
        }
        
        console.log('Perfil del usuario:', profile);
        
        // Primero, verifiquemos si hay productos en la base de datos
        const { data: allProducts, error: allProductsError } = await window.supabase
            .from('products')
            .select('*')
            .eq('store_id', profile.store_id);
            
        console.log('Todos los productos en la base de datos:', allProducts);
        
        if (allProductsError) {
            console.error('Error al obtener todos los productos:', allProductsError);
            throw allProductsError;
        }
        
        // Si no hay productos, mostramos un mensaje
        if (!allProducts || allProducts.length === 0) {
            console.log('No hay productos en la base de datos para este store_id');
            renderProducts([]);
            return;
        }
        
        // Construir consulta base con el store_id del usuario
        let query = window.supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('store_id', profile.store_id);
            
        if (!query) {
            throw new Error('No se pudo inicializar la consulta a Supabase');
        }
        
        // Obtener todas las categorías para este store
        const { data: categories, error: categoriesError } = await window.supabase
            .from('categories')
            .select('*')
            .eq('store_id', profile.store_id);
            
        if (categoriesError) {
            console.error('Error al cargar categorías:', categoriesError);
            throw categoriesError;
        }
        
        // Crear un mapa de categorías para búsqueda rápida
        const categoriesMap = {};
        if (categories && categories.length > 0) {
            categories.forEach(cat => {
                categoriesMap[cat.id] = cat;
            });
        }
        
        // Aplicar filtros
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        const category = categoryFilter && categoryFilter.value ? categoryFilter.value : '';
        
        console.log('Filtros aplicados (filtro de estado desactivado temporalmente):', { searchTerm, category });
        
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        
        if (category) {
            query = query.eq('category_id', category);
        }
        
        // Filtro de estado desactivado temporalmente
        // if (status) {
        //     if (status.toLowerCase() === 'out-of-stock') {
        //         query = query.eq('stock', 0);
        //     } else if (status.toLowerCase() === 'activo') {
        //         query = query.eq('status', 'active');
        //     } else if (status.toLowerCase() === 'inactivo') {
        //         query = query.eq('status', 'inactive');
        //     }
        // }
        
        // Aplicar paginación
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        
        console.log(`Obteniendo productos de ${from} a ${to}`);
        
        // Ejecutar consulta con conteo
        const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });
        
        console.log('Resultados de la consulta:', { data, count, error });
        
        if (error) {
            console.error('Error en la consulta de productos:', error);
            throw error;
        }
        
        // Actualizar la interfaz de usuario
        totalItems = count || 0;
        totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
        
        console.log(`Total de productos: ${totalItems}, Páginas: ${totalPages}`);
        
        updatePagination(totalItems);
        
        // Verificar si hay datos
        if (!data || data.length === 0) {
            console.log('No se encontraron productos que coincidan con los filtros');
            renderProducts([]);
            return;
        }
        
        // Añadir información de categorías a los productos y asegurar que tengan un estado válido
        const productsWithCategories = data.map(product => {
            // Asegurar que el producto tenga un estado válido
            const status = product.status || 'active'; // Valor por defecto si no tiene estado
            
            return {
                ...product,
                status: status, // Asegurar que siempre tenga un estado
                category: product.category_id ? categoriesMap[product.category_id] : null
            };
        });
        
        console.log('Productos encontrados con categorías:', productsWithCategories);
        
        // Actualizar la variable global de productos
        products = productsWithCategories;
        
        // Renderizar los productos en la interfaz
        renderProducts(products);
        
    } catch (error) {
        console.error('Error en loadProducts:', error);
        showError('No se pudieron cargar los productos. Por favor, intente de nuevo.');
        
        // Mostrar el error en la interfaz
        if (productsTableBody) {
            productsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500">
                        Error al cargar productos: ${error.message}
                    </td>
                </tr>`;
        }
    } finally {
        showLoading(false);
    }
}

// Renderizar productos en la tabla
function renderProducts(products) {
    console.log('Iniciando renderizado de productos...');
    
    if (!productsTableBody) {
        console.error('No se encontró el elemento productsTableBody');
        return;
    }
    
    // Limpiar la tabla
    productsTableBody.innerHTML = '';
    
    if (!products || products.length === 0) {
        console.log('No hay productos para mostrar');
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No se encontraron productos que coincidan con los filtros.
                </td>
            </tr>`;
        return;
    }
    
    console.log(`Renderizando ${products.length} productos:`, products);
    
    try {
        // Crear un fragmento de documento para mejorar el rendimiento
        const fragment = document.createDocumentFragment();
        
        products.forEach(product => {
            try {
                console.log('Procesando producto:', product);
                
                // Asegurarse de que las propiedades existan
                const categoryName = (product.category && product.category.name) || 'Sin categoría';
                const status = product.status || 'inactive';
                const price = product.price ? parseFloat(product.price).toFixed(2) : '0.00';
                const stock = product.stock || 0;
                const imageUrl = product.image_url || '/images/placeholder-product.png';
                const productName = product.name || 'Sin nombre';
                const productSku = product.sku || 'N/A';
                const discountPercentage = parseFloat(product.discount_percentage) || 0;
                const hasDiscount = discountPercentage > 0;
                
                // Crear la fila para el producto
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-full object-cover" 
                                     src="${imageUrl}" 
                                     alt="${productName}" 
                                     onerror="this.src='/images/placeholder-product.png'"
                                >
                            </div>
                            <div class="ml-4">
                                <div class="flex items-center">
                                    <div class="text-sm font-medium text-gray-900">${productName}</div>
                                    ${hasDiscount ? `
                                        <span class="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                                            ${discountPercentage}% OFF
                                        </span>
                                    ` : ''}
                                </div>
                                <div class="text-sm text-gray-500">${productSku}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${categoryName}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">$${price}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${stock}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(status)}">
                            ${getStatusText(status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-id="${product.id}" class="edit-product-btn text-blue-600 hover:text-blue-900 mr-3" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button data-id="${product.id}" class="delete-product-btn text-red-600 hover:text-red-900" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                // Agregar la fila al fragmento
                fragment.appendChild(row);
                
            } catch (error) {
                console.error('Error al renderizar producto:', error, product);
            }
        });
        
        // Agregar todas las filas a la tabla de una sola vez
        productsTableBody.appendChild(fragment);
        
        console.log('Renderizado de productos completado');
        
    } catch (error) {
        console.error('Error en renderProducts:', error);
        productsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-500">
                    Ocurrió un error al cargar los productos. Por favor, intente de nuevo.
                </td>
            </tr>`;
    }
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            editProduct(productId);
        });
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Abrir modal para agregar/editar producto
async function openProductModal(product = null) {
    try {
        const modalTitle = document.getElementById('modal-title');
        const productIdInput = document.getElementById('product-id');
        const productNameInput = document.getElementById('name');
        const productCategoryInput = document.getElementById('categories');
        const productBasePriceInput = document.getElementById('base_price');
        const productStockInput = document.getElementById('stock');
        const productTaxRateInput = document.getElementById('tax_rate');
        const productDiscountInput = document.getElementById('discount_percentage');
        const productStatusInput = document.getElementById('status');
        const productDescriptionInput = document.getElementById('description');
        const productPriceInput = document.getElementById('price');
        
        // Guardar el ID de la categoría antes de cargar las categorías
        const categoryId = product ? (product.categories_id || '') : '';
        
        // Cargar categorías y luego establecer el valor
        await loadCategories();
        
        if (product) {
            // Modo edición
            modalTitle.textContent = 'Editar Producto';
            productIdInput.value = product.id;
            productNameInput.value = product.name || '';
            
            // Establecer la categoría después de cargar las opciones
            if (categoryId && productCategoryInput) {
                // Esperar un momento para asegurar que las opciones se hayan cargado
                setTimeout(() => {
                    productCategoryInput.value = categoryId;
                }, 100);
            }
            // Función para limpiar el formato numérico
            const cleanNumber = (value) => {
                if (typeof value === 'string') {
                    // Eliminar puntos de miles y reemplazar coma decimal por punto
                    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
                }
                return parseFloat(value) || 0;
            };
            
            // Obtener y limpiar los valores numéricos
            const taxRate = cleanNumber(product.tax_rate || '19.00');
            const discountPercentage = cleanNumber(product.discount_percentage || '0.00');
            const finalPrice = cleanNumber(product.price || '0');
            
            console.log('Valores originales:', { 
                taxRate, 
                discountPercentage, 
                finalPrice,
                rawTaxRate: product.tax_rate,
                rawDiscount: product.discount_percentage,
                rawPrice: product.price
            });
            
            // Calcular el precio base a partir del precio final, el descuento y el IVA
            // Fórmula: precio_base = precio_final / (1 + (tasa_iva / 100)) / (1 - (descuento / 100))
            let basePrice = finalPrice;
            
            // Si hay IVA, dividir por (1 + tasa_iva/100)
            if (taxRate > 0) {
                basePrice = basePrice / (1 + (taxRate / 100));
            }
            
            // Si hay descuento, dividir por (1 - descuento/100)
            if (discountPercentage > 0) {
                basePrice = basePrice / (1 - (discountPercentage / 100));
            }
            
            console.log('Valores calculados:', { basePrice, taxRate, discountPercentage });
            
            // Función para formatear números sin ceros adicionales
            const formatNumber = (num, decimals = 2) => {
                // Redondear a 2 decimales
                const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
                // Convertir a string y eliminar ceros innecesarios
                return rounded.toString().replace(/(\.\d*?[1-9])0+$|(\.)0+$/, '$1$2').replace(/\.$/, '');
            };
            
            // Establecer los valores en el formulario
            productBasePriceInput.value = formatNumber(basePrice, 2);
            productTaxRateInput.value = formatNumber(taxRate, 2);
            productDiscountInput.value = formatNumber(discountPercentage, 2);
            productStockInput.value = product.stock ? formatNumber(parseInt(product.stock), 0) : '';
            
            // Calcular automáticamente el precio final
            setTimeout(() => {
                calculateFinalPrice();
            }, 100);
            
            // Establecer el proveedor si existe
            if (product.supplier_id) {
                const supplierSelect = document.getElementById('supplier');
                if (supplierSelect) {
                    // Esperar un momento para asegurar que los proveedores se hayan cargado
                    setTimeout(() => {
                        supplierSelect.value = product.supplier_id;
                    }, 100);
                }
            }
            // Asegurarse de que el estado sea uno de los valores válidos y establecerlo correctamente
            const validStatuses = ['Activo', 'Inactivo', 'Agotado'];
            const validStatus = validStatuses.includes(product.status) ? product.status : 'Activo';
            
            // Limpiar el select y agregar las opciones manualmente
            productStatusInput.innerHTML = '';
            
            // Agregar las opciones
            const options = [
                { value: '', text: 'Selecciona un estado' },
                { value: 'Activo', text: 'Activo' },
                { value: 'Inactivo', text: 'Inactivo' },
                { value: 'Agotado', text: 'Agotado' }
            ];
            
            // Agregar todas las opciones
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.text;
                productStatusInput.appendChild(opt);
            });
            
            // Establecer el valor del select directamente
            productStatusInput.value = product.status || 'Activo';
            
            // Forzar la actualización del select
            productStatusInput.dispatchEvent(new Event('change', { bubbles: true }));
            productDescriptionInput.value = product.description || '';
        } else {
            // Modo nuevo producto
            modalTitle.textContent = 'Nuevo Producto';
            productForm.reset();
            productIdInput.value = '';
        }
        
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error al abrir el modal:', error);
        showError('Error al abrir el modal. Por favor, intenta de nuevo.');
    }
}

// Cerrar modal de producto
function closeProductModal() {
    productModal.classList.remove('flex');
    productModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Validar el formulario de producto
function statusChanged(select) {
    const status = select.value;
    console.log('Estado cambiado a:', status);
    
    // Actualizar el formulario si el estado está vacío
    if (!status || status === '') {
        showError('Por favor, selecciona un estado válido');
        return;
    }
    
    // Actualizar el valor del select
    select.value = status;
}

function validateProductForm() {
    const name = document.getElementById('name')?.value?.trim();
    const price = document.getElementById('price')?.value?.trim();
    const stock = document.getElementById('stock')?.value?.trim();
    const category = document.getElementById('categories')?.value?.trim();
    const statusSelect = document.getElementById('status');
    
    // Validar campos requeridos
    if (!name) {
        showError('El nombre del producto es requerido');
        return false;
    }
    
    // El estado siempre será 'Activo'
    const status = 'Activo';
    console.log('Estado fijado:', status);
    
    if (!price || isNaN(price)) {
        showError('El precio debe ser un número válido');
        return false;
    }
    
    if (!stock || isNaN(stock)) {
        showError('El stock debe ser un número válido');
        return false;
    }
    
    if (!category || category === '') {
        showError('Debe seleccionar una categoría');
        return false;
    }
    

    
    // Validar que el precio sea mayor a 0
    if (parseFloat(price) <= 0) {
        showError('El precio debe ser mayor a 0');
        return false;
    }
    
    // Validar que el stock sea mayor o igual a 0
    if (parseInt(stock) < 0) {
        showError('El stock no puede ser negativo');
        return false;
    }
    
    return true;
}

// Manejar envío del formulario de producto
async function handleProductSubmit(e) {
    e.preventDefault();
    
    try {
        console.log('Enviando formulario de producto...');
        
        // Mostrar indicador de carga
        const submitButton = productForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        
        // Calcular el precio final antes de obtener los valores
        const finalPrice = calculateFinalPrice();
        
        // Obtener los valores directamente de los elementos
        const name = document.getElementById('name')?.value?.trim();
        const category = document.getElementById('categories')?.value?.trim();
        const price = finalPrice; // Usar el precio final calculado
        const stock = document.getElementById('stock')?.value?.trim();
        const imageInput = document.getElementById('image');
        const discountPercentage = document.getElementById('discount_percentage')?.value?.trim() || '0';
        const taxRate = document.getElementById('tax_rate')?.value?.trim() || '19.00';
        
        console.log('Precio final a guardar:', price);
        
        // Validar campos requeridos
        if (!name) {
            showError('El nombre del producto es requerido');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }
        
        if (!category || category === '') {
            showError('Debe seleccionar una categoría');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }
        
        if (!price || isNaN(price)) {
            showError('El precio debe ser un número válido');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }
        
        if (!stock || isNaN(stock)) {
            showError('El stock debe ser un número válido');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
            return;
        }
        
        // Obtener el store_id del usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            throw new Error('No hay usuario autenticado');
        }

        // Obtener el ID del producto si estamos editando
        const productId = document.getElementById('product-id')?.value || productForm.getAttribute('data-product-id');
        console.log('ID del producto:', productId);

        // Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        if (!profile) {
            throw new Error('No se pudo obtener el perfil del usuario');
        }

        // Obtener el proveedor seleccionado
        const supplierId = document.getElementById('supplier')?.value || null;
        
        // Preparar los datos del producto
        const productData = {
            store_id: profile.store_id,
            name: name,
            description: document.getElementById('description')?.value,
            price: parseFloat(price), // Precio final ya con descuento e IVA aplicados
            stock: parseInt(stock),
            sku: document.getElementById('sku')?.value,
            category_id: category,
            supplier_id: supplierId, // Incluir el ID del proveedor
            status: 'Activo',
            tax_rate: parseFloat(taxRate),
            discount_percentage: parseFloat(discountPercentage)
        };

        // Si estamos editando un producto existente, obtener los datos actuales
        if (productId) {
            const { data: currentProduct, error: productError } = await supabase
                .from('products')
                .select('image_url')
                .eq('id', productId)
                .single();

            if (productError) throw productError;
            if (currentProduct) {
                productData.image_url = currentProduct.image_url;
            }
        }

        // Manejar la imagen si existe
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            
            // Validar el tamaño del archivo (5MB máximo)
            if (file.size > 5 * 1024 * 1024) {
                showError('El archivo es demasiado grande. Máximo 5MB');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }

            // Usar el bucket existente 'product-images'
            const bucket = 'product-images';
            
            // Obtener el store_id del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single();
            
            if (profileError) throw profileError;
            if (!profile) {
                throw new Error('No se pudo obtener el perfil del usuario');
            }

            // Subir la imagen a Supabase Storage
            // Incluir el store_id en el nombre del archivo para cumplir con las políticas de RLS
            const fileName = `${profile.store_id}/${Date.now()}-${file.name}`;
            
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            // Obtener la URL pública de la imagen
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucket)
                .getPublicUrl(fileName);

            // Agregar la URL de la imagen a los datos del producto
            productData.image_url = publicUrl;
        }
        
        // Verificar si hay un archivo de imagen
        const imageFile = document.getElementById('product-image')?.files[0];
        if (imageFile) {
            try {
                // Subir la imagen a Supabase Storage
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `products/${fileName}`;
                
                // Subir el archivo
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, imageFile);
                    
                if (uploadError) throw uploadError;
                
                // Obtener la URL pública de la imagen
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);
                    
                productData.image_url = publicUrl;
                
            } catch (uploadError) {
                console.error('Error al subir la imagen:', uploadError);
                showError('Error al subir la imagen. Por favor, intente con otra imagen.');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
        }
        
        let result;
        
        try {
            if (productId) {
                // Actualizar producto existente
                const { data, error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', productId)
                    .select();
                    
                if (error) throw error;
                result = data;
                showSuccess('Producto actualizado correctamente');
            } else {
                // Crear nuevo producto
                const { data, error } = await supabase
                    .from('products')
                    .insert([productData])
                    .select();
                    
                if (error) throw error;
                result = data;
                showSuccess('Producto creado correctamente');
            }
            
            // Cerrar el modal y actualizar la lista de productos
            closeProductModal();
            await loadProducts();
            
            return result;
            
        } catch (dbError) {
            console.error('Error al guardar en la base de datos:', dbError);
            throw new Error('Error al guardar el producto en la base de datos');
        }
        
    } catch (error) {
        console.error('Error al guardar el producto:', error);
        showError(error.message || 'Error al guardar el producto. Por favor, intente de nuevo.');
        return null;
    } finally {
        // Restaurar el botón de envío
        const submitButton = productForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Guardar producto';
        }
    }
}

// Editar producto
async function editProduct(productId) {
    try {
        showLoading(true);
        
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
            
        if (error) throw error;
        
        // Asegurarse de que el estado sea uno de los valores válidos
        const validStatuses = ['active', 'inactive', 'out-of-stock'];
        product.status = validStatuses.includes(product.status) ? product.status : 'active';
        
        openProductModal(product);
        
    } catch (error) {
        console.error('Error al cargar el producto:', error);
        showError('Error al cargar el producto. Por favor, intente de nuevo.');
    } finally {
        showLoading(false);
    }
}

// Eliminar producto
async function deleteProduct(productId) {
    try {
        const { value: confirm } = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        
        if (!confirm) return;
        
        showLoading(true);
        
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
            
        if (error) throw error;
        
        showSuccess('Producto eliminado correctamente');
        await loadProducts();
        
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        showError('Error al eliminar el producto. Por favor, intenta de nuevo.');
    } finally {
        showLoading(false);
    }
}

// Manejar búsqueda
function handleSearch() {
    currentPage = 1;
    loadProducts();
}

// Manejar cambio de filtros
function handleFilterChange() {
    currentPage = 1;
    loadProducts();
}

// Actualizar paginación
function updatePagination(totalCount) {
    // Actualizar contadores
    totalItems = totalCount;
    totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    
    // Asegurarse de que la página actual sea válida
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
        loadProducts();
        return;
    }
    
    // Actualizar elementos de la interfaz
    if (currentPageInput) currentPageInput.value = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    if (totalItemsSpan) totalItemsSpan.textContent = totalItems.toLocaleString();
    
    // Calcular y actualizar el rango mostrado
    const from = totalItems > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0;
    const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    
    if (showingFromSpan) showingFromSpan.textContent = from.toLocaleString();
    if (showingToSpan) showingToSpan.textContent = to.toLocaleString();
    
    // Actualizar estado de los botones de navegación
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

// Cambiar de página
function changePage(page) {
    const newPage = parseInt(page);
    
    // Validar que la página sea un número y esté dentro del rango permitido
    if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
        // Si el valor no es válido, restaurar el valor anterior
        if (currentPageInput) currentPageInput.value = currentPage;
        return;
    }
    
    currentPage = newPage;
    loadProducts();
    
    // Desplazarse al inicio de la tabla
    const table = document.querySelector('table');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth' });
    }
}

// Función para exportar productos a Excel
function exportToExcel() {
    try {
        // Crear un nuevo libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // Preparar los datos para la exportación
        const data = [
            [
                'Código',
                'Nombre',
                'Categoría',
                'Precio de Compra',
                'Precio de Venta',
                'Stock',
                'Estado',
                'Proveedor',
                'SKU',
                'Código de Barras',
                'IVA',
                'Descuento',
                'Precio Final',
                'Fecha de Creación',
                'Última Actualización'
            ],
            ...products.map(product => [
                product.id,
                product.name,
                getCategoryName(product.category_id) || 'Sin categoría',
                `S/. ${parseFloat(product.cost_price || 0).toFixed(2)}`,
                `S/. ${parseFloat(product.sale_price || 0).toFixed(2)}`,
                product.stock,
                getStatusText(product.status),
                product.supplier_name || 'Sin proveedor',
                product.sku || 'N/A',
                product.barcode || 'N/A',
                `${product.iva || 0}%`,
                product.discount ? `${product.discount}%` : '0%',
                `S/. ${calculateFinalPriceForExport(product).toFixed(2)}`,
                new Date(product.created_at).toLocaleDateString('es-PE'),
                new Date(product.updated_at).toLocaleDateString('es-PE')
            ])
        ];
        
        // Crear una hoja de cálculo con los datos
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Ajustar el ancho de las columnas
        const columnWidths = [
            { wch: 10 }, // Código
            { wch: 30 }, // Nombre
            { wch: 20 }, // Categoría
            { wch: 15 }, // Precio Compra
            { wch: 15 }, // Precio Venta
            { wch: 10 }, // Stock
            { wch: 15 }, // Estado
            { wch: 25 }, // Proveedor
            { wch: 15 }, // SKU
            { wch: 20 }, // Código Barras
            { wch: 10 }, // IVA
            { wch: 12 }, // Descuento
            { wch: 15 }, // Precio Final
            { wch: 15 }, // Fecha Creación
            { wch: 20 }  // Última Actualización
        ];
        
        ws['!cols'] = columnWidths;
        
        // Agregar la hoja al libro de trabajo
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        
        // Generar el archivo Excel
        const fileName = `Productos_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showSuccess('Exportación a Excel completada correctamente');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showError('Ocurrió un error al exportar a Excel');
    }
}

// Función auxiliar para calcular el precio final para la exportación
function calculateFinalPriceForExport(product) {
    const price = parseFloat(product.sale_price) || 0;
    const discount = (parseFloat(product.discount) || 0) / 100;
    const iva = (parseFloat(product.iva) || 0) / 100;
    
    let finalPrice = price * (1 - discount);
    if (product.iva_included !== true) {
        finalPrice *= (1 + iva);
    }
    
    return finalPrice;
}

// Manejador de eventos para el botón de exportar a Excel
document.getElementById('export-btn')?.addEventListener('click', async () => {
    try {
        showLoading(true);
        // Asegurarnos de que los productos estén cargados
        if (!products || products.length === 0) {
            console.log('Cargando productos antes de exportar...');
            await loadProducts();
        }
        
        if (products && products.length > 0) {
            console.log(`Exportando ${products.length} productos a Excel...`);
            exportToExcel();
        } else {
            console.warn('No se encontraron productos para exportar después de cargar');
            showError('No se encontraron productos para exportar. Verifica que haya productos en el catálogo.');
        }
    } catch (error) {
        console.error('Error al preparar la exportación:', error);
        showError('Error al cargar los productos para exportar');
    } finally {
        showLoading(false);
    }
});

// Manejadores de eventos para los botones de navegación
document.addEventListener('DOMContentLoaded', () => {
    // Botón de página anterior
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                changePage(currentPage - 1);
            }
        });
    }
    
    // Botón de página siguiente
    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                changePage(currentPage + 1);
            }
        });
    }
    
    // Campo de entrada de página
    const currentPageInput = document.getElementById('current-page');
    if (currentPageInput) {
        currentPageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                changePage(e.target.value);
            }
        });
        
        currentPageInput.addEventListener('blur', (e) => {
            changePage(e.target.value);
        });
    }
});

// Funciones auxiliares
function showLoading(show = true) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'Aceptar'
    });
}

function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: message,
        confirmButtonText: 'Aceptar',
        timer: 2000,
        timerProgressBar: true
    });
}

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

function getCategoryName(category) {
    const categories = {
        'electronica': 'Electrónica',
        'ropa': 'Ropa',
        'hogar': 'Hogar',
        'deportes': 'Deportes'
    };
    return categories[category] || category || 'Sin categoría';
}

// Obtener clase CSS para el estado
function getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
        case 'active':
        case 'activo':
            return 'bg-green-100 text-green-800';
        case 'inactive':
        case 'inactivo':
            return 'bg-yellow-100 text-yellow-800';
        case 'out-of-stock':
        case 'agotado':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Obtener texto para el estado
function getStatusText(status) {
    if (!status) return 'Desconocido';
    
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
        case 'active':
        case 'activo':
            return 'Activo';
        case 'inactive':
        case 'inactivo':
            return 'Inactivo';
        case 'out-of-stock':
        case 'agotado':
            return 'Agotado';
        default:
            return status; // Devolver el valor original si no coincide con ninguno conocido
    }
}

function generateSKU() {
    return 'SKU-' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticación
        const isAuthenticated = await window.checkAuth();
        if (!isAuthenticated) return;
        
        // Inicializar la aplicación
        await initApp();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
    }
});

// Hacer que las funciones estén disponibles globalmente
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.changePage = changePage;
window.toggleNotificationsMenu = setupNotificationsMenu;