// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const productsContainer = document.getElementById('products-container');
const searchInput = document.getElementById('search-products');
const filterCategory = document.getElementById('filter-category');
const sortSelect = document.getElementById('sort-products');

// Estado de la aplicación
let products = [];
let categories = [];
let priceFilter = {
  min: null,
  max: null,
  active: false
};

// Elementos del filtro de precios
const priceFilterButton = document.getElementById('price-filter-button');
const priceFilterDropdown = document.getElementById('price-filter-dropdown');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyPriceFilter = document.getElementById('apply-price-filter');
const clearPriceFilter = document.getElementById('clear-price-filter');

// Función para mostrar productos en tarjetas
function displayProducts(productsToShow) {
  loadingElement.classList.add('hidden');
  
  if (!productsToShow || productsToShow.length === 0) {
    productsContainer.innerHTML = `
      <div class="col-span-full text-center py-10">
        <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">No se encontraron productos disponibles</p>
      </div>
    `;
    return;
  }

  const productsHTML = productsToShow.map(product => {
    // Obtener precios directamente del producto
    const price = parseFloat(product.price || 0);
    const taxRate = parseFloat(product.tax_rate || 0) / 100; // Convertir a decimal
    const discount = product.discount_percentage ? parseFloat(product.discount_percentage) : 0;
    const hasDiscount = discount > 0;
    
    // Precio con descuento (si aplica)
    const finalPrice = hasDiscount ? parseFloat(product.discounted_price || price) : price;
    
    // Calcular IVA sobre el precio final (asumiendo que el precio final ya incluye IVA)
    const priceWithoutVAT = finalPrice / (1 + taxRate);
    const vatAmount = finalPrice - priceWithoutVAT;
    
    // Asegurarse de que el IVA sea exactamente el 19% del precio sin IVA
    const expectedVAT = priceWithoutVAT * taxRate;
    const vatDifference = Math.abs(vatAmount - expectedVAT);
    
    // Si hay una diferencia significativa, ajustar el IVA
    const adjustedVAT = vatDifference > 0.01 ? expectedVAT : vatAmount;
    
    // Calcular ahorro basado en el precio base (sin IVA)
    const basePrice = price / (1 + taxRate);
    const discountAmount = hasDiscount ? (basePrice * (discount / 100)) : 0;
    
    // Mostrar el ahorro con IVA incluido para que coincida con el formato
    const discountWithVAT = discountAmount * (1 + taxRate);
    
    return `
    <div class="bg-white rounded-lg shadow-md overflow-hidden product-card hover:shadow-lg transition-shadow duration-200 relative">
      ${hasDiscount ? `
        <div class="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10 transform rotate-6 shadow-lg">
          <span class="inline-block transform -rotate-6">${discount}% OFF</span>
        </div>
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>` : ''}
      
      <div class="h-48 bg-gray-100 overflow-hidden relative">
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-0"></div>
        <img 
          src="${product.image_url || 'https://via.placeholder.com/300x200?text=Sin+imagen'}" 
          alt="${product.name}" 
          class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onerror="this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible'"
          loading="lazy"
        >
      </div>
      
      <div class="p-4">
        <div class="flex justify-between items-start mb-1">
          <h3 class="font-semibold text-lg text-gray-800">${product.name || 'Producto sin nombre'}</h3>
          <span class="text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}">
            ${product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
          </span>
        </div>
        
        <p class="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
          ${product.description || 'Sin descripción'}
        </p>
        
        <div class="mb-3">
          ${hasDiscount ? `
            <div class="text-xs text-gray-500 mb-1">
              <span class="line-through">$${price.toFixed(2)}</span>
              <span class="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
                ${discount}% OFF
              </span>
            </div>
          ` : ''}
          
          <div class="flex items-baseline">
            <span class="text-2xl font-extrabold text-gray-900">
              $${finalPrice.toFixed(2)}
            </span>
            <span class="ml-2 text-xs text-gray-500">
              IVA ${(taxRate * 100).toFixed(0)}% incluido
            </span>
          </div>
          
          <!-- Desglose de precios -->
          <div class="mt-2 text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-2">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span>$${priceWithoutVAT.toFixed(2)}</span>
            </div>
            <div class="flex justify-between">
              <span>IVA (${(taxRate * 100).toFixed(0)}%):</span>
              <span>+$${vatAmount.toFixed(2)}</span>
            </div>
            ${hasDiscount ? `
            <div class="flex justify-between text-green-600 font-medium">
              <span>Descuento (${discount}%):</span>
              <span>-$${discountWithVAT.toFixed(2)}</span>
            </div>
            <div class="flex justify-between font-medium">
              <span>Total:</span>
              <span class="font-bold">$${finalPrice.toFixed(2)}</span>
            </div>` : 
            `<div class="flex justify-between font-medium">
              <span>Total:</span>
              <span class="font-bold">$${finalPrice.toFixed(2)}</span>
            </div>`}
          </div>
          
          ${hasDiscount ? `
            <div class="text-xs text-green-600 font-medium mt-2 flex items-center bg-green-50 p-2 rounded-md">
              <i class="fas fa-tag mr-1"></i>
              ¡Ahorras $${discountAmount.toFixed(2)} (${discount}% de descuento)!
            </div>
          ` : ''}
          
          <div class="mt-2 text-xs text-gray-400">
            ${product.stock > 10 ? 'Disponible' : product.stock > 0 ? 
              `Últimas ${product.stock} unidades` : 'Agotado'}
          </div>
        </div>
        
        <button 
          class="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200 add-to-cart-btn ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}"
          data-product-id="${product.id}"
          data-product-name="${product.name}"
          data-product-price="${price}"
          data-product-final-price="${finalPrice}"
          data-product-image="${product.image_url || ''}"
          data-product-stock="${product.stock}"
          data-product-store-id="${product.store_id || ''}"
          data-product-store-name="${product.store_name || 'Tienda'}"
          data-product-tax="${product.tax_rate || 0}"
          data-product-discount="${discount}"
          ${product.stock <= 0 ? 'disabled' : ''}
        >
          <i class="fas fa-shopping-cart mr-2"></i>
          ${product.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
        </button>
        
        <div class="mt-2 text-xs text-gray-500 flex justify-between">
          <span>${product.store_name || 'Tienda'}</span>
          <span>Ref: ${product.reference || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');

  productsContainer.innerHTML = productsHTML;
  loadingElement.classList.add('hidden');
}

// Función para mostrar errores
function showError(message) {
  console.error('Error:', message);
  if (errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
  }
  loadingElement.classList.add('hidden');
}

// Función para cargar las categorías
async function loadCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    categories = data || [];
    
    // Actualizar el selector de categorías
    if (filterCategory) {
      const categoryOptions = categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
      ).join('');
      
      filterCategory.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categoryOptions}
      `;
    }
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

// Función para filtrar y ordenar productos
function filterAndSortProducts() {
  if (!products || products.length === 0) return [];

  let filteredProducts = [...products];
  
  // Filtrar por búsqueda
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm))
    );
  }
  
  // Filtrar por categoría
  const categoryId = filterCategory ? filterCategory.value : '';
  if (categoryId) {
    filteredProducts = filteredProducts.filter(product => 
      product.category_id === categoryId
    );
  }
  
  // Filtrar por rango de precios
  if (priceFilter.active) {
    filteredProducts = filteredProducts.filter(product => {
      const price = parseFloat(product.price);
      const minValid = priceFilter.min === null || price >= priceFilter.min;
      const maxValid = priceFilter.max === null || price <= priceFilter.max;
      return minValid && maxValid;
    });
  }
  
  // Ordenar
  const sortOption = sortSelect ? sortSelect.value : 'name-asc';
  switch (sortOption) {
    case 'name-asc':
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price-asc':
      filteredProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-desc':
      filteredProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'newest':
      filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  
  return filteredProducts;
}

