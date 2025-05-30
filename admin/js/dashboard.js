// Usar el cliente de Supabase desde window
const supabase = window.supabase;

// Configuración de paginación
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let totalItems = 0;
let totalPages = 1;

// Estado del menú móvil
let isMobileMenuOpen = false;

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const logoutBtn = document.getElementById('logout-btn');

// Variables de estado globales
globalThis.isMobileMenuOpen = false;
globalThis.isDesktopSidebarCollapsed = false;

// Verificar si Supabase está disponible
if (!window.supabase) {
  console.error('Error: Supabase no está disponible. Asegúrate de que el script de Supabase se cargue correctamente.');
}

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
    const isAuthenticated = await window.checkAuth();
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, redirigiendo...');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error en checkAuth:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Función para verificar órdenes pendientes
async function verificarOrdenesPendientes() {
  try {
    console.log('🔍 Verificando órdenes pendientes...');
    
    // Obtener el store_id del usuario autenticado
    const storeId = await getUserStoreId();
    if (!storeId) {
      console.warn('No se pudo obtener el ID de la tienda');
      return { count: 0, items: [] };
    }
    
    // Consultar órdenes pendientes
    const { data: ordenes, error } = await supabase
      .from('orders')
      .select('id, created_at, status, total_amount')
      .eq('store_id', storeId)
      .eq('status', 'Pendiente')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`📦 Se encontraron ${ordenes?.length || 0} órdenes pendientes`);
    return { 
      count: ordenes?.length || 0, 
      items: ordenes || []
    };
  } catch (error) {
    console.error('Error al verificar órdenes pendientes:', error);
    return { count: 0, items: [] };
  }
}

// Función para verificar PQRS sin resolver
async function verificarPqrsSinResolver() {
  try {
    console.log('🔍 Verificando PQRS sin resolver...');
    
    // Obtener el store_id del usuario autenticado
    const storeId = await getUserStoreId();
    if (!storeId) {
      console.warn('No se pudo obtener el ID de la tienda');
      return { count: 0, items: [] };
    }
    
    // Consultar PQRS sin resolver (estado 'pendiente' o 'en_proceso')
    const { data: pqrs, error } = await supabase
      .from('pqrs')
      .select('id, subject, status, created_at')
      .eq('store_id', storeId)
      .or('status.eq.pendiente,status.eq.en_proceso')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`📝 Se encontraron ${pqrs?.length || 0} PQRS sin resolver`);
    return { 
      count: pqrs?.length || 0, 
      items: pqrs || []
    };
  } catch (error) {
    console.error('Error al verificar PQRS sin resolver:', error);
    return { count: 0, items: [] };
  }
}

