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
    // Obtener productos que tengan descuento (discount_percentage > 0)
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (name)
      `)
      .gt('discount_percentage', 0) // Solo productos con descuento
      .order('discount_percentage', { ascending: false })
      .limit(8); // Limitar a 8 productos para mejorar rendimiento

    if (error) throw error;
    if (!products || products.length === 0) return [];

    // Formatear los datos para incluir la categoría y la información de descuento
    return products.map(product => {
      const discount = parseFloat(product.discount_percentage);
      const originalPrice = parseFloat(product.price);
      const discountedPrice = originalPrice * (1 - (discount / 100));
      const discountAmount = originalPrice - discountedPrice;
      
      return {
        ...product,
        category_name: product.categories?.name || 'Sin categoría',
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_amount: discountAmount,
        // Si hay una fecha de finalización de oferta, se puede agregar aquí
        // end_date: product.end_date
      };
    });
  } catch (error) {
    console.error('Error al cargar productos con descuento:', error);
    showError('No se pudieron cargar las ofertas. Por favor, intente de nuevo.');
    return [];
  }
}

// Función para renderizar los productos en oferta
function renderDiscountedProducts(products) {
  const container = document.getElementById('discounted-products-container');
  const sectionTitle = document.getElementById('special-offers-title');
  
  if (!container) return;

  if (!products || products.length === 0) {
    if (sectionTitle) sectionTitle.classList.add('hidden');
    container.innerHTML = `
      <div class="col-span-full text-center py-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <i class="fas fa-tag text-4xl text-blue-400 mb-3"></i>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No hay ofertas disponibles</h3>
        <p class="text-gray-500 max-w-md mx-auto">Vuelve pronto para descubrir nuestras promociones especiales.</p>
      </div>
    `;
    return;
  }

  // Mostrar el título de la sección si hay productos
  if (sectionTitle) sectionTitle.classList.remove('hidden');

  // Ordenar por mayor descuento y tomar los primeros 4 productos
  const topDiscountedProducts = [...products]
    .sort((a, b) => b.discount_percentage - a.discount_percentage)
    .slice(0, 4);

  container.innerHTML = topDiscountedProducts.map(product => {
    const originalPrice = parseFloat(product.price);
    const discount = parseFloat(product.discount_percentage);
    const discountedPrice = originalPrice * (1 - (discount / 100));
    const discountAmount = originalPrice - discountedPrice;
    
    return `
    <div class="relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
      <!-- Badge de descuento -->
      <div class="absolute top-4 right-4 z-10">
        <div class="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-6 group-hover:scale-110 transition-transform">
          <span class="inline-block transform -rotate-6">${Math.round(discount)}% OFF</span>
        </div>
      </div>
      
      <!-- Imagen del producto -->
      <div class="relative h-48 bg-gray-100 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-0"></div>
        <img 
          src="${product.image_url || 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Sin+imagen'}" 
          alt="${product.name}" 
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Imagen+no+disponible'"
        >
      </div>
      
      <!-- Contenido -->
      <div class="p-5">
        <!-- Nombre y categoría -->
        <div class="mb-2">
          <h3 class="text-lg font-bold text-gray-900 mb-1 line-clamp-1">${product.name}</h3>
          <p class="text-xs text-gray-500">${product.category_name || 'Sin categoría'}</p>
        </div>
        
        <!-- Precios -->
        <div class="mb-4">
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-extrabold text-gray-900">$${discountedPrice.toFixed(2)}</span>
            <span class="text-sm text-gray-500 line-through">$${originalPrice.toFixed(2)}</span>
          </div>
          <div class="text-xs text-green-600 font-medium mt-1 flex items-center">
            <i class="fas fa-tag mr-1"></i>
            ¡Ahorras $${discountAmount.toFixed(2)}!
          </div>
        </div>
        
        <!-- Botón de acción -->
        <button 
          onclick="window.location.href='producto.html?id=${product.id}'"
          class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <i class="fas fa-shopping-cart"></i>
          Ver oferta
        </button>
        
        <!-- Tiempo restante (opcional) -->
        ${product.end_date ? `
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="text-xs text-gray-500 flex items-center">
            <i class="far fa-clock mr-1.5"></i>
            <span>Termina en: ${new Date(product.end_date).toLocaleDateString()}</span>
          </div>
        </div>` : ''}
      </div>
    </div>
  `}).join('');
}

// Función para cargar las ofertas especiales
async function loadSpecialOffers() {
  const loadingElement = document.getElementById('offers-loading');
  const offersContainer = document.getElementById('discounted-products-container');
  const errorElement = document.getElementById('offers-error');
  
  try {
    // Mostrar estado de carga
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (offersContainer) offersContainer.classList.add('hidden');
    if (errorElement) errorElement.classList.add('hidden');
    
    // Obtener productos con descuento
    const products = await fetchDiscountedProducts();
    
    // Renderizar los productos
    renderDiscountedProducts(products);
    
  } catch (error) {
    console.error('Error al cargar ofertas especiales:', error);
    
    // Mostrar mensaje de error
    if (errorElement) {
      errorElement.textContent = 'No se pudieron cargar las ofertas. Intente recargar la página.';
      errorElement.classList.remove('hidden');
    }
    
    // Asegurarse de que la sección de ofertas esté vacía
    if (offersContainer) offersContainer.innerHTML = '';
    
  } finally {
    // Ocultar indicador de carga
    if (loadingElement) loadingElement.classList.add('hidden');
    
    // Mostrar contenedor de ofertas (incluso si está vacío)
    if (offersContainer) offersContainer.classList.remove('hidden');
  }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  checkSessionAndLoadDashboard();
  setupUserMenu();
  loadSpecialOffers();
});