// Función para actualizar la visualización de productos
function updateProductsDisplay() {
  const filteredProducts = filterAndSortProducts();
  displayProducts(filteredProducts);
}

// Función para verificar la sesión y cargar los productos
async function checkSessionAndLoadProducts() {
  try {
    // 1. Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    console.log('✅ Usuario autenticado:', session.user.email);

    // 2. Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo obtener la información de la tienda');
    }

    console.log('🛍️ Cargando productos para la tienda ID:', profile.store_id);

    // Cargar categorías en paralelo
    await Promise.all([
      loadCategories(),
      // 3. Obtener productos de la tienda
      (async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', profile.store_id);

        if (error) throw error;
        
        products = data || [];
        updateProductsDisplay();
      })()
    ]);
    
    loadingElement.classList.add('hidden');
  } catch (error) {
    console.error('❌ Error:', error);
    showError(error.message || 'Error al cargar los productos');
  }
}

// Configurar menú desplegable de usuario
function setupUserMenu() {
  const userMenuButton = document.getElementById('user-menu-button');
  const userDropdown = document.getElementById('user-dropdown');
  const logoutButton = document.getElementById('logout-button');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  // Menú de usuario
  if (userMenuButton && userDropdown) {
    // Mostrar/ocultar menú al hacer clic en el botón de usuario
    userMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
      // Cerrar menú móvil si está abierto
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    });
    
    // Ocultar menú al hacer clic fuera de él
    document.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
    });
    
    // Evitar que el menú se cierre al hacer clic en él
    userDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Menú móvil
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
      // Cerrar menú de usuario si está abierto
      if (userDropdown && !userDropdown.classList.contains('hidden')) {
        userDropdown.classList.add('hidden');
      }
    });
    
    // Ocultar menú móvil al hacer clic fuera de él
    document.addEventListener('click', (e) => {
      if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.add('hidden');
      }
    });
  }
  
  // Manejar cierre de sesión
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Redirigir a la página de inicio de sesión
        window.location.href = 'login.html';
      } catch (error) {
        showError('Error al cerrar sesión: ' + error.message);
      }
    });
  }
}

