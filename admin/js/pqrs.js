// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let storeId = null;
let currentUser = null;
let currentPqrsId = null;
let isModalOpen = false; // Nuevo: Controlar si el modal está abierto

// Elementos del DOM
const pqrsList = document.getElementById('pqrs-list');
const pqrsFilter = document.getElementById('pqrs-filter');
const pqrsStatusFilter = document.getElementById('pqrs-status-filter');
const pqrsSearch = document.getElementById('pqrs-search');
const viewPqrsModal = document.getElementById('view-pqrs-modal');
const closeViewPqrsBtn = document.getElementById('close-view-pqrs');
const responseForm = document.getElementById('response-form');
const responseText = document.getElementById('response-text');
const submitResponseBtn = document.getElementById('submit-response-btn');
const cancelResponseBtn = document.getElementById('cancel-response-btn');

// Elementos del menú y notificaciones
const notificationsButton = document.getElementById('notifications-button');
const notificationsDropdown = document.getElementById('notifications-dropdown');
const notificationsList = document.getElementById('notifications-list');
const notificationCount = document.getElementById('notification-count');
const markAllReadButton = document.getElementById('mark-all-read');
const userMenuButton = document.getElementById('user-menu-button');
const userDropdown = document.getElementById('user-dropdown');
const userNameElement = document.getElementById('user-name');
const userInitialsElement = document.getElementById('user-initials');
const userAvatarElement = document.getElementById('user-avatar');
const dropdownUserName = document.getElementById('dropdown-user-name');
const dropdownUserEmail = document.getElementById('dropdown-user-email');
const logoutBtn = document.getElementById('logout-btn');

// Estado de la aplicación
let notifications = [];
let unreadCount = 0;

// Estado de la aplicación

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verificar si Supabase se cargó correctamente
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase no se cargó correctamente');
    }
    
    // Inicializar la aplicación
    await checkSession();
    setupEventListeners();
    
    // Cargar las PQRS iniciales y los clientes
    if (storeId) {
      await Promise.all([
        loadPqrs(),
        loadClients()
      ]);
    }
  } catch (error) {
    console.error('Error en la inicialización:', error);
    showError('Error al inicializar la aplicación. Por favor, recarga la página.');
  }
});

// Configurar event listeners
function setupEventListeners() {
  // Filtros de búsqueda
  if (pqrsFilter) {
    pqrsFilter.addEventListener('change', loadPqrs);
  }
  
  if (pqrsStatusFilter) {
    pqrsStatusFilter.addEventListener('change', loadPqrs);
  }
  
  if (pqrsSearch) {
    pqrsSearch.addEventListener('input', debounce(loadPqrs, 300));
  }
  
  // Botón para abrir el modal de nueva PQRS
  const newPqrsBtn = document.getElementById('new-pqrs-btn');
  if (newPqrsBtn) {
    newPqrsBtn.addEventListener('click', openNewPqrsModal);
  }
  
  // Botón para cerrar el modal de nueva PQRS
  const closeNewPqrsModalBtn = document.getElementById('close-new-pqrs-modal');
  if (closeNewPqrsModalBtn) {
    closeNewPqrsModalBtn.addEventListener('click', closeNewPqrsModal);
  }
  
  // Botón para cancelar la creación de PQRS
  const cancelPqrsBtn = document.getElementById('cancel-pqrs-btn');
  if (cancelPqrsBtn) {
    cancelPqrsBtn.addEventListener('click', closeNewPqrsModal);
  }
  
  // Formulario de nueva PQRS
  const newPqrsForm = document.getElementById('new-pqrs-form');
  if (newPqrsForm) {
    newPqrsForm.addEventListener('submit', handleNewPqrsSubmit);
  }
  
  // Botón para cerrar el modal de visualización
  if (closeViewPqrsBtn) {
    closeViewPqrsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      viewPqrsModal.classList.add('hidden');
    });
  }
  
  // Cerrar modal al hacer clic fuera del contenido
  if (viewPqrsModal) {
    viewPqrsModal.addEventListener('click', (e) => {
      if (e.target === viewPqrsModal) {
        viewPqrsModal.classList.add('hidden');
      }
    });
  }
  
  // Enviar respuesta
  if (responseForm) {
    responseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitResponse();
    });
  }
  
  // Botón para cancelar respuesta
  if (cancelResponseBtn) {
    cancelResponseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      responseText.value = '';
    });
  }
  
  // Configurar menús
  setupNotificationsMenu();
  setupUserMenu();
  
  // Cerrar menús al hacer clic fuera de ellos
  document.addEventListener('click', (e) => {
    // Cerrar menú de notificaciones
    if (notificationsDropdown && !notificationsDropdown.contains(e.target) && !notificationsButton.contains(e.target)) {
      notificationsDropdown.classList.add('hidden');
    }
    
    // Cerrar menú de usuario
    if (userDropdown && !userDropdown.contains(e.target) && !userMenuButton.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });
}

