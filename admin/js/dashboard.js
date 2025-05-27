// Configuración de Supabase
const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
let supabase;

// Esperar a que se cargue la biblioteca de Supabase
window.addEventListener('DOMContentLoaded', async () => {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // Verificar la estructura de la base de datos antes de continuar
    await checkDatabaseStructure();
    initApp();
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    showError('Error al conectar con la base de datos');
  }
});

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-button');
const logoutBtn = document.getElementById('logout-btn');

// Variables de estado
let isSidebarCollapsed = false;

// Función para verificar la estructura de la base de datos
async function checkDatabaseStructure() {
  try {
    console.log('Verificando estructura de la base de datos...');
    
    // Verificar si la tabla 'orders' existe
    const { data: ordersTable, error: ordersError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'orders');
      
    console.log('Tabla orders:', ordersTable);
    
    // Verificar si la tabla 'profiles' existe
    const { data: profilesTable, error: profilesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'profiles');
      
    console.log('Tabla profiles:', profilesTable);
    
    // Verificar las columnas de la tabla 'orders' si existe
    if (ordersTable && ordersTable.length > 0) {
      const { data: ordersColumns, error: columnsError } = await supabase
        .rpc('get_columns', { table_name: 'orders' });
      console.log('Columnas de orders:', ordersColumns);
    }
    
    // Verificar las columnas de la tabla 'profiles' si existe
    if (profilesTable && profilesTable.length > 0) {
      const { data: profilesColumns, error: profilesColumnsError } = await supabase
        .rpc('get_columns', { table_name: 'profiles' });
      console.log('Columnas de profiles:', profilesColumns);
    }
    
  } catch (error) {
    console.error('Error al verificar la estructura de la base de datos:', error);
  }
}

// Funciones de utilidad
function showError(message) {
  if (errorElement && errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
  console.error('Error:', message);
}

// Función para verificar autenticación
async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    if (!session) window.location.href = '/login.html';
    
    return session;
  } catch (error) {
    console.error('Error de autenticación:', error.message);
    window.location.href = '/login.html';
  }
}

