// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Función para mostrar errores
function showError(message) {
  if (errorElement && errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
    // Ocultar el error después de 5 segundos
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
  console.error('Error:', message);
}

// Función para configurar el menú de usuario
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
        // Redirigir a la página de login
        window.location.href = '/login.html';
      } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        showError('Error al cerrar sesión. Por favor, intente nuevamente.');
      }
    });
  }
}

// Función para verificar la sesión y cargar el dashboard
async function checkSessionAndLoadDashboard() {
  try {
    // 1. Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (!session) {
      window.location.href = '/login.html';
      return;
    }

    console.log('✅ Usuario autenticado:', session.user.email);

    // 2. Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo obtener la información del perfil');
    }

    // 3. Actualizar la interfaz con los datos del perfil
    updateUserProfile(profile);
    
    // 4. Cargar datos adicionales del dashboard
    await loadDashboardData(profile);
    
  } catch (error) {
    console.error('❌ Error:', error);
    showError(error.message || 'Error al cargar el dashboard');
    
    // Redirigir a login en caso de error de autenticación
    if (error.message.includes('Invalid login credentials') || 
        error.message.includes('No se pudo obtener la información del perfil')) {
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    }
  } finally {
    // Ocultar loading en cualquier caso
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }
}

// Función para actualizar la interfaz con los datos del perfil
function updateUserProfile(profile) {
  // Actualizar nombre de usuario en el menú
  const userNameElements = document.querySelectorAll('.user-name');
  userNameElements.forEach(el => {
    if (el) el.textContent = profile.full_name || 'Usuario';
  });
  
  // Actualizar inicial del usuario en el menú
  const userInitial = document.getElementById('user-initial');
  if (userInitial) {
    userInitial.textContent = (profile.full_name || 'U').charAt(0).toUpperCase();
  }
  
  // Aquí puedes agregar más actualizaciones de la interfaz según los datos del perfil
  // Por ejemplo, crédito disponible, historial de pedidos, etc.
}

// Función para cargar datos adicionales del dashboard
async function loadDashboardData(profile) {
  try {
    // Aquí puedes cargar datos adicionales para el dashboard
    // Por ejemplo, últimas órdenes, estadísticas, etc.
    
    // Simular carga de datos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ejemplo de cómo podrías cargar datos adicionales
    // const { data: orders, error: ordersError } = await supabase
    //   .from('orders')
    //   .select('*')
    //   .eq('user_id', profile.id)
    //   .order('created_at', { ascending: false })
    //   .limit(5);
    
    // if (ordersError) throw ordersError;
    
    // Actualizar la interfaz con los datos cargados
    // updateOrdersList(orders);
    
  } catch (error) {
    console.error('Error al cargar datos del dashboard:', error);
    throw error; // Relanzar para manejarlo en la función principal
  }
}

// Función para obtener productos con descuento
async function fetchDiscountedProducts() {
  try {
    // Primero, obtener los IDs de productos con descuento
    const { data: discounts, error: discountError } = await supabase
      .from('discounts')
      .select('product_id, discount_percentage, end_date')
      .gt('end_date', new Date().toISOString()) // Solo descuentos vigentes
      .order('discount_percentage', { ascending: false });

    if (discountError) throw discountError;
    if (!discounts || discounts.length === 0) return [];

    // Obtener los IDs de los productos con descuento
    const productIds = discounts.map(d => d.product_id);

    // Obtener los detalles completos de los productos
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productError) throw productError;
    if (!products) return [];

    // Combinar la información de descuento con los productos
    return products.map(product => {
      const discountInfo = discounts.find(d => d.product_id === product.id);
      return {
        ...product,
        discount_percentage: discountInfo.discount_percentage,
        discounted_price: product.price * (1 - (discountInfo.discount_percentage / 100)),
        end_date: discountInfo.end_date
      };
    });
  } catch (error) {
    console.error('Error fetching discounted products:', error);
    showError('Error al cargar las ofertas. Por favor, intenta de nuevo.');
    return [];
  }
}

// Función para renderizar los productos en oferta
function renderDiscountedProducts(products) {
  const container = document.getElementById('discounted-products-container');
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="col-span-1 md:col-span-3 text-center py-8">
        <p class="text-gray-500">No hay ofertas disponibles en este momento.</p>
      </div>
    `;
    return;
  }

  // Tomar los primeros 3 productos con mayor descuento
  const topDiscountedProducts = [...products]
    .sort((a, b) => b.discount_percentage - a.discount_percentage)
    .slice(0, 3);

  container.innerHTML = topDiscountedProducts.map(product => `
    <div class="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
      <div class="h-48 bg-gray-200 overflow-hidden">
        <img src="${product.image_url || 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Sin+imagen'}" 
             alt="${product.name}" 
             class="w-full h-full object-cover hover:opacity-90 transition-opacity"
             onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Imagen+no+disponible'"
        >
      </div>
      <div class="p-6">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-semibold text-gray-900">${product.name}</h3>
          <span class="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            ${product.discount_percentage}% OFF
          </span>
        </div>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.description || 'Sin descripción disponible'}</p>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold text-gray-900">$${product.discounted_price.toFixed(2)}</span>
          <span class="text-sm text-gray-500 line-through">$${parseFloat(product.price).toFixed(2)}</span>
        </div>
        <button onclick="window.location.href='producto.html?id=${product.id}'" 
                class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-200">
          Ver oferta
        </button>
      </div>
    </div>
  `).join('');
}

// Función para cargar las ofertas
async function loadSpecialOffers() {
  const loadingElement = document.getElementById('offers-loading');
  const offersContainer = document.getElementById('discounted-products-container');
  
  try {
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (offersContainer) offersContainer.classList.add('hidden');
    
    const products = await fetchDiscountedProducts();
    renderDiscountedProducts(products);
  } catch (error) {
    console.error('Error loading special offers:', error);
    showError('Error al cargar las ofertas especiales');
  } finally {
    if (loadingElement) loadingElement.classList.add('hidden');
    if (offersContainer) offersContainer.classList.remove('hidden');
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  checkSessionAndLoadDashboard();
  setupUserMenu();
  loadSpecialOffers();
});