// Función para hacer debounce de eventos
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

// Verificar sesión del usuario
async function checkSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    if (!session) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = session.user;
    await loadUserProfile();
    await loadPqrs();
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    window.location.href = 'login.html';
  }
}

// Cargar perfil del usuario
async function loadUserProfile() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', currentUser.id)
      .single();

    if (error) throw error;
    
    storeId = profile.store_id;
    console.log('Store ID cargado:', storeId);
    
    // Configurar suscripción en tiempo real para las PQRS
    if (storeId) {
      setupPqrsRealtimeSubscription(storeId);
    }
    
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    throw error;
  }
}

// Cargar PQRS de la tienda
async function loadPqrs() {
  try {
    // No hacer nada si el modal está abierto
    if (isModalOpen) {
      return;
    }
    
    showLoading();
    
    if (!storeId) {
      console.error('No se ha podido obtener el ID de la tienda');
      hideLoading();
      return;
    }
    
    // Construir consulta
    let query = supabase
      .from('pqrs')
      .select('*')
      .eq('store_id', storeId);
    
    // Aplicar filtros
    const filterValue = pqrsFilter?.value;
    const statusValue = pqrsStatusFilter?.value;
    const searchValue = pqrsSearch?.value.trim();
    
    if (filterValue === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (filterValue === 'oldest') {
      query = query.order('created_at', { ascending: true });
    }
    
    if (statusValue && statusValue !== 'all') {
      query = query.eq('status', statusValue);
    }
    
    if (searchValue) {
      query = query.or(`subject.ilike.%${searchValue}%,description.ilike.%${searchValue}%`);
    }
    
    const { data: pqrs, error } = await query;
    
    // No actualizar si el modal está abierto
    if (isModalOpen) {
      return;
    }
    
    if (error) throw error;
    
    renderPqrsList(pqrs);
  } catch (error) {
    console.error('Error al cargar las PQRS:', error);
    showError('No se pudieron cargar las PQRS. Por favor, inténtalo de nuevo.');
  } finally {
    hideLoading();
  }
}

// Mostrar estado de carga
function showLoading() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.classList.remove('hidden');
  }
  
  if (pqrsList && !document.getElementById('view-pqrs-modal').classList.contains('hidden')) {
    // Solo actualizar el contenido si el modal está visible
    return;
  }
  
  if (pqrsList) {
    pqrsList.innerHTML = `
      <div class="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    `;
  }
}

// Ocultar estado de carga
function hideLoading() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.classList.add('hidden');
  }
}

// Mostrar mensaje de error
function showError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
}