// Función para cargar datos del dashboard
async function loadDashboardData() {
  try {
    // Obtener estadísticas generales
    const [
      { count: usersCount },
      { count: productsCount },
      { count: ordersCount },
      { count: pendingPqrsCount }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('pqrs').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Actualizar contadores
    document.getElementById('total-users').textContent = usersCount || 0;
    document.getElementById('total-products').textContent = productsCount || 0;
    document.getElementById('total-orders').textContent = ordersCount || 0;
    document.getElementById('pending-pqrs').textContent = pendingPqrsCount || 0;
    
    // Cargar últimas órdenes
    await loadRecentOrders();
    
    // Inicializar gráficos
    initCharts();
    
  } catch (error) {
    console.error('Error cargando datos del dashboard:', error);
    showError('Error al cargar los datos del dashboard');
  } finally {
    if (loadingElement) loadingElement.classList.add('hidden');
  }
}

// Función para cargar órdenes recientes
async function loadRecentOrders() {
  try {
    // Verificar que supabase esté inicializado
    if (!supabase) {
      console.error('Error: Supabase no está inicializado');
      showError('Error de conexión con la base de datos');
      return;
    }

    console.log('Iniciando carga de órdenes recientes...');
    
    // Primero, intentar obtener solo los IDs de las órdenes para verificar la conexión
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('Error de prueba al conectar con Supabase:', testError);
      throw testError;
    }
    
    console.log('Conexión con Supabase exitosa, obteniendo órdenes...');
    
    // Consulta simplificada sin joins ni relaciones
    const { data: orders, error, status } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    console.log('Respuesta de Supabase - Órdenes:', orders);
    console.log('Error de Supabase:', error);
    
    if (error) {
      console.error('Error al cargar las órdenes:', error);
      throw new Error(`Error ${status}: ${error.message}`);
    }

    // Si no hay órdenes, mostrar mensaje
    if (!orders || orders.length === 0) {
      const ordersContainer = document.getElementById('recent-orders');
      if (ordersContainer) {
        ordersContainer.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay órdenes recientes</td></tr>';
      }
      return [];
    }

    // Verificar si hay un error en la consulta
    if (error) {
      console.error('Error en la consulta de órdenes:', error);
      throw new Error(`Error ${status}: ${error.message}`);
    }

    const ordersContainer = document.getElementById('recent-orders');
    if (!ordersContainer) {
      console.error('No se encontró el contenedor de órdenes');
      return;
    }

    if (orders.length === 0) {
      ordersContainer.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay órdenes recientes</td></tr>';
      return;
    }

    console.log('Mostrando', orders.length, 'órdenes');
    
    // Crear el HTML de las órdenes con datos básicos
    ordersContainer.innerHTML = orders.map(order => {
      console.log('Procesando orden:', order);
      
      // Intentar formatear la fecha de manera segura
      let formattedDate = 'Fecha no disponible';
      try {
        if (order.created_at) {
          formattedDate = new Date(order.created_at).toLocaleDateString();
        }
      } catch (e) {
        console.error('Error al formatear la fecha:', e);
      }
      
      // Obtener el ID de la orden de manera segura
      const orderId = order.id || 'N/A';
      const shortId = typeof orderId === 'string' ? orderId.substring(0, 8) : orderId;
      
      // Obtener el estado de la orden con un valor por defecto
      const status = order.status || 'unknown';
      
      // Determinar las clases CSS según el estado
      let statusClass = 'bg-gray-100 text-gray-800';
      let statusText = 'Desconocido';
      
      if (status === 'completed') {
        statusClass = 'bg-green-100 text-green-800';
        statusText = 'Completado';
      } else if (status === 'pending') {
        statusClass = 'bg-yellow-100 text-yellow-800';
        statusText = 'Pendiente';
      } else if (status === 'cancelled') {
        statusClass = 'bg-red-100 text-red-800';
        statusText = 'Cancelado';
      }
      
      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${shortId}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.user_id ? `Usuario ${order.user_id}` : 'Cliente'}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
              ${statusText}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <a href="orden-detalle.html?id=${orderId}" class="text-blue-600 hover:text-blue-900">Ver detalle</a>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error cargando órdenes recientes:', error);
    showError('Error al cargar las órdenes recientes');
  }
}

// Función para inicializar gráficos
function initCharts() {
  // Gráfico de ventas mensuales
  const salesCtx = document.getElementById('sales-chart');
  if (salesCtx) {
    new Chart(salesCtx, {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Ventas',
          data: [65, 59, 80, 81, 56, 55, 40],
          borderColor: 'rgb(59, 130, 246)',
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// Función para alternar la barra lateral
function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
  
  // Actualizar la interfaz según el tamaño de pantalla actual
  if (window.innerWidth >= 768) {
    // Modo escritorio
    if (isSidebarCollapsed) {
      mainContent.classList.add('expanded');
    } else {
      mainContent.classList.remove('expanded');
    }
    // Asegurarse de que el menú sea visible en escritorio
    sidebar.classList.remove('hidden');
    sidebar.style.transform = 'translateX(0)';
  } else {
    // Modo móvil
    if (isSidebarCollapsed) {
      sidebar.classList.add('hidden');
    } else {
      sidebar.classList.remove('hidden');
      sidebar.style.transform = 'translateX(0)';
    }
  }
  
  // Actualizar ícono del botón
  const icon = toggleSidebarBtn?.querySelector('i');
  if (icon) {
    if (isSidebarCollapsed) {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    } else {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    }
  }
}

// Función para cerrar sesión
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showError('Error al cerrar sesión');
  }
}

// Función de inicialización de la aplicación
async function initApp() {
  try {
    // Verificar autenticación
    const session = await checkAuth();
    
    // Cargar datos del usuario
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        document.getElementById('user-name').textContent = profile.full_name || 'Administrador';
        document.getElementById('user-role').textContent = profile.role === 'admin' ? 'Administrador' : 'Usuario';
      }
    }
    
    // Cargar datos del dashboard
    await loadDashboardData();
    
    // Configurar eventos
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
    
    // Cerrar menú al hacer clic en el overlay (solo móvil)
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        if (window.innerWidth < 768 && !isSidebarCollapsed) {
          toggleSidebar();
        }
      });
    }
    
    // Cerrar menú al hacer clic en un enlace (solo móvil)
    const menuLinks = document.querySelectorAll('#sidebar a');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          toggleSidebar();
        }
      });
    });
    
    // Inicializar el estado de la barra lateral
    isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Asegurarse de que el menú esté en el estado correcto al cargar
    if (window.innerWidth >= 768) {
      // En escritorio, asegurarse de que el menú esté visible
      sidebar.style.transition = 'none'; // Desactivar transiciones durante la inicialización
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.opacity = '1';
      sidebar.style.pointerEvents = 'auto';
      sidebar.style.display = 'flex';
      sidebar.classList.remove('hidden');
      
      // Aplicar el estado de colapso guardado
      if (isSidebarCollapsed) {
        mainContent.classList.add('expanded');
      } else {
        mainContent.classList.remove('expanded');
      }
      
      // Reactivar transiciones después de la inicialización
      setTimeout(() => {
        sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease, width 0.3s ease';
      }, 10);
    } else {
      // En móviles, el menú está oculto por defecto
      sidebar.style.transition = 'none';
      sidebar.style.transform = 'translateX(-100%)';
      sidebar.style.opacity = '0';
      sidebar.style.pointerEvents = 'none';
      sidebar.style.display = 'none';
      sidebar.classList.add('hidden');
      
      // Asegurarse de que el contenido ocupe todo el ancho en móviles
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    }
    
    // Actualizar el ícono del botón según el estado
    const icon = toggleSidebarBtn?.querySelector('i');
    if (icon) {
      icon.className = isSidebarCollapsed ? 'fas fa-bars' : 'fas fa-times';
    }
    
    // Forzar un reflow para asegurar que las transiciones funcionen
    void sidebar.offsetWidth;
    
  } catch (error) {
    console.error('Error inicializando dashboard:', error);
    showError('Error al inicializar el dashboard');
  }
}