// Función para alternar el menú desplegable de precios
function togglePriceFilter() {
  priceFilterDropdown.classList.toggle('hidden');
  
  // Cerrar al hacer clic fuera del menú
  const handleClickOutside = (event) => {
    if (!priceFilterButton.contains(event.target) && !priceFilterDropdown.contains(event.target)) {
      priceFilterDropdown.classList.add('hidden');
      document.removeEventListener('click', handleClickOutside);
    }
  };
  
  if (!priceFilterDropdown.classList.contains('hidden')) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  }
}

// Función para aplicar el filtro de precios
function applyPriceFilterHandler() {
  const minPrice = parseFloat(minPriceInput.value);
  const maxPrice = parseFloat(maxPriceInput.value);
  
  priceFilter = {
    min: !isNaN(minPrice) && minPrice > 0 ? minPrice : null,
    max: !isNaN(maxPrice) && maxPrice > 0 ? maxPrice : null,
    active: (!isNaN(minPrice) && minPrice > 0) || (!isNaN(maxPrice) && maxPrice > 0)
  };
  
  updateProductsDisplay();
  priceFilterDropdown.classList.add('hidden');
}

// Función para limpiar el filtro de precios
function clearPriceFilterHandler() {
  minPriceInput.value = '';
  maxPriceInput.value = '';
  priceFilter = { min: null, max: null, active: false };
  updateProductsDisplay();
  priceFilterDropdown.classList.add('hidden');
}