// Renderizar lista de PQRS
function renderPqrsList(pqrsListData) {
  if (!pqrsList) return;
  
  if (!pqrsListData || pqrsListData.length === 0) {
    pqrsList.innerHTML = `
      <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12">
        <div class="text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>No se encontraron PQRS</p>
        </div>
      </div>
    `;
    return;
  }
  
  pqrsList.innerHTML = pqrsListData.map(pqrs => {
    const submissionDate = new Date(pqrs.created_at).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const userName = pqrs.profiles 
      ? `${pqrs.profiles.first_name || ''} ${pqrs.profiles.last_name || ''}`.trim() || 'Usuario sin nombre'
      : 'Usuario desconocido';
    
    return `
      <div class="bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${getStatusBorderClass(pqrs.status)} transition-all duration-200 hover:shadow-lg">
        <div class="p-4">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium text-gray-900 truncate">${pqrs.subject}</h3>
              
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(pqrs.status)}">
              ${getStatusText(pqrs.status)}
            </span>
          </div>
          
          <p class="mt-2 text-sm text-gray-600 line-clamp-2">${pqrs.description}</p>
          
          <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>${submissionDate}</span>
            <button 
              onclick="viewPqrsDetails('${pqrs.id}')" 
              class="text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver detalles
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Obtener clase CSS para el estado
function getStatusClass(status) {
  switch (status) {
    case 'Recibido':
      return 'bg-blue-100 text-blue-800';
    case 'En Proceso':
      return 'bg-yellow-100 text-yellow-800';
    case 'Resuelto':
      return 'bg-green-100 text-green-800';
    case 'Cerrado':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Obtener clase CSS para el borde según el estado
function getStatusBorderClass(status) {
  switch (status) {
    case 'Recibido':
      return 'border-blue-500';
    case 'En Proceso':
      return 'border-yellow-500';
    case 'Resuelto':
      return 'border-green-500';
    case 'Cerrado':
      return 'border-gray-500';
    default:
      return 'border-gray-300';
  }
}

// Obtener texto legible para el estado
function getStatusText(status) {
  const statusMap = {
    'Recibido': 'Recibido',
    'En Proceso': 'En Proceso',
    'Resuelto': 'Resuelto',
    'Cerrado': 'Cerrado'
  };
  
  return statusMap[status] || status;
}

// Formatear fecha
function formatDate(dateString) {
  if (!dateString) return '';
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Ver detalles de una PQRS
async function viewPqrsDetails(pqrsId) {
  const modal = document.getElementById('view-pqrs-modal');
  if (!modal) {
    console.error('No se encontró el modal de detalles');
    return;
  }

  try {
    showLoading();
    isModalOpen = true; // Marcar que el modal está abierto
    currentPqrsId = pqrsId;
    
    // Obtener los detalles de la PQRS específica incluyendo el perfil del usuario
    const { data: pqrs, error } = await supabase
      .from('pqrs')
      .select(`
        *,
        profiles:profile_id (email)
      `)
      .eq('id', pqrsId)
      .single();
      
    if (error) throw error;
    
    console.log('Detalles de PQRS:', pqrs);
    
    // Obtener respuestas
    let responses = [];
    const { data: responsesData, error: responsesError } = await supabase
      .from('pqrs_responses')
      .select('*')
      .eq('pqrs_id', pqrsId)
      .order('created_at', { ascending: true });
    
    if (responsesError) {
      console.error('Error al cargar respuestas:', responsesError);
    } else {
      responses = responsesData || [];
    }
    
    // Actualizar la interfaz
    updatePqrsDetailsUI(pqrs, responses);
    
    // Mostrar el modal
    modal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error al cargar los detalles de la PQRS:', error);
    showError('Error al cargar los detalles de la PQRS. Por favor, intenta de nuevo.');
  } finally {
    hideLoading();
  }
}

// Actualizar la interfaz con los detalles de la PQRS
function updatePqrsDetailsUI(pqrs, responses = []) {
  try {
    console.log('Actualizando UI con PQRS:', pqrs);
    console.log('Respuestas:', responses);
    
    // Actualizar información básica
    const elementsToUpdate = {
      'pqrs-type': pqrs.type || 'No especificado',
      'pqrs-status': getStatusText(pqrs.status || ''),
      'pqrs-date': formatDate(pqrs.created_at || pqrs.submission_date) || 'No especificada',
      'pqrs-subject': pqrs.subject || 'Sin asunto',
      'pqrs-description': pqrs.message || pqrs.description || 'Sin descripción'
    };
    
    // Actualizar cada elemento
    Object.entries(elementsToUpdate).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
    
    // Actualizar información del usuario
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      // Intentar obtener el correo del perfil si está disponible
      const userEmail = pqrs.email || (pqrs.profiles && pqrs.profiles.email) || 'Correo no disponible';
      userInfo.innerHTML = `
        <div>
          <p class="font-medium">${userEmail}</p>
          <p class="text-sm text-gray-500">ID: ${pqrs.profile_id || 'No disponible'}</p>
        </div>
      `;
    }
    
    // Actualizar el selector de estado
    const statusSelect = document.getElementById('status-select');
    if (statusSelect) {
      statusSelect.value = pqrs.status || 'Recibido';
    }
    
    // Actualizar historial de respuestas
    const responsesContainer = document.getElementById('responses-container');
    const noResponsesElement = document.getElementById('no-responses');
    
    if (responsesContainer) {
      // Limpiar respuestas existentes
      responsesContainer.innerHTML = '';
      
      if (responses && responses.length > 0) {
        // Ocultar mensaje de no hay respuestas
        if (noResponsesElement) noResponsesElement.classList.add('hidden');
        
        // Agregar cada respuesta
        responses.forEach(response => {
          const responseElement = document.createElement('div');
          responseElement.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-4';
          responseElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="font-medium">${response.responder_name || 'Soporte'}</span>
                <span class="text-sm text-gray-500 ml-2">${formatDate(response.created_at || response.response_date) || ''}</span>
              </div>
            </div>
            <p class="text-gray-700 mt-2">${response.message || response.response_text || 'Sin mensaje'}</p>
          `;
          responsesContainer.appendChild(responseElement);
        });
      } else if (noResponsesElement) {
        // Mostrar mensaje de no hay respuestas
        noResponsesElement.classList.remove('hidden');
      }
    }
    
    // Mostrar el modal
    const modal = document.getElementById('view-pqrs-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error al actualizar la interfaz de la PQRS:', error);
    showError('Error al cargar los detalles de la PQRS. Por favor, inténtalo de nuevo.');
  }
}
// Enviar respuesta a una PQRS
async function submitResponse() {
  if (!currentPqrsId || !responseText.value.trim()) return;
  
  try {
    showLoading();
    
    // Crear la respuesta
    const { data: response, error } = await supabase
      .from('pqrs_responses')
      .insert([{
        pqrs_id: currentPqrsId,
        responder_id: currentUser.id,
        response_text: responseText.value.trim(),
        response_date: new Date().toISOString()
      }])
      .select();
    
    if (error) throw error;
    
    // Actualizar el estado de la PQRS a "En Proceso" si estaba en "Recibido"
    const { data: currentPqrs } = await supabase
      .from('pqrs')
      .select('status')
      .eq('id', currentPqrsId)
      .single();
    
    if (currentPqrs && currentPqrs.status === 'Recibido') {
      await supabase
        .from('pqrs')
        .update({ status: 'En Proceso', updated_at: new Date().toISOString() })
        .eq('id', currentPqrsId);
    } else {
      // Actualizar solo la fecha de actualización
      await supabase
        .from('pqrs')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentPqrsId);
    }
    
    // Limpiar el campo de texto
    responseText.value = '';
    
    // Recargar los detalles de la PQRS para mostrar la nueva respuesta
    await viewPqrsDetails(currentPqrsId);
    
  } catch (error) {
    console.error('Error al enviar la respuesta:', error);
    showError('No se pudo enviar la respuesta. Por favor, inténtalo de nuevo.');
  } finally {
    hideLoading();
  }
}

