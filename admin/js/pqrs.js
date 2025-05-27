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
    
    // Cargar las PQRS iniciales
    if (storeId) {
      await loadPqrs();
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
              <p class="text-sm text-gray-500 mt-1">Por: ${userName}</p>
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

// Cerrar sesión
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
  logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showError('No se pudo cerrar la sesión. Por favor, inténtalo de nuevo.');
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