// Función para actualizar la notificación en la campanita
function actualizarNotificacionStock(estado, cantidad = 0, productos = []) {
  console.log('📢 Actualizando notificaciones de stock...');
  const notificationBadge = document.getElementById('notification-badge');
  const notificationList = document.getElementById('notifications-list');
  
  // Verificar si los elementos existen
  if (!notificationList) {
    console.warn('❌ No se encontró el elemento notifications-list');
    return; // Salir si no existe el elemento
  }
  
  // Limpiar notificaciones anteriores
  notificationList.innerHTML = '';
  
  console.log(`📊 Estado de stock: ${estado}, Cantidad: ${cantidad}, Productos:`, productos);
  
  switch(estado) {
    case 'bajo':
      // Mostrar notificación de stock bajo
      if (notificationBadge) {
        notificationBadge.textContent = cantidad > 9 ? '9+' : cantidad.toString();
        notificationBadge.classList.remove('hidden');
        notificationBadge.classList.remove('bg-blue-500');
        notificationBadge.classList.add('bg-yellow-500');
      }
      
      // Agregar notificación a la lista
      const notificationItem = document.createElement('a');
      notificationItem.href = '#';
      notificationItem.className = 'block px-4 py-3 hover:bg-gray-100 border-b border-gray-100';
      notificationItem.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 pt-0.5">
            <i class="fas fa-exclamation-triangle text-yellow-500"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">Stock Bajo</p>
            <p class="text-sm text-gray-500">Tienes ${cantidad} producto${cantidad !== 1 ? 's' : ''} con stock bajo</p>
            <div class="mt-1 text-xs text-gray-500">
              ${productos.slice(0, 3).map(p => 
                `<div class="truncate">${p.name || 'Producto'} - ${p.stock} unidades</div>`
              ).join('')}
              ${productos.length > 3 ? `<div class="text-blue-600 font-medium">...y ${productos.length - 3} más</div>` : ''}
            </div>
          </div>
        </div>
      `;
      notificationList.prepend(notificationItem);
      break;
      
    case 'optimo':
      // Ocultar notificación de alerta
      if (notificationBadge) {
        notificationBadge.classList.add('hidden');
      }
      
      // Agregar notificación de stock óptimo
      const optimalItem = document.createElement('a');
      optimalItem.href = '#';
      optimalItem.className = 'block px-4 py-3 hover:bg-gray-100 border-b border-gray-100';
      optimalItem.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 pt-0.5">
            <i class="fas fa-check-circle text-green-500"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">Stock Óptimo</p>
            <p class="text-sm text-gray-500">Todos los productos tienen niveles de stock adecuados</p>
          </div>
        </div>`;
      notificationList.prepend(optimalItem);
      break;
      
    case 'exceso':
      // Mostrar notificación de exceso de stock
      if (notificationBadge) {
        notificationBadge.textContent = cantidad > 9 ? '9+' : cantidad.toString();
        notificationBadge.classList.remove('hidden');
        notificationBadge.classList.remove('bg-yellow-500');
        notificationBadge.classList.add('bg-blue-500');
      }
      
      // Agregar notificación a la lista
      const excessItem = document.createElement('a');
      excessItem.href = '#';
      excessItem.className = 'block px-4 py-3 hover:bg-gray-100 border-b border-gray-100';
      excessItem.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 pt-0.5">
            <i class="fas fa-boxes text-blue-500"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">Exceso de Stock</p>
            <p class="text-sm text-gray-500">Tienes ${cantidad} producto${cantidad !== 1 ? 's' : ''} con más de 5000 unidades</p>
            <div class="mt-1 text-xs text-gray-500">
              ${productos.slice(0, 3).map(p => 
                `<div class="truncate">${p.name || 'Producto'} - ${p.stock} unidades</div>`
              ).join('')}
              ${productos.length > 3 ? `<div class="text-blue-600 font-medium">...y ${productos.length - 3} más</div>` : ''}
            </div>
          </div>
        </div>`;
      notificationList.prepend(excessItem);
      break;
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
      newAlertContainer.className = 'w-full px-4 md:px-6 pt-4';
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

// Función para cargar datos del dashboard
async function loadDashboardData() {
  try {
    // Verificar stock bajo
    await checkStockBajo();
    
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
      
    // Agregar el botón "Ver más" al final de la tabla
    const verMasHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 text-center">
          <a href="orders.html" class="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
            Ver todas las órdenes
            <i class="fas fa-arrow-right ml-2"></i>
          </a>
        </td>
      </tr>
    `;
      
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
            <a href="orders.html?id=${orderId}" class="text-blue-600 hover:text-blue-900">Ver detalle</a>
          </td>
        </tr>
      `;
    }).join('') + verMasHTML;
  } catch (error) {
    console.error('Error cargando órdenes recientes:', error);
    showError('Error al cargar las órdenes recientes');
  }
}

// Función para obtener datos de ventas mensuales
async function getMonthlySales() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // Agrupar ventas por mes
    const monthlySales = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Inicializar todos los meses con 0
    months.forEach(month => {
      monthlySales[month] = 0;
    });
    
    // Procesar órdenes
    data?.forEach(order => {
      if (order.created_at) {
        const date = new Date(order.created_at);
        const month = months[date.getMonth()];
        if (month) {
          monthlySales[month] += parseFloat(order.total_amount || 0);
        }
      }
    });
    
    return {
      labels: months,
      data: months.map(month => monthlySales[month])
    };
  } catch (error) {
    console.error('Error al cargar ventas mensuales:', error);
    return {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
      data: [0, 0, 0, 0, 0, 0, 0]
    };
  }
}

// Función para inicializar gráficos
async function initCharts() {
  // Obtener datos de ventas mensuales
  const { labels, data: salesData } = await getMonthlySales();
  
  // Gráfico de ventas mensuales
  const salesCtx = document.getElementById('sales-chart');
  if (salesCtx) {
    // Destruir gráfico existente si existe
    if (window.salesChart) {
      window.salesChart.destroy();
    }
    
    window.salesChart = new Chart(salesCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventas',
          data: salesData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointBackgroundColor: 'white',
          pointBorderColor: 'rgb(59, 130, 246)',
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgb(59, 130, 246)',
          pointHoverBorderColor: 'white',
          pointHoverBorderWidth: 2,
          pointHitRadius: 10,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            mode: 'index', 
            intersect: false,
            backgroundColor: 'white',
            titleColor: '#1F2937',
            bodyColor: '#4B5563',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Ventas: $${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          line: {
            borderJoinStyle: 'round'
          }
        }
      }
    });
  }
}

// Función para actualizar el contenido principal cuando se alterna el sidebar
function updateMainContent() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // En móvil, el contenido principal siempre ocupa todo el ancho
    mainContent.style.marginLeft = '0';
    mainContent.style.width = '100%';
  } else {
    // En escritorio, ajustar según el estado del sidebar
    if (isDesktopSidebarCollapsed) {
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    } else {
      mainContent.style.marginLeft = '250px';
      mainContent.style.width = 'calc(100% - 250px)';
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

// Función para cargar el perfil del usuario
async function loadUserProfile() {
  try {
    const user = await window.getCurrentUser();
    
    if (!user) {
      console.error('No se encontró el usuario autenticado');
      window.location.href = 'login.html';
      return;
    }
    
    // Obtener el perfil del usuario
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (error) throw error;
    
    // Actualizar la interfaz con los datos del perfil
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const userInitials = document.getElementById('user-initials');
    const userAvatar = document.getElementById('user-avatar');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    
    // Mostrar nombre y rol
    if (profile.full_name) {
      const names = profile.full_name.split(' ');
      const initials = (names[0].charAt(0) + (names[1] ? names[1].charAt(0) : '')).toUpperCase();
      
      if (userName) userName.textContent = profile.full_name;
      if (dropdownUserName) dropdownUserName.textContent = profile.full_name;
      if (userInitials) userInitials.textContent = initials;
    } else {
      const emailName = user.email.split('@')[0];
      if (userName) userName.textContent = emailName;
      if (dropdownUserName) dropdownUserName.textContent = emailName;
      if (userInitials) userInitials.textContent = emailName.charAt(0).toUpperCase();
    }
    
    // Mostrar email
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email;
    
    // Mostrar avatar si existe
    if (profile.avatar_url && userAvatar) {
      userAvatar.src = profile.avatar_url;
      userAvatar.alt = profile.full_name || 'Avatar';
      userAvatar.classList.remove('hidden');
      if (userInitials) userInitials.classList.add('hidden');
    }
    
    // Mostrar rol
    if (userRole) {
      const roleText = {
        'admin': 'Administrador',
        'buyer': 'Comprador',
        'seller': 'Vendedor'
      };
      userRole.textContent = roleText[profile.role] || profile.role;
    }
    
    return profile;
    
  } catch (error) {
    console.error('Error al cargar el perfil del usuario:', error);
    showError('No se pudo cargar la información del perfil');
  }
}

// Función de inicialización de la aplicación
async function initApp() {
  try {
    console.log('Inicializando aplicación...');
    
    // Verificar autenticación
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      console.log('Usuario no autenticado, redirigiendo...');
      return;
    }
    
    console.log('Usuario autenticado, configurando interfaz...');
    
    // Configuraciones iniciales
    setupMobileMenu();
    setupUserMenu();
    setupNotifications();
    removeOrderCounters();
    
    // Cargar perfil del usuario
    await loadUserProfile();
    
    // Verificar estado del stock
    await checkStockBajo();
    
    // Configurar actualización periódica del estado del stock (cada 5 minutos)
    setInterval(checkStockBajo, 5 * 60 * 1000);
    
    // Cargar datos del dashboard
    await loadDashboardData();
    
    // Inicializar gráficos
    await initCharts();
    
    // Configurar eventos
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.logout();
      });
    }
    
    // Configurar el manejo de redimensionamiento
    window.addEventListener('resize', handleResize);
    
    console.log('Aplicación inicializada correctamente');
    
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    showError('Error al cargar la aplicación');
  }
}

// Función para manejar cambios de tamaño de pantalla
function handleResize() {
  const mainContent = document.getElementById('main-content');
  const desktopSidebar = document.getElementById('desktop-sidebar');
  
  if (!mainContent || !desktopSidebar) return;
  
  if (window.innerWidth >= 768) {
    // Modo escritorio
    desktopSidebar.style.display = 'block';
    
    // Asegurarse de que el contenido tenga el ancho correcto
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    if (isSidebarCollapsed) {
      mainContent.style.marginLeft = '0';
      mainContent.style.width = '100%';
    } else {
      mainContent.style.marginLeft = '16rem';
      mainContent.style.width = 'calc(100% - 16rem)';
    }
  } else {
    // Modo móvil - Asegurarse de que el menú de escritorio esté oculto
    desktopSidebar.style.display = 'none';
    
    // Asegurarse de que el contenido ocupe todo el ancho en móviles
    mainContent.style.marginLeft = '0';
    mainContent.style.width = '100%';
    
    // Cerrar el menú móvil si está abierto
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    if (mobileMenu && mobileMenuOverlay) {
      mobileMenu.classList.remove('open');
      mobileMenuOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
}

// Función para configurar el menú de usuario
function setupUserMenu() {
  console.log('🛠️ Configurando menú de usuario...');
  
  const userMenuButton = document.getElementById('user-menu-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (!userMenuButton || !userDropdown) {
    console.error('❌ No se encontraron los elementos del menú de usuario');
    if (!userMenuButton) console.error('❌ Falta el elemento: user-menu-button');
    if (!userDropdown) console.error('❌ Falta el elemento: user-dropdown');
    return;
  }
  
  console.log('✅ Elementos del menú de usuario encontrados');
  
  // Función para cerrar el menú de usuario
  const closeUserMenu = () => {
    console.log('🔒 Cerrando menú de usuario');
    userDropdown.classList.add('hidden');
    document.removeEventListener('click', handleClickOutside);
  };
  
  // Función para manejar clics fuera del menú
  const handleClickOutside = (e) => {
    console.log('🖱️ Manejando clic fuera del menú');
    if (!userDropdown.contains(e.target) && !userMenuButton.contains(e.target)) {
      closeUserMenu();
    }
  };
  
  // Mostrar/ocultar menú de usuario
  userMenuButton.addEventListener('click', (e) => {
    console.log('🖱️ Clic en el botón de usuario');
    e.stopPropagation();
    
    // Alternar visibilidad del menú
    const isOpening = userDropdown.classList.toggle('hidden');
    console.log(`🔄 Menú de usuario ${isOpening ? 'abierto' : 'cerrado'}`);
    
    // Si se está abriendo, agregar el event listener para cerrar al hacer clic fuera
    if (!isOpening) {
      console.log('➕ Agregando manejador de clics fuera del menú');
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 10);
    } else {
      console.log('➖ Eliminando manejador de clics fuera del menú');
      document.removeEventListener('click', handleClickOutside);
    }
    
    // Ocultar notificaciones si están abiertas
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    if (notificationsDropdown && !notificationsDropdown.classList.contains('hidden')) {
      console.log('👁️‍🗨️ Ocultando menú de notificaciones');
      notificationsDropdown.classList.add('hidden');
    }
  });
  
  // Cerrar menú al hacer clic en un enlace dentro del menú
  userDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      console.log('🔗 Clic en enlace del menú de usuario');
      closeUserMenu();
    }
  });
  
  console.log('✅ Menú de usuario configurado correctamente');
}

// Función para configurar notificaciones
function setupNotifications() {
  console.log('🔔 Configurando notificaciones...');
  
  const notificationsButton = document.getElementById('notifications-button');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  
  if (!notificationsButton || !notificationsDropdown) {
    console.error('❌ No se encontraron los elementos del menú de notificaciones');
    if (!notificationsButton) console.error('❌ Falta el elemento: notifications-button');
    if (!notificationsDropdown) console.error('❌ Falta el elemento: notifications-dropdown');
    return;
  }
  
  console.log('✅ Elementos de notificaciones encontrados');
  
  // Función para cerrar el menú de notificaciones
  const closeNotifications = () => {
    console.log('🔒 Cerrando menú de notificaciones');
    notificationsDropdown.classList.add('hidden');
    document.removeEventListener('click', handleClickOutside);
  };
  
  // Función para manejar clics fuera del menú
  const handleClickOutside = (e) => {
    console.log('🖱️ Manejando clic fuera de notificaciones');
    if (!notificationsDropdown.contains(e.target) && !notificationsButton.contains(e.target)) {
      closeNotifications();
    }
  };
  
  // Mostrar/ocultar menú de notificaciones
  notificationsButton.addEventListener('click', (e) => {
    console.log('🖱️ Clic en el botón de notificaciones');
    e.stopPropagation();
    
    // Alternar visibilidad del menú
    const isOpening = notificationsDropdown.classList.toggle('hidden');
    console.log(`🔄 Menú de notificaciones ${isOpening ? 'abierto' : 'cerrado'}`);
    
    // Si se está abriendo, agregar el event listener para cerrar al hacer clic fuera
    if (!isOpening) {
      console.log('➕ Agregando manejador de clics fuera de notificaciones');
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 10);
    } else {
      console.log('➖ Eliminando manejador de clics fuera de notificaciones');
      document.removeEventListener('click', handleClickOutside);
    }
    
    // Ocultar menú de usuario si está abierto
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      console.log('👤 Ocultando menú de usuario');
      userDropdown.classList.add('hidden');
    }
  });
  
  // Cerrar menú al hacer clic en un enlace dentro del menú
  notificationsDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      console.log('🔗 Clic en enlace de notificaciones');
      closeNotifications();
    }
  });
  
  // Ocultar notificación de "No hay notificaciones" si hay notificaciones
  const notificationsList = document.getElementById('notifications-list');
  const notificationBadge = document.getElementById('notification-badge');
  
  console.log('🔍 Verificando estado de notificaciones...');
  
  if (notificationsList) {
    const hasNotifications = notificationsList.querySelector('.notification-item');
    const noNotifications = notificationsList.querySelector('div.text-center');
    
    console.log(`📋 Notificaciones encontradas: ${hasNotifications ? 'Sí' : 'No'}`);
    
    if (hasNotifications) {
      console.log('🔔 Mostrando notificaciones existentes');
      if (noNotifications) noNotifications.classList.add('hidden');
      if (notificationBadge) {
        notificationBadge.classList.remove('hidden');
        console.log('🟢 Badge de notificaciones activado');
      }
    } else {
      console.log('ℹ️ No hay notificaciones para mostrar');
      if (noNotifications) noNotifications.classList.remove('hidden');
      if (notificationBadge) {
        notificationBadge.classList.add('hidden');
        console.log('🔴 Badge de notificaciones desactivado');
      }
    }
  } else {
    console.error('❌ No se encontró la lista de notificaciones');
  }
  
  // Cargar notificaciones
  console.log('🔄 Cargando notificaciones...');
  loadNotifications();
  
  console.log('✅ Configuración de notificaciones completada');
}

// Función para cargar notificaciones
async function loadNotifications() {
  try {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    // Aquí iría la lógica para cargar notificaciones desde tu API
    // Por ahora, dejamos el marcador de posición
    
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
}

// Función para quitar contadores de órdenes
function removeOrderCounters() {
  const orderCounters = document.querySelectorAll('.order-counter');
  orderCounters.forEach(counter => counter.remove());
  
  // También eliminamos los contadores quemados en el menú
  const menuBadges = document.querySelectorAll('nav a span.bg-yellow-500');
  menuBadges.forEach(badge => badge.remove());
}

// Función para configurar el menú móvil
function setupMobileMenu() {
  console.log('🔧 Configurando menú móvil...');
  
  // Elementos del menú móvil
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const closeMobileMenuButton = document.getElementById('close-mobile-menu');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  
  // Verificar que existan los elementos necesarios
  if (!mobileMenuButton || !closeMobileMenuButton || !mobileMenu || !mobileMenuOverlay) {
    console.error('❌ No se encontraron los elementos necesarios para el menú móvil');
    return;
  }
  
  // Función para abrir/cerrar el menú móvil
  const toggleMobileMenu = (forceClose = false) => {
    console.log('toggleMobileMenu llamado, forceClose:', forceClose, 'isMobileMenuOpen actual:', isMobileMenuOpen);
    isMobileMenuOpen = forceClose ? false : !isMobileMenuOpen;
    
    console.log('Nuevo estado isMobileMenuOpen:', isMobileMenuOpen);
    
    if (isMobileMenuOpen) {
      // Abrir menú
      mobileMenu.classList.add('open');
      mobileMenuOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      
      // Enfocar el primer elemento interactivo para mejor accesibilidad
      setTimeout(() => {
        const firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    } else {
      // Cerrar menú
      mobileMenu.classList.remove('open');
      mobileMenuOverlay.classList.remove('open');
      document.body.style.overflow = '';
      
      // Devolver el foco al botón del menú para mejor accesibilidad
      mobileMenuButton.focus();
    }
    
    console.log(`📱 Menú móvil ${isMobileMenuOpen ? 'abierto' : 'cerrado'}`);
  };
  
  // Cerrar menú al hacer clic en un enlace o en el botón de cierre
  const menuLinks = mobileMenu.querySelectorAll('a');
  menuLinks.forEach(link => {
    // No cerrar el menú si es el botón de logout
    if (link.id !== 'logout-btn-mobile') {
      link.addEventListener('click', () => toggleMobileMenu(true));
    }
  });
  
  // Event Listeners
  console.log('Agregando event listeners para el menú móvil...');
  
  mobileMenuButton.addEventListener('click', (e) => {
    console.log('Clic en mobileMenuButton');
    e.stopPropagation();
    toggleMobileMenu();
  });
  
  closeMobileMenuButton.addEventListener('click', (e) => {
    console.log('Clic en closeMobileMenuButton');
    e.stopPropagation();
    toggleMobileMenu(true);
  });
  
  mobileMenuOverlay.addEventListener('click', (e) => {
    console.log('Clic en mobileMenuOverlay');
    e.stopPropagation();
    toggleMobileMenu(true);
  });
  
  // Cerrar menú al presionar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobileMenuOpen) {
      toggleMobileMenu(true);
    }
  });
  
  // Inicializar menú cerrado
  mobileMenu.classList.remove('open');
  mobileMenuOverlay.classList.remove('open');
  
  console.log('✅ Menú móvil configurado correctamente');
}

// Función para verificar si los elementos del DOM están presentes
function checkRequiredElements() {
  const requiredElements = [
    { id: 'mobile-menu-button', description: 'Botón de menú móvil' },
    { id: 'notifications-button', description: 'Botón de notificaciones' },
    { id: 'notifications-dropdown', description: 'Menú desplegable de notificaciones' },
    { id: 'user-menu-button', description: 'Botón de menú de usuario' },
    { id: 'user-dropdown', description: 'Menú desplegable de usuario' },
    { id: 'logout-btn', description: 'Botón de cierre de sesión' }
  ];
  
  let allElementsFound = true;
  
  requiredElements.forEach(element => {
    const el = document.getElementById(element.id);
    if (!el) {
      console.error(`❌ No se encontró el elemento: ${element.description} (${element.id})`);
      allElementsFound = false;
    } else {
      console.log(`✅ Elemento encontrado: ${element.description} (${element.id})`);
    }
  });
  
  return allElementsFound;
}

// La función initApp ya está definida anteriormente

// Función para alternar el menú de notificaciones
function toggleNotificationsMenu() {
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  if (notificationsDropdown) {
    notificationsDropdown.classList.toggle('hidden');
  }
}

// Cerrar menús desplegables al hacer clic fuera de ellos
document.addEventListener('click', function(event) {
  const notificationsButton = document.getElementById('notifications-button');
  const notificationsDropdown = document.getElementById('notifications-dropdown');
  
  // Cerrar menú de notificaciones si se hace clic fuera
  if (notificationsButton && !notificationsButton.contains(event.target) && 
      notificationsDropdown && !notificationsDropdown.contains(event.target)) {
    notificationsDropdown.classList.add('hidden');
  }
});

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('DOM completamente cargado');
    
    // Verificar si los elementos requeridos están presentes
    if (checkRequiredElements()) {
      // Inicializar la aplicación
      await initApp();
      handleResize(); // Asegurar que el diseño se ajuste al cargar
      
      // Verificar el estado del stock después de cargar todo
      await checkStockBajo();
    }
  } catch (error) {
    console.error('Error al cargar la aplicación:', error);
  }
});

// Hacer que las funciones estén disponibles globalmente
window.setupUserMenu = setupUserMenu;
window.setupNotifications = setupNotifications;