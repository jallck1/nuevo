import { supabase } from '../config/supabase.js';
import { ProductsService } from '../modules/api/products.service.js';

export class Catalog {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.products = [];
    this.categories = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.productsService = new ProductsService(supabase);
    this.storeId = null;
    this.initialize();
  }

  async initialize() {
    console.log('Inicializando catálogo...');
    try {
      console.log('Verificando autenticación...');
      const session = await this.checkAuth();
      if (!session) {
        console.log('No hay sesión activa, redirigiendo...');
        return;
      }
      
      console.log('Sesión activa:', session.user.email);
      console.log('Mostrando indicador de carga...');
      this.showLoading(true);
      
      // Cargar categorías y productos en paralelo para mejor rendimiento
      console.log('Cargando categorías y productos...');
      await Promise.all([
        this.loadCategories(),
        this.loadProducts()
      ]);
      
      console.log('Configurando escuchadores de eventos...');
      this.setupEventListeners();
      console.log('Catálogo inicializado correctamente');
      
    } catch (error) {
      console.error('Error al inicializar el catálogo:', error);
      this.showNotification(
        'Error al cargar el catálogo. Por favor, recarga la página. ' + 
        (error.message || ''), 
        'error'
      );
    } finally {
      console.log('Ocultando indicador de carga...');
      this.showLoading(false);
    }
  }

  async checkAuth() {
    console.log('Verificando autenticación...');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error al verificar la sesión:', sessionError);
        throw sessionError;
      }
      
      if (!session) {
        console.log('No hay sesión activa, redirigiendo a login...');
        window.location.href = '/login.html';
        return null;
      }
      
      console.log('Sesión activa para el usuario:', session.user.email);
      
      // Obtener el perfil del usuario para acceder al store_id
      console.log('Obteniendo perfil del usuario...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('store_id, role')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        console.error('Error al obtener el perfil del usuario:', profileError);
        throw profileError;
      }
      
      console.log('Perfil del usuario:', profile);
      
      if (!profile?.store_id) {
        const errorMsg = 'El usuario no está asociado a ninguna tienda';
        console.error(errorMsg);
        this.showNotification('No tienes una tienda asignada', 'error');
        return null;
      }
      
      this.storeId = profile.store_id;
      console.log('ID de la tienda del usuario:', this.storeId);
      
      return session;
      
    } catch (error) {
      console.error('Error en checkAuth:', error);
      throw error;
    }
  }

  async loadCategories() {
    try {
      if (!this.storeId) return;
      
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_id', this.storeId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      this.categories = categories || [];
      this.renderCategoryFilter();
      
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.showNotification('Error al cargar las categorías', 'error');
    }
  }

  renderCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // Limpiar opciones existentes
    categoryFilter.innerHTML = `
      <option value="">Todas las categorías</option>
      ${this.categories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
      ).join('')}
    `;
  }

  async loadProducts() {
    try {
      console.log('🔄 [Catalog] Iniciando carga de productos...');
      
      // Obtener elementos del DOM
      const searchInput = document.getElementById('search-input');
      const categoryFilter = document.getElementById('category-filter');
      const sortBy = document.getElementById('sort-by');
      
      // Configurar filtros básicos
      const filters = {
        store_id: this.storeId,
        status: 'active',
        search: searchInput?.value || '',
        category_id: categoryFilter?.value || undefined,
        orderBy: 'name',
        orderAsc: true
      };
      
      console.log('🔍 [Catalog] Filtros aplicados:', JSON.stringify(filters, null, 2));
      
      // Limpiar productos actuales
      this.products = [];
      
      // Mostrar estado de carga
      this.showLoading(true);
      
      // Cargar productos con los filtros aplicados
      console.log('📡 [Catalog] Solicitando productos al servicio...');
      const result = await this.productsService.getProducts(filters);
      
      console.log('📥 [Catalog] Respuesta del servicio de productos:', result);
      
      if (!result.success) {
        const errorMsg = result.error || 'Error desconocido al cargar los productos';
        console.error('❌ [Catalog] Error del servicio de productos:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Asegurarse de que los datos sean un array
      const productsData = Array.isArray(result.data) ? result.data : [];
      console.log(`✅ [Catalog] Se encontraron ${productsData.length} productos`);
      
      // Asignar los productos directamente (ya están procesados en el servicio)
      this.products = productsData;
      
      // Renderizar productos
      this.renderProducts();
      
    } catch (error) {
      console.error('Error al cargar productos:', error);
      this.showNotification(
        error.message || 'Error al cargar los productos. Por favor, verifica tu conexión e inténtalo de nuevo.',
        'error'
      );
      
      // Renderizar estado de error
      this.renderErrorState('No se pudieron cargar los productos. Por favor, inténtalo de nuevo.');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Muestra un mensaje de error en la interfaz
   * @param {string} message - Mensaje de error a mostrar
   */
  renderErrorState(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="col-span-full text-center py-16">
        <div class="inline-block p-6 bg-red-50 rounded-lg shadow-md max-w-md">
          <i class="fas fa-exclamation-triangle text-5xl text-red-400 mb-4"></i>
          <h3 class="text-xl font-medium text-gray-800 mb-2">¡Ups! Algo salió mal</h3>
          <p class="text-gray-600 mb-4">${message}</p>
          <button 
            onclick="location.reload()" 
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            <i class="fas fa-sync-alt mr-2"></i>Reintentar
          </button>
        </div>
      </div>`;
  }

  /**
   * Renderiza la lista de productos en el contenedor
   */
  async renderProducts() {
    if (!this.container) {
      console.error('No se encontró el contenedor del catálogo');
      return;
    }
    
    console.log('Renderizando productos...');
    console.log('Productos a renderizar:', this.products);
    
    try {
      // Limpiar contenedor
      this.container.innerHTML = '';
      
      // Mostrar mensaje si no hay productos
      if (!this.products || !this.products.length) {
        this.container.innerHTML = `
          <div class="col-span-full text-center py-16">
            <div class="inline-block p-6 bg-white rounded-lg shadow-md">
              <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
              <h3 class="text-xl font-medium text-gray-700 mb-2">No hay productos disponibles</h3>
              <p class="text-gray-500">No se encontraron productos en esta tienda.</p>
              <button 
                onclick="location.reload()" 
                class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <i class="fas fa-sync-alt mr-2"></i>Reintentar
              </button>
            </div>
          </div>`;
        return;
      }
      
      // Crear contenedor de la cuadrícula
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      
      // Agregar productos a la cuadrícula
      this.products.forEach(product => {
        const productCard = this.renderProductCard(product);
        if (productCard) {
          grid.appendChild(productCard);
        }
      });
      
      // Agregar la cuadrícula al contenedor
      this.container.appendChild(grid);
      
    } catch (error) {
      console.error('Error al cargar productos:', error);
      this.container.innerHTML = `
        <div class="col-span-full text-center py-16">
          <div class="inline-block p-6 bg-red-50 rounded-lg shadow-md">
            <i class="fas fa-exclamation-triangle text-5xl text-red-400 mb-4"></i>
            <h3 class="text-xl font-medium text-gray-700 mb-2">Error al cargar los productos</h3>
            <p class="text-gray-500">Por favor, inténtalo de nuevo más tarde.</p>
          </div>
        </div>`;
    } finally {
      this.showLoading(false);
    }
  }

  renderProductCard(product) {
    try {
      console.log('Renderizando producto:', product);
      if (!product) return null;
      
      // Formatear el precio
      const formatPrice = (price) => {
        return price ? 
          new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0
          }).format(price) : 
          '$0';
      };
      
      const price = formatPrice(product.price);
      const priceHtml = `<div class="text-xl font-bold text-gray-900">${price}</div>`;
      
      // Obtener el nombre de la categoría
      let categoryName = 'Sin categoría';
      if (product.category && product.category.name) {
        categoryName = product.category.name;
      } else if (product.category_id && typeof product.category_id === 'object' && product.category_id.name) {
        categoryName = product.category_id.name;
      } else if (typeof product.category === 'string') {
        categoryName = product.category;
      }
      
      // Crear elemento de tarjeta
      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer';
      card.dataset.productId = product.id;
      
      // Construir HTML de la tarjeta
      card.innerHTML = `
        <div class="relative">
          <img 
            src="${product.image_url || 'https://via.placeholder.com/300x200?text=Sin+imagen'}" 
            alt="${product.name || 'Producto'}" 
            class="w-full h-48 object-cover"
            onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible'"
          >
          ${!product.stock || product.stock <= 0 ? `
            <div class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              Agotado
            </div>
          ` : ''}
        </div>
        <div class="p-4">
          <div class="flex justify-between items-start">
            <h3 class="font-semibold text-gray-800 text-lg mb-1 line-clamp-2" title="${product.name || 'Producto sin nombre'}">
              ${product.name || 'Producto sin nombre'}
            </h3>
          </div>
          
          <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
            ${categoryName}
          </span>
          
          <p class="text-gray-600 text-sm mb-3 line-clamp-2">
            ${product.description || 'Sin descripción'}
          </p>
          
          ${priceHtml}
          
          <div class="mt-4 flex justify-between items-center">
            <span class="text-sm text-gray-500">
              ${product.stock || 0} disponibles
            </span>
            <button 
              class="add-to-cart bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors ${!product.stock ? 'opacity-50 cursor-not-allowed' : ''}"
              ${!product.stock ? 'disabled' : ''}
              data-product-id="${product.id}"
            >
              <i class="fas fa-cart-plus mr-1"></i> Agregar
            </button>
          </div>
        </div>
      `;
      
      return card;
      
    } catch (error) {
      console.error('Error al renderizar tarjeta de producto:', error);
      return null;
    }
  }

  renderPagination() {
    // Implementar lógica de paginación si es necesario
  }

  setupEventListeners() {
    // Manejar clics en el carrito
    document.addEventListener('click', (e) => {
      // Manejar agregar al carrito
      const addToCartBtn = e.target.closest('.add-to-cart');
      if (addToCartBtn) {
        const productId = addToCartBtn.dataset.productId;
        this.addToCart(productId);
        return;
      }
      
      // Manejar clic en la tarjeta del producto para ver detalles
      const productCard = e.target.closest('.product-card');
      if (productCard && !addToCartBtn) {
        const productId = productCard.dataset.productId;
        this.showProductDetails(productId);
      }
    });
    
    // Buscador con debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.loadProducts();
      }, 500));
    }

    // Filtro de categoría
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        this.loadProducts();
      });
    }
    
    // Cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (!error) {
          window.location.href = '/login.html';
        }
      });
    }
  }

  async showProductDetails(productId) {
    try {
      // Buscar el producto en la lista actual
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      
      // Crear el modal de detalles
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
      
      // Formatear precio
      const formatPrice = (price) => {
        return price ? 
          new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0
          }).format(price) : 
          '$0';
      };
      
      // Obtener nombre de categoría
      const categoryName = product.category_id?.name || 'Sin categoría';
      
      // Construir el contenido del modal
      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-start">
              <h2 class="text-2xl font-bold text-gray-900">${product.name || 'Producto sin nombre'}</h2>
              <button class="text-gray-400 hover:text-gray-500">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>
            
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Imagen del producto -->
              <div class="bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src="${product.image_url || 'https://via.placeholder.com/500x500?text=Sin+imagen'}" 
                  alt="${product.name || 'Producto'}" 
                  class="w-full h-auto object-cover"
                  onerror="this.onerror=null; this.src='https://via.placeholder.com/500x500?text=Imagen+no+disponible'"
                >
              </div>
              
              <!-- Detalles del producto -->
              <div>
                <div class="flex items-center mb-4">
                  <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    ${categoryName}
                  </span>
                  ${!product.stock || product.stock <= 0 ? `
                    <span class="ml-2 inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      Agotado
                    </span>
                  ` : ''}
                </div>
                
                <div class="mb-6">
                  <p class="text-2xl font-bold text-gray-900">${formatPrice(product.price)}</p>
                </div>
                
                <div class="mb-6">
                  <h3 class="text-sm font-medium text-gray-900">Descripción</h3>
                  <p class="mt-2 text-gray-600">${product.description || 'No hay descripción disponible.'}</p>
                </div>
                
                ${product.stock > 0 ? `
                  <div class="flex items-center space-x-4">
                    <button class="add-to-cart bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                      data-product-id="${product.id}">
                      <i class="fas fa-cart-plus mr-2"></i> Agregar al carrito
                    </button>
                  </div>
                ` : `
                  <p class="text-red-500">Producto sin stock disponible</p>
                `}
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Agregar el modal al documento
      document.body.appendChild(modal);
      
      // Cerrar el modal al hacer clic en la X
      const closeButton = modal.querySelector('button');
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
      
      // Cerrar el modal al hacer clic fuera del contenido
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
    } catch (error) {
      console.error('Error al mostrar detalles del producto:', error);
      this.showNotification('Error al cargar los detalles del producto', 'error');
    }
  }

  async addToCart(productId) {
    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login.html';
        return;
      }
      
      // Obtener el producto
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      
      // Verificar stock
      if (product.stock <= 0) {
        this.showNotification('No hay stock disponible de este producto', 'error');
        return;
      }
      
      // Obtener el carrito actual del usuario
      const { data: cart, error: cartError } = await supabase
        .from('carts')
        .select('id, items')
        .eq('user_id', session.user.id)
        .single();
      
      let cartId;
      let items = [];
      
      if (cartError && cartError.code !== 'PGRST116') { // PGRST116 = no rows
        throw cartError;
      }
      
      if (cart) {
        cartId = cart.id;
        items = cart.items || [];
      } else {
        // Crear nuevo carrito si no existe
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert([{ user_id: session.user.id, items: [] }])
          .select()
          .single();
          
        if (createError) throw createError;
        cartId = newCart.id;
      }
      
      // Verificar si el producto ya está en el carrito
      const existingItemIndex = items.findIndex(item => item.product_id === productId);
      
      if (existingItemIndex >= 0) {
        // Incrementar cantidad si el producto ya está en el carrito
        items[existingItemIndex].quantity += 1;
      } else {
        // Agregar nuevo ítem al carrito
        items.push({
          product_id: productId,
          quantity: 1,
          price: product.price,
          name: product.name,
          image_url: product.image_url
        });
      }
      
      // Actualizar el carrito en la base de datos
      const { error: updateError } = await supabase
        .from('carts')
        .update({ items, updated_at: new Date().toISOString() })
        .eq('id', cartId);
        
      if (updateError) throw updateError;
      
      // Mostrar notificación de éxito
      this.showNotification('Producto agregado al carrito', 'success');
      
      // Actualizar contador del carrito
      this.updateCartCounter();
      
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      this.showNotification(
        error.message || 'Error al agregar el producto al carrito', 
        'error'
      );
    }
  }

  async updateCartCounter() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Obtener el carrito del usuario
      const { data: cart, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignorar si no hay carrito
      
      // Calcular el total de ítems
      let totalItems = 0;
      if (cart?.items?.length) {
        totalItems = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
      
      // Actualizar el contador en la interfaz
      const counterElement = document.getElementById('cart-counter');
      if (counterElement) {
        counterElement.textContent = totalItems;
        counterElement.classList.toggle('hidden', totalItems === 0);
      }
      
      // Devolver el total para uso externo si es necesario
      return totalItems;
      
    } catch (error) {
      console.error('Error al actualizar el contador del carrito:', error);
      return 0;
    }
  }

  showLoading(show) {
    const loadingElement = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    
    if (loadingElement) {
      loadingElement.classList.toggle('hidden', !show);
    }
    
    // Opcional: deshabilitar interacción con el contenido principal
    if (mainContent) {
      mainContent.style.opacity = show ? '0.5' : '1';
      mainContent.style.pointerEvents = show ? 'none' : 'auto';
    }
  }

  showNotification(message, type = 'info') {
    // Eliminar notificaciones existentes
    const existingNotif = document.getElementById('global-notification');
    if (existingNotif) {
      existingNotif.remove();
    }
    
    // Mapear tipos de notificación a estilos
    const typeStyles = {
      success: 'bg-green-100 border-green-500 text-green-700',
      error: 'bg-red-100 border-red-500 text-red-700',
      info: 'bg-blue-100 border-blue-500 text-blue-700',
      warning: 'bg-yellow-100 border-yellow-500 text-yellow-700'
    };
    
    // Mapear iconos
    const typeIcons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      info: 'info-circle',
      warning: 'exclamation-triangle'
    };
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.id = 'global-notification';
    notification.className = `fixed top-4 right-4 border-l-4 p-4 rounded shadow-lg ${typeStyles[type] || typeStyles.info} max-w-md z-50 flex items-start`;
    notification.role = 'alert';
    
    // Contenido de la notificación
    notification.innerHTML = `
      <i class="fas fa-${typeIcons[type] || 'info-circle'} mr-2 mt-0.5"></i>
      <div class="flex-grow">
        <p class="font-medium">${message}</p>
      </div>
      <button class="ml-4 text-xl hover:text-gray-700 transition-colors">&times;</button>
    `;
    
    // Agregar al documento
    document.body.appendChild(notification);
    
    // Configurar el botón de cierre
    const closeButton = notification.querySelector('button');
    const closeNotification = () => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };
    
    closeButton.addEventListener('click', closeNotification);
    
    // Cerrar automáticamente después de 5 segundos
    const timeoutId = setTimeout(closeNotification, 5000);
    
    // Cancelar el cierre automático al hacer hover
    notification.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
    });
    
    // Reanudar cuenta regresiva al quitar el hover
    notification.addEventListener('mouseleave', () => {
      clearTimeout(timeoutId);
      setTimeout(closeNotification, 2000);
    });
  }
  
  // Función para limitar la frecuencia de ejecución de una función
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
}

// Inicializar el catálogo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('catalog-container')) {
    new Catalog('catalog-container');
  }
});