// Actualizar el estado de una PQRS
async function updatePqrsStatus(pqrsId, status) {
  try {
    showLoading();
    
    // Guardar el estado actual del modal
    const wasModalOpen = isModalOpen;
    
    // Actualizar el estado en la base de datos
    const { error } = await supabase
      .from('pqrs')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', pqrsId);
    
    if (error) throw error;
    
    // Actualizar la interfaz del modal si estaba abierto
    if (wasModalOpen) {
      // Actualizar el selector de estado
      const statusSelect = document.getElementById('status-select');
      if (statusSelect) {
        statusSelect.value = status;
      }
      // Actualizar el estado en la interfaz
      const statusElement = document.getElementById('pqrs-status');
      if (statusElement) {
        statusElement.textContent = getStatusText(status);
      }
    }
    
    // Recargar la lista de PQRS
    await loadPqrs();
    
  } catch (error) {
    console.error('Error al actualizar el estado de la PQRS:', error);
    showError('No se pudo actualizar el estado. Por favor, inténtalo de nuevo.');
  } finally {
    hideLoading();
  }
}

// Configurar menú de notificaciones
function setupNotificationsMenu() {
  if (!notificationsButton || !notificationsDropdown) return;
  
  // Alternar menú de notificaciones
  notificationsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsDropdown.classList.toggle('hidden');
    userDropdown.classList.add('hidden');
    
    // Marcar notificaciones como leídas al abrir el menú
    if (!notificationsDropdown.classList.contains('hidden')) {
      markNotificationsAsRead();
    }
  });
  
  // Botón para marcar todas como leídas
  if (markAllReadButton) {
    markAllReadButton.addEventListener('click', (e) => {
      e.stopPropagation();
      markAllNotificationsAsRead();
    });
  }
  
  // Cargar notificaciones
  loadNotifications();
  
  // Actualizar notificaciones cada minuto
  setInterval(loadNotifications, 60000);
}

// Verificar si una tabla existe en la base de datos
async function tableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (error) throw error;
    return data !== null;
  } catch (error) {
    console.error(`Error al verificar la tabla ${tableName}:`, error);
    return false;
  }
}

// Cargar notificaciones
async function loadNotifications() {
  if (!currentUser) return;
  
  try {
    // Verificar si la tabla de notificaciones existe
    const notificationsTableExists = await tableExists('notifications');
    
    // Datos de ejemplo para notificaciones
    notifications = [
      {
        id: 'pqrs-1',
        title: 'PQRS Pendiente',
        message: 'PQRS #1234 requiere revisión',
        type: 'warning',
        read: false,
        created_at: new Date().toISOString()
      },
      {
        id: 'pqrs-2',
        title: 'PQRS Pendiente',
        message: 'PQRS #5678 está en proceso',
        type: 'info',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'pqrs-3',
        title: 'PQRS Pendiente',
        message: 'PQRS #9012 ha sido cerrada',
        type: 'success',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    // Si la tabla de notificaciones existe, intentar cargar notificaciones reales
    if (notificationsTableExists) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && data && data.length > 0) {
          notifications = data;
        }
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      }
    }
    
    // Actualizar contador de notificaciones no leídas
    unreadCount = notifications.filter(n => !n.read).length;
    
    // Actualizar contador de notificaciones
    updateNotificationBadge();
    
    // Renderizar notificaciones
    renderNotifications();
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
}

// Configurar suscripción a cambios en PQRS
function setupPqrsRealtimeSubscription(storeId) {
  if (!storeId) {
    console.error('No se pudo configurar la suscripción: storeId no definido');
    return;
  }
  
  // Suscribirse a cambios en la tabla de PQRS
  const subscription = supabase
    .channel('pqrs_changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pqrs',
      filter: `store_id=eq.${storeId}`
    }, (payload) => {
      console.log('Nueva PQRS recibida:', payload);
      if (payload.new.status === 'Recibido') {
        // Mostrar notificación
        showNewPqrsNotification(payload.new);
        // Recargar la lista de PQRS
        loadPqrsList();
      }
    })
    .subscribe((status) => {
      console.log('Estado de la suscripción a PQRS:', status);
    });
  
  return subscription;
}

// Mostrar notificación de nueva PQRS
async function showNewPqrsNotification(pqrs) {
  // Verificar si la tabla de notificaciones existe
  const notificationsTableExists = await tableExists('notifications');
  
  // Crear notificación local
  const notification = {
    id: `pqrs-${Date.now()}`,
    title: 'Nueva PQRS recibida',
    message: `Se ha recibido una nueva PQRS: ${pqrs.subject}`,
    type: 'info',
    read: false,
    created_at: new Date().toISOString(),
    pqrs_id: pqrs.id
  };
  
  // Agregar a la lista de notificaciones en memoria
  notifications.unshift(notification);
  unreadCount++;
  
  // Actualizar la interfaz
  updateNotificationBadge();
  renderNotifications();
  
  // Mostrar notificación toast
  showToast('Nueva PQRS recibida', `Se ha recibido una nueva PQRS: ${pqrs.subject}`, 'info');
  
  // Solo intentar guardar en la base de datos si la tabla existe
  if (notificationsTableExists && currentUser) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: currentUser.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read,
          created_at: notification.created_at,
          pqrs_id: notification.pqrs_id
        }]);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error al guardar la notificación:', error);
    }
  }
}

// Función para mostrar notificaciones toast
function showToast(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white ${getToastClass(type)}`;
  toast.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <i class="${getToastIcon(type)}"></i>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium">${title}</h3>
        <p class="text-xs mt-1">${message}</p>
      </div>
      <button type="button" class="ml-4 text-white text-opacity-75 hover:text-opacity-100" onclick="this.parentNode.parentNode.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Eliminar la notificación después de 5 segundos
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

function getToastClass(type) {
  const classes = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  return classes[type] || 'bg-gray-800';
}

function getToastIcon(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || 'fas fa-bell';
}

// Renderizar notificaciones
function renderNotifications() {
  if (!notificationsList) return;
  
  if (notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="p-4 text-center text-sm text-gray-500">
        No hay notificaciones nuevas
      </div>
    `;
    return;
  }
  
  notificationsList.innerHTML = notifications.map(notification => `
    <a href="${notification.link || '#'}" class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''}">
      <div class="flex items-start">
        <div class="flex-shrink-0 mt-0.5">
          <span class="h-2 w-2 rounded-full ${notification.read ? 'bg-transparent' : 'bg-blue-500'}" aria-hidden="true"></span>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">${notification.title || 'Nueva notificación'}</p>
          <p class="text-sm text-gray-500 mt-1">${notification.message || ''}</p>
          <p class="text-xs text-gray-400 mt-1">${formatDate(notification.created_at)}</p>
        </div>
      </div>
    </a>
  `).join('');
}