// Función para manejar cambios de tamaño de pantalla
function handleResize() {
  if (window.innerWidth >= 768) {
    // Modo escritorio
    sidebar.style.transition = 'none'; // Desactivar transiciones temporalmente
    sidebar.style.transform = 'translateX(0)';
    sidebar.style.opacity = '1';
    sidebar.style.pointerEvents = 'auto';
    sidebar.style.display = 'flex';
    sidebar.classList.remove('hidden');
    
    // Asegurarse de que el contenido tenga el ancho correcto
    if (isSidebarCollapsed) {
      mainContent.classList.add('expanded');
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    } else {
      mainContent.classList.remove('expanded');
      mainContent.style.marginLeft = '16rem';
      mainContent.style.width = 'calc(100% - 16rem)';
    }
    
    // Reactivar transiciones después de aplicar los cambios
    setTimeout(() => {
      sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease, width 0.3s ease';
    }, 10);
  } else {
    // Modo móvil
    sidebar.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    if (isSidebarCollapsed) {
      sidebar.style.transform = 'translateX(-100%)';
      sidebar.style.opacity = '0';
      sidebar.style.pointerEvents = 'none';
      sidebar.style.display = 'none';
      sidebar.classList.add('hidden');
      
      // Asegurarse de que el contenido ocupe todo el ancho en móviles
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    } else {
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.opacity = '1';
      sidebar.style.pointerEvents = 'auto';
      sidebar.style.display = 'flex';
      sidebar.classList.remove('hidden');
      
      // Asegurarse de que el contenido ocupe el espacio restante
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    }
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // La inicialización de la aplicación ahora se maneja en initApp()
  // que se llama después de cargar Supabase
  
  // Manejar cambios de tamaño de pantalla
  window.addEventListener('resize', handleResize);
});