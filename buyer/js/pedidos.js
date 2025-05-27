// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const ordersContainer = document.getElementById('orders-container');
const orderTemplate = document.getElementById('order-template');
const searchInput = document.getElementById('search-orders');
const filterStatus = document.getElementById('filter-status');
const sortSelect = document.getElementById('sort-orders');

// Estado de la aplicación
let orders = [];

// Función para formatear fechas
function formatDate(dateString) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Función para formatear moneda
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Función para obtener la clase CSS según el estado del pedido
function getStatusClass(status) {
  const statusClasses = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'En proceso': 'bg-blue-100 text-blue-800',
    'Enviado': 'bg-indigo-100 text-indigo-800',
    'Entregado': 'bg-green-100 text-green-800',
    'Cancelado': 'bg-red-100 text-red-800'
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

// Función para mostrar pedidos en la interfaz
function displayOrders(ordersToDisplay) {
  if (!ordersToDisplay || ordersToDisplay.length === 0) {
    ordersContainer.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-box-open text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">No se encontraron pedidos</p>
      </div>
    `;
    return;
  }

  // Limpiar el contenedor
  ordersContainer.innerHTML = '';
  
  // Mostrar cada pedido
  ordersToDisplay.forEach(order => {
    const orderElement = orderTemplate.content.cloneNode(true);
    
    // Llenar los datos del pedido
    orderElement.querySelector('.order-id').textContent = order.id.substring(0, 8).toUpperCase();
    orderElement.querySelector('.order-date').textContent = formatDate(order.order_date);
    
    const statusElement = orderElement.querySelector('.order-status');
    statusElement.textContent = order.status;
    statusElement.className = `order-status px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`;
    
    orderElement.querySelector('.order-total').textContent = formatCurrency(parseFloat(order.total_amount));
    orderElement.querySelector('.store-name').textContent = order.store_name || 'Tienda Horizont';
    
    // Configurar el enlace de ver detalles
    orderElement.querySelector('.view-order-details').addEventListener('click', (e) => {
      e.preventDefault();
      // Aquí podrías redirigir a una página de detalles del pedido
      console.log('Ver detalles del pedido:', order.id);
    });
    
    ordersContainer.appendChild(orderElement);
  });
}

// Función para filtrar y ordenar pedidos
function filterAndSortOrders() {
  let filteredOrders = [...orders];
  
  // Filtrar por búsqueda
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(order => 
      order.id.toLowerCase().includes(searchTerm) ||
      (order.store_name && order.store_name.toLowerCase().includes(searchTerm)) ||
      order.status.toLowerCase().includes(searchTerm)
    );
  }
  
  // Filtrar por estado
  const statusFilter = filterStatus.value;
  if (statusFilter) {
    filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
  }
  
  // Ordenar
  const sortOption = sortSelect.value;
  switch (sortOption) {
    case 'newest':
      filteredOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
      break;
    case 'oldest':
      filteredOrders.sort((a, b) => new Date(a.order_date) - new Date(b.order_date));
      break;
    case 'amount-asc':
      filteredOrders.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
      break;
    case 'amount-desc':
      filteredOrders.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
      break;
  }
  
  // Mostrar los pedidos filtrados y ordenados
  displayOrders(filteredOrders);
}

// Función para mostrar errores
function showError(message) {
  console.error('Error:', message);
  errorText.textContent = message;
  errorElement.classList.remove('hidden');
  loadingElement.classList.add('hidden');
}

// Función para verificar la sesión y cargar los pedidos
async function checkSessionAndLoadOrders() {
  try {
    // Mostrar carga
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');
    
    // Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session) {
      window.location.href = 'login.html';
      return;
    }
    
    // Cargar los pedidos del usuario
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', session.user.id)
      .order('order_date', { ascending: false });
    
    if (ordersError) throw ordersError;
    
    // Guardar los pedidos en el estado
    orders = ordersData;
    
    // Mostrar los pedidos
    displayOrders(orders);
    
    // Ocultar carga
    loadingElement.classList.add('hidden');
    
  } catch (error) {
    showError('Error al cargar los pedidos: ' + error.message);
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

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  checkSessionAndLoadOrders();
  setupUserMenu();
  
  // Configurar eventos de búsqueda, filtrado y ordenamiento
  searchInput.addEventListener('input', filterAndSortOrders);
  filterStatus.addEventListener('change', filterAndSortOrders);
  sortSelect.addEventListener('change', filterAndSortOrders);
});