// Actualizar contador de notificaciones
function updateNotificationBadge() {
  if (!notificationCount) return;
  
  if (unreadCount > 0) {
    notificationCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
    notificationCount.classList.remove('hidden');
  } else {
    notificationCount.classList.add('hidden');
  }
}

// Marcar notificaciones como leídas
async function markNotificationsAsRead() {
  if (unreadCount === 0) return;
  
  try {
    const unreadIds = notifications
      .filter(n => !n.read)
      .map(n => n.id);
    
    if (unreadIds.length === 0) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);
    
    if (error) throw error;
    
    // Actualizar estado local
    notifications = notifications.map(n => ({
      ...n,
      read: unreadIds.includes(n.id) ? true : n.read
    }));
    
    unreadCount = 0;
    updateNotificationBadge();
  } catch (error) {
    console.error('Error al marcar notificaciones como leídas:', error);
  }
}

// Marcar todas las notificaciones como leídas
async function markAllNotificationsAsRead() {
  if (!currentUser) return;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .eq('read', false);
    
    if (error) throw error;
    
    // Actualizar estado local
    notifications = notifications.map(n => ({
      ...n,
      read: true
    }));
    
    unreadCount = 0;
    updateNotificationBadge();
    renderNotifications();
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
  }
}

// Configurar menú de usuario
function setupUserMenu() {
  if (!userMenuButton || !userDropdown) return;
  
  // Alternar menú de usuario
  userMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
    notificationsDropdown.classList.add('hidden');
  });
  
  // Cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showError('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
      }
    });
  }
  
  // Cargar perfil de usuario
  loadUserProfileUI();
}

// Cargar perfil de usuario en la interfaz
async function loadUserProfileUI() {
  if (!currentUser) return;
  
  try {
    // Obtener perfil del usuario
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    // Actualizar UI con la información del perfil
    const displayName = profile.full_name || currentUser.email.split('@')[0];
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    
    // Actualizar elementos del DOM
    if (userNameElement) userNameElement.textContent = displayName;
    if (userInitialsElement) userInitialsElement.textContent = initials;
    if (dropdownUserName) dropdownUserName.textContent = displayName;
    if (dropdownUserEmail) dropdownUserEmail.textContent = currentUser.email;
    
    // Actualizar avatar con imagen si está disponible
    if (profile.avatar_url && userAvatarElement) {
      userAvatarElement.style.backgroundImage = `url('${profile.avatar_url}')`;
      userAvatarElement.style.backgroundSize = 'cover';
      userAvatarElement.style.backgroundPosition = 'center';
      if (userInitialsElement) userInitialsElement.style.display = 'none';
    }
  } catch (error) {
    console.error('Error al cargar el perfil del usuario:', error);
  }
}