// Manejar clic en botones de agregar al carrito
function handleAddToCartClick(e) {
  // Verificar si el clic fue en un botón de agregar al carrito o en un elemento dentro de él
  const button = e.target.closest('.add-to-cart-btn');
  if (!button) return;
  
  // Evitar múltiples clics
  if (button.disabled) return;
  button.disabled = true;
  
  try {
    // Usar el precio final como precio base para el carrito
    const finalPrice = parseFloat(button.dataset.productFinalPrice || button.dataset.productPrice);
    const taxRate = parseFloat(button.dataset.productTax || 0) / 100;
    const discount = parseFloat(button.dataset.productDiscount || 0);
    
    // Calcular el precio sin IVA
    const priceWithoutVAT = finalPrice / (1 + taxRate);
    const vatAmount = finalPrice - priceWithoutVAT;
    
    // Asegurarse de que el IVA sea exactamente el 19% del precio sin IVA
    const expectedVAT = priceWithoutVAT * taxRate;
    const vatDifference = Math.abs(vatAmount - expectedVAT);
    const adjustedVAT = vatDifference > 0.01 ? expectedVAT : vatAmount;
    
    const product = {
      id: button.dataset.productId,
      name: button.dataset.productName,
      price: finalPrice, // Usar el precio final como precio base
      final_price: finalPrice,
      tax: taxRate * 100, // Guardar como porcentaje
      tax_amount: adjustedVAT, // Usar el IVA ajustado
      discount: discount,
      discount_amount: discount > 0 ? (priceWithoutVAT * (discount / 100)) * (1 + taxRate) : 0,
      image_url: button.dataset.productImage || '',
      stock: parseInt(button.dataset.productStock, 10),
      store_id: button.dataset.productStoreId,
      store_name: button.dataset.productStoreName || 'Tienda',
      quantity: 1,
      reference: button.dataset.productReference || ''
    };
    
    // Validar que el producto tenga un store_id
    if (!product.store_id) {
      console.error('El producto no tiene un store_id definido:', product);
      showNotification('Error: No se pudo determinar la tienda del producto', 'error');
      button.disabled = false;
      return;
    }
    
    console.log('Agregando al carrito:', product);
    
    // Verificar si el módulo del carrito está disponible
    if (window.cartModule && typeof window.cartModule.addToCart === 'function') {
      window.cartModule.addToCart(product).then(() => {
        // Mostrar notificación de éxito
        showNotification(`${product.name} agregado al carrito`, 'success');
      }).catch(error => {
        console.error('Error al agregar al carrito:', error);
        showNotification(error.message || 'Error al agregar al carrito', 'error');
      }).finally(() => {
        button.disabled = false;
      });
    } else {
      console.error('El módulo del carrito no está disponible');
      showNotification('Error: Módulo del carrito no disponible', 'error');
      button.disabled = false;
    }
  } catch (error) {
    console.error('Error al procesar el producto:', error);
    showNotification('Error al procesar el producto', 'error');
    button.disabled = false;
  }
}

// Función para mostrar notificaciones (fallback si no está en el módulo del carrito)
function showNotification(message, type = 'info') {
  if (window.Swal) {
    const icon = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    Swal.fire({
      title: message,
      icon: icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } else {
    alert(message);
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  checkSessionAndLoadProducts();
  setupUserMenu();
  
  // Configurar evento de búsqueda
  if (searchInput) {
    searchInput.addEventListener('input', updateProductsDisplay);
  }
  
  // Configurar evento de filtro por categoría
  if (filterCategory) {
    filterCategory.addEventListener('change', updateProductsDisplay);
  }
  
  // Configurar evento de ordenación
  if (sortSelect) {
    sortSelect.addEventListener('change', updateProductsDisplay);
  }
  
  // Configurar eventos del filtro de precios
  if (priceFilterButton && priceFilterDropdown) {
    priceFilterButton.addEventListener('click', togglePriceFilter);
  }
  
  // Configurar botón de aplicar filtro de precios
  if (applyPriceFilter) {
    applyPriceFilter.addEventListener('click', applyPriceFilterHandler);
  }
  
  // Configurar botón de limpiar filtro de precios
  if (clearPriceFilter) {
    clearPriceFilter.addEventListener('click', clearPriceFilterHandler);
  }
  
  // Configurar manejador de clic para agregar al carrito (una sola vez)
  document.addEventListener('click', handleAddToCartClick);
  
  // Configurar cierre de menús desplegables
  document.addEventListener('click', (e) => {
    if (priceFilterButton && !priceFilterButton.contains(e.target) && 
        priceFilterDropdown && !priceFilterDropdown.contains(e.target)) {
      priceFilterDropdown.classList.add('hidden');
    }
  });
  
  // Inicializar el módulo del carrito
  if (window.cartModule && typeof window.cartModule.init === 'function') {
    window.cartModule.init();
  }
});