// Cargar clientes para el selector
async function loadClients() {
  try {
    console.log('Iniciando carga de clientes para PQRS...');
    
    // Verificar si el usuario está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error al verificar la sesión:', sessionError);
      throw sessionError;
    }
    
    if (!session) {
      console.error('No hay una sesión activa');
      window.location.href = 'login.html';
      return;
    }
    
    // Si no tenemos storeId, intentar cargarlo
    if (!storeId) {
      console.log('storeId no está definido, intentando cargar el perfil del usuario...');
      await loadUserProfile();
      
      // Verificar nuevamente después de cargar el perfil
      if (!storeId) {
        console.error('No se pudo obtener el storeId del perfil del usuario');
        showError('No se pudo cargar la información de la tienda. Por favor, recarga la página.');
        return;
      }
    }
    
    console.log('Store ID actual:', storeId);
    
    // Primero, verificar si la tabla 'profiles' existe y tiene datos
    console.log('Verificando la tabla profiles...');
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    
    if (profilesError) {
      console.error('Error al verificar la tabla profiles:', profilesError);
      throw profilesError;
    }
    
    console.log('Tabla profiles verificada. Realizando consulta de clientes...');
    
    // Primero, intentar obtener los perfiles sin filtro de rol
    console.log('Obteniendo perfiles sin filtro de rol...');
    let query = supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('store_id', storeId)
      .order('name', { ascending: true });
    
    // Ejecutar la consulta
    const { data: profiles, error } = await query;
    
    if (error) {
      console.error('Error al obtener perfiles:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Si falla, intentar una consulta más simple para diagnóstico
      try {
        console.log('Intentando consulta de diagnóstico...');
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .limit(5);
          
        console.log('Resultado de consulta de diagnóstico:', { 
          data: testData, 
          error: testError,
          hasData: !!testData,
          dataLength: testData?.length || 0
        });
        
        // Mostrar la estructura de los perfiles obtenidos
        if (testData && testData.length > 0) {
          console.log('Estructura del primer perfil:', Object.keys(testData[0]));
        }
      } catch (testError) {
        console.error('Error en consulta de diagnóstico:', testError);
      }
      
      throw error;
    }
    
    console.log(`Se encontraron ${profiles.length} perfiles en total`);
    
    // Filtrar clientes por rol 'buyer' manualmente
    const clients = profiles.filter(profile => {
      // Manejar diferentes formatos de rol (puede ser un array, string o null/undefined)
      const role = profile.role || '';
      const isBuyer = Array.isArray(role) 
        ? role.includes('buyer')
        : String(role).toLowerCase() === 'buyer';
      
      // Usar el name si está disponible, de lo contrario usar la parte antes del @ del email
      profile.displayName = profile.name || profile.email.split('@')[0];
      
      console.log(`Perfil ${profile.email} - Nombre: ${profile.displayName} - Rol:`, role, 'Es comprador:', isBuyer);
      return isBuyer;
    });
    
    console.log(`Se encontraron ${clients.length} clientes (buyers) de ${profiles.length} perfiles`);
    
    console.log('Clientes obtenidos para PQRS:', clients);
    
    const clientSelect = document.getElementById('client-select');
    if (clientSelect) {
      // Limpiar opciones existentes excepto la primera
      while (clientSelect.options.length > 1) {
        clientSelect.remove(1);
      }
      
      // Agregar clientes al selector
      if (clients && clients.length > 0) {
        clients.forEach(client => {
          const option = document.createElement('option');
          option.value = client.id;
          // Usar displayName que ya fue calculado en el filtro
          option.textContent = `${client.displayName} (${client.email})`;
          clientSelect.appendChild(option);
        });
      } else {
        console.log('No se encontraron clientes en la tienda');
        showError('No hay clientes registrados en esta tienda');
      }
    } else {
      console.error('No se encontró el select de clientes');
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error);
    showError('No se pudieron cargar los clientes. Por favor, inténtalo de nuevo.');
  }
}

// Abrir el modal de nueva PQRS
function openNewPqrsModal() {
  const modal = document.getElementById('new-pqrs-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

// Cerrar el modal de nueva PQRS
function closeNewPqrsModal() {
  const modal = document.getElementById('new-pqrs-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// Manejar el envío del formulario de nueva PQRS
async function handleNewPqrsSubmit(e) {
  e.preventDefault();
  console.log('Iniciando envío de nueva PQRS...');
  
  try {
    // Obtener referencias a los elementos del formulario usando el formulario que disparó el evento
    const form = e.target;
    console.log('Formulario:', form);
    
    // Obtener los valores directamente del formulario
    const formData = new FormData(form);
    const clientId = formData.get('client-select');
    const type = formData.get('pqrs-type');
    const subject = formData.get('pqrs-subject')?.trim() || '';
    const description = formData.get('pqrs-description')?.trim() || '';
    
    // Obtener el ID del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
      return;
    }
    
    console.log('Valores del formulario (desde FormData):', { 
      clientId, 
      type, 
      subject, 
      description,
      storeId
    });
    
    // Validar campos requeridos
    if (!clientId) {
      showError('Por favor selecciona un cliente');
      return;
    }
    if (!type) {
      showError('Por favor selecciona un tipo de PQRS');
      return;
    }
    if (!subject) {
      showError('Por favor ingresa un asunto');
      return;
    }
    if (!description) {
      showError('Por favor ingresa una descripción');
      return;
    }
    
    // Mostrar estado de carga
    const submitBtn = document.getElementById('submit-pqrs-btn');
    const submitBtnText = document.getElementById('submit-pqrs-text');
    const submitBtnSpinner = document.getElementById('submit-pqrs-spinner');
    
    if (submitBtn && submitBtnText && submitBtnSpinner) {
      submitBtn.disabled = true;
      submitBtnText.textContent = 'Creando PQRS...';
      submitBtnSpinner.classList.remove('hidden');
    }
    
    console.log('Creando PQRS en la base de datos...', { 
      profile_id: clientId, 
      store_id: storeId,
      type,
      subject,
      description,
      status: 'Recibido'
    });
    
    // Crear la PQRS usando el ID del usuario autenticado como profile_id
    console.log('Creando PQRS con:', {
      profile_id: user.id,  // Usar el ID del usuario autenticado
      store_id: storeId,
      type,
      subject,
      description,
      status: 'Recibido'
    });
    
    const { data: pqrs, error: createError } = await supabase
      .from('pqrs')
      .insert([
        { 
          profile_id: user.id,  // Usar el ID del usuario autenticado
          store_id: storeId,
          type: type,
          subject: subject,
          description: description,
          status: 'Recibido'
        }
      ])
      .select()
      .single();
    
    console.log('Resultado de la inserción:', { pqrs, createError });
    
    if (createError) {
      console.error('Error al crear la PQRS:', createError);
      throw createError;
    }
    
    console.log('PQRS creada exitosamente:', pqrs);
    
    // Mostrar mensaje de éxito
    showSuccess('PQRS creada correctamente');
    
    // Cerrar el modal y limpiar el formulario
    closeNewPqrsModal();
    
    // Recargar la lista de PQRS
    await loadPqrs();
    
  } catch (error) {
    console.error('Error al crear la PQRS:', error);
    const errorMessage = error.message || 'Error desconocido al crear la PQRS';
    showError(`Error al crear la PQRS: ${errorMessage}`);
  } finally {
    // Restaurar el botón
    const submitBtn = document.getElementById('submit-pqrs-btn');
    const submitBtnText = document.getElementById('submit-pqrs-text');
    const submitBtnSpinner = document.getElementById('submit-pqrs-spinner');
    
    if (submitBtn && submitBtnText && submitBtnSpinner) {
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Crear PQRS';
      submitBtnSpinner.classList.add('hidden');
    }
  }
}

// Mostrar mensaje de éxito
function showSuccess(message) {
  const successElement = document.createElement('div');
  successElement.className = 'bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded';
  successElement.role = 'alert';
  successElement.textContent = message;
  
  const main = document.querySelector('main');
  if (main) {
    main.insertBefore(successElement, main.firstChild);
    
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      successElement.remove();
    }, 5000);
  }
}

// Mostrar notificación de PQRS pendientes
function showPendingPqrsNotification(count = 5) {
  const title = 'PQRS Pendientes';
  const message = `Tienes ${count} PQRS pendientes de revisión.`;
  
  // Mostrar notificación toast
  showToast(title, message, 'warning');
  
  // Actualizar contador de notificaciones
  unreadCount += count;
  updateNotificationBadge();
  
  // Agregar notificaciones de ejemplo
  for (let i = 0; i < count; i++) {
    const notification = {
      id: `pqrs-pending-${Date.now()}-${i}`,
      title: 'PQRS Pendiente',
      message: `PQRS #${Math.floor(1000 + Math.random() * 9000)} requiere revisión`,
      type: 'warning',
      read: false,
      created_at: new Date().toISOString()
    };
    notifications.unshift(notification);
  }
  
  // Actualizar lista de notificaciones
  renderNotifications();
}

// Cerrar sesión
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error);
    } else {
      window.location.href = 'login.html';
    }
  });
}

// Función para cerrar el modal
function closePqrsModal() {
  const modal = document.getElementById('view-pqrs-modal');
  if (modal) {
    modal.classList.add('hidden');
    isModalOpen = false; // Actualizar estado
    // Limpiar el ID de la PQRS actual
    currentPqrsId = null;
    // Forzar recarga del listado
    loadPqrs();
  }
  // Asegurarse de que el indicador de carga esté oculto
  hideLoading();
}

// Configurar manejadores de cierre del modal
document.addEventListener('DOMContentLoaded', () => {
  // Botón de cierre en la esquina superior derecha
  const closeViewPqrsBtn = document.getElementById('close-view-pqrs');
  if (closeViewPqrsBtn) {
    closeViewPqrsBtn.addEventListener('click', closePqrsModal);
  }
  
  // Botón de cierre en el pie del modal
  const closeModalBtn = document.getElementById('close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closePqrsModal);
  }
  
  // Cerrar al hacer clic fuera del contenido del modal
  const modal = document.getElementById('view-pqrs-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePqrsModal();
      }
    });
  }
  
  // Manejar cambio de estado
  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', async (e) => {
      if (currentPqrsId) {
        await updatePqrsStatus(currentPqrsId, e.target.value);
      }
    });
  }
});

// Hacer las funciones disponibles globalmente
window.viewPqrsDetails = viewPqrsDetails;
window.updatePqrsStatus = updatePqrsStatus;