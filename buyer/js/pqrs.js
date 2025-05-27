// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const pqrsList = document.getElementById('pqrs-list');
const newPqrsBtn = document.getElementById('new-pqrs-btn');
const newPqrsModal = document.getElementById('new-pqrs-modal');
const viewPqrsModal = document.getElementById('view-pqrs-modal');
const closeViewPqrsBtn = document.getElementById('close-view-pqrs');
const pqrsForm = document.getElementById('pqrs-form');
const submitPqrsBtn = document.getElementById('submit-pqrs-btn');
const cancelPqrsBtn = document.getElementById('cancel-pqrs-btn');

// Estado de la aplicación
let currentUser = null;
let currentPqrsId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
  console.log('Configurando event listeners...');
  
  // Botón para abrir el modal de nueva PQRS
  if (newPqrsBtn) {
    console.log('Configurando botón de nueva PQRS...');
    newPqrsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Abriendo modal de nueva PQRS...');
      newPqrsModal.classList.remove('hidden');
      // Enfocar el primer campo del formulario
      document.getElementById('pqrs-type')?.focus();
    });
  } else {
    console.error('No se encontró el botón de nueva PQRS');
  }

  // Botón para cerrar el modal de visualización
  if (closeViewPqrsBtn) {
    closeViewPqrsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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

  // Botones para cancelar el formulario de nueva PQRS
  const cancelButtons = [
    document.getElementById('cancel-pqrs-btn'),
    document.getElementById('cancel-pqrs-btn-2')
  ];
  
  cancelButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        newPqrsModal.classList.add('hidden');
        if (pqrsForm) pqrsForm.reset();
      });
    }
  });

  // Enviar formulario de nueva PQRS
  if (pqrsForm) {
    console.log('Configurando formulario de PQRS...');
    pqrsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Enviando formulario de PQRS...');
      await createNewPqrs();
    });
  } else {
    console.error('No se encontró el formulario de PQRS');
  }

  // Botón para crear PQRS relacionada
  const newRelatedPqrsBtn = document.getElementById('new-related-pqrs');
  if (newRelatedPqrsBtn) {
    newRelatedPqrsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      viewPqrsModal.classList.add('hidden');
      newPqrsModal.classList.remove('hidden');
      
      // Prellenar el asunto con referencia a la PQRS actual
      if (currentPqrsId) {
        const subjectInput = document.getElementById('pqrs-subject');
        if (subjectInput) {
          subjectInput.value = `[Ref: PQRS-${currentPqrsId.substring(0, 8)}] `;
          subjectInput.focus();
        }
      }
    });
  }
}

// Verificar sesión del usuario
async function checkSession() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    loadUserProfile();
    loadPqrs();
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
      .select('first_name, last_name, avatar_url')
      .eq('id', currentUser.id)
      .single();

    if (error) throw error;
    
    // Combinar nombre y apellido
    const fullProfile = {
      ...profile,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario'
    };
    
    // Actualizar avatar e información del usuario
    updateUserUI(fullProfile);
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
  }
}

// Actualizar la interfaz de usuario con los datos del perfil
function updateUserUI(profile) {
  const userInitials = profile.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';
  
  // Actualizar avatar e iniciales en la barra de navegación
  document.querySelectorAll('#user-initials, #mobile-user-initials').forEach(el => {
    el.textContent = userInitials;
  });
  
  if (profile.avatar_url) {
    document.querySelectorAll('#user-avatar-img, #mobile-user-avatar-img').forEach(img => {
      img.src = profile.avatar_url;
      img.classList.remove('hidden');
      img.nextElementSibling.classList.add('hidden');
    });
  }
  
  // Actualizar nombre y correo electrónico en el menú móvil
  if (profile.full_name) {
    document.querySelectorAll('#mobile-user-name').forEach(el => {
      el.textContent = profile.full_name;
    });
  }
  
  if (currentUser.email) {
    document.querySelectorAll('#mobile-user-email').forEach(el => {
      el.textContent = currentUser.email;
    });
  }
}

// Cargar PQRS del usuario
async function loadPqrs() {
  try {
    showLoading();

    const { data: pqrs, error } = await supabase
      .from('pqrs')
      .select('*')
      .eq('profile_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderPqrsList(pqrs);
  } catch (error) {
    console.error('Error al cargar PQRS:', error);
    showError('Error al cargar las PQRS. Por favor, inténtalo de nuevo más tarde.');
  }
}

// Mostrar estado de carga
function showLoading() {
  if (pqrsList) {
    pqrsList.innerHTML = `
      <div class="text-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-2 text-gray-600">Cargando PQRS...</p>
      </div>`;
  }
}

// Mostrar mensaje de error
function showError(message) {
  if (pqrsList) {
    pqrsList.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-circle text-red-400"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">${message}</p>
          </div>
        </div>
      </div>`;
  }
}

// Renderizar lista de PQRS
function renderPqrsList(pqrsListData) {
  if (!pqrsList || !pqrsListData) return;
  
  if (pqrsListData.length === 0) {
    pqrsList.innerHTML = `
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="p-8 text-center">
          <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900">No tienes PQRS registradas</h3>
          <p class="mt-1 text-sm text-gray-500">Crea tu primera PQRS haciendo clic en el botón "Nueva PQRS".</p>
        </div>
      </div>`;
    return;
  }

  const pqrsItems = pqrsListData.map(pqrs => {
    const date = new Date(pqrs.created_at);
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusClass = getStatusClass(pqrs.status);
    
    return `
      <div class="pqrs-card cursor-pointer bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow" data-id="${pqrs.id}">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-medium text-gray-900">${pqrs.subject || 'Sin asunto'}</h3>
            <p class="mt-1 text-sm text-gray-500">${formattedDate}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
            ${getStatusText(pqrs.status || 'Recibido')}
          </span>
        </div>
        <p class="mt-2 text-sm text-gray-600 line-clamp-2">${pqrs.description || 'Sin descripción'}</p>
        <div class="mt-3 flex justify-end">
          <button class="text-sm font-medium text-blue-600 hover:text-blue-500">
            Ver detalles <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>`;
  }).join('');

  pqrsList.innerHTML = pqrsItems;
  
  // Agregar event listeners a las tarjetas de PQRS
  document.querySelectorAll('.pqrs-card').forEach(card => {
    // Manejador para la tarjeta completa
    card.addEventListener('click', (e) => {
      // Si el clic fue en un botón o enlace, no hacer nada
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      viewPqrsDetails(card.dataset.id);
    });
    
    // Manejador específico para el botón "Ver detalles"
    const viewDetailsBtn = card.querySelector('button');
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el evento se propague a la tarjeta
        viewPqrsDetails(card.dataset.id);
      });
    }
  });
}

// Obtener clase CSS para el estado
function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'en proceso':
      return 'bg-blue-100 text-blue-800';
    case 'resuelto':
      return 'bg-green-100 text-green-800';
    case 'cerrado':
      return 'bg-gray-100 text-gray-800';
    case 'recibido':
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

// Obtener texto legible para el estado
function getStatusText(status) {
  const statusMap = {
    'recibido': 'Recibido',
    'en proceso': 'En proceso',
    'resuelto': 'Resuelto',
    'cerrado': 'Cerrado'
  };
  return statusMap[status.toLowerCase()] || status;
}

// Ver detalles de una PQRS
async function viewPqrsDetails(pqrsId) {
  const modal = document.getElementById('view-pqrs-modal');
  const responsesList = document.getElementById('responses-list');
  const noResponses = document.getElementById('no-responses');
  
  if (!modal || !responsesList || !noResponses) {
    console.error('No se encontraron elementos del modal');
    return;
  }
  
  try {
    console.log('Cargando detalles de la PQRS:', pqrsId);
    
    // Obtener el usuario actual de Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No se pudo obtener el usuario actual:', userError);
      showError('No se pudo verificar la sesión. Por favor, inicia sesión nuevamente.');
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    currentPqrsId = pqrsId;
    
    // Mostrar estado de carga
    const loadingHTML = `
      <div class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-blue-500 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">Cargando detalles de la PQRS...</p>
      </div>`;
    
    // Limpiar el contenido anterior
    document.getElementById('view-pqrs-title').textContent = 'Cargando...';
    document.getElementById('view-pqrs-date').textContent = '';
    document.getElementById('view-pqrs-subject').textContent = '';
    document.getElementById('view-pqrs-description').textContent = '';
    responsesList.innerHTML = loadingHTML;
    noResponses.classList.add('hidden');
    
    // Mostrar el modal primero para que el usuario vea que está cargando
    modal.classList.remove('hidden');
    
    // Cargar datos de la PQRS y verificar permisos en una sola consulta
    const { data: pqrs, error: pqrsError } = await supabase
      .from('pqrs')
      .select('*')
      .eq('id', pqrsId)
      .eq('profile_id', user.id)  // Asegurarse de que el usuario sea el propietario
      .single();

    if (pqrsError) {
      console.error('Error al cargar la PQRS:', pqrsError);
      throw new Error('No tienes permiso para ver esta PQRS o no existe');
    }
    
    console.log('Datos de la PQRS cargados:', pqrs);
    
    // Cargar respuestas
    let responses = [];
    
    try {
      // Cargar las respuestas directamente
      const { data: responsesData, error: responsesError } = await supabase
        .from('pqrs_responses')
        .select('*')
        .eq('pqrs_id', pqrsId)
        .order('created_at', { ascending: true });
        
      if (responsesError) throw responsesError;
      
      responses = responsesData || [];
      console.log('Respuestas cargadas:', responses);
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
      // Continuamos mostrando la PQRS aunque falle la carga de respuestas
      showError('No se pudieron cargar las respuestas. Por favor, inténtalo de nuevo más tarde.');
    }
    
    // Actualizar el modal con los datos
    updatePqrsModal(pqrs, responses);
    
  } catch (error) {
    console.error('Error al cargar los detalles de la PQRS:', error);
    
    // Mostrar mensaje de error en el modal
    const errorHTML = `
      <div class="text-center py-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-3">
          <i class="fas fa-exclamation-triangle text-xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-1">Error al cargar la PQRS</h3>
        <p class="text-sm text-gray-600 mb-4">No se pudieron cargar los detalles de la PQRS. Por favor, inténtalo de nuevo más tarde.</p>
        <button id="retry-loading-pqrs" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <i class="fas fa-sync-alt mr-2"></i> Reintentar
        </button>
      </div>`;
      
    const responsesListElement = document.getElementById('responses-list');
    if (responsesListElement) {
      responsesListElement.innerHTML = errorHTML;
      
      // Configurar el botón de reintento
      const retryButton = document.getElementById('retry-loading-pqrs');
      if (retryButton) {
        retryButton.addEventListener('click', () => viewPqrsDetails(pqrsId));
      }
    }
    
    // Asegurarse de que el título del modal sea visible
    const titleElement = document.getElementById('view-pqrs-title');
    if (titleElement) {
      titleElement.textContent = 'Error';
    }
    
    // Mostrar el modal si no está visible
    if (modal) {
      modal.classList.remove('hidden');
    }
    
    // Mostrar mensaje de error genérico
    showError('No se pudieron cargar los detalles de la PQRS. Por favor, inténtalo de nuevo más tarde.');
  }
}

// Actualizar el modal con los detalles de la PQRS
function updatePqrsModal(pqrs, responses = []) {
  try {
    // Actualizar información básica
    const titleElement = document.getElementById('view-pqrs-title');
    if (titleElement) {
      titleElement.textContent = `PQRS #${pqrs.id.substring(0, 8)}`;
    }
    
    // Actualizar tipo
    const typeElement = document.getElementById('view-pqrs-type');
    if (typeElement) {
      typeElement.textContent = pqrs.type || 'Sin tipo';
      typeElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeClass(pqrs.type)}`;
    }
    
    // Actualizar estado
    const statusElement = document.getElementById('view-pqrs-status');
    if (statusElement) {
      statusElement.textContent = getStatusText(pqrs.status || 'Recibido');
      statusElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(pqrs.status || 'Recibido')}`;
    }
    
    // Actualizar fecha
    const dateElement = document.getElementById('view-pqrs-date');
    if (dateElement) {
      const date = pqrs.created_at ? new Date(pqrs.created_at) : new Date();
      dateElement.textContent = date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Actualizar asunto y descripción
    const subjectElement = document.getElementById('view-pqrs-subject');
    if (subjectElement) {
      subjectElement.textContent = pqrs.subject || 'Sin asunto';
    }
    
    const descriptionElement = document.getElementById('view-pqrs-description');
    if (descriptionElement) {
      descriptionElement.textContent = pqrs.description || 'Sin descripción';
    }
    
    // Actualizar respuestas
    const responsesList = document.getElementById('responses-list');
    const noResponses = document.getElementById('no-responses');
    
    if (!responsesList || !noResponses) {
      console.error('No se encontraron los elementos de respuestas');
      return;
    }
    
    // Limpiar la lista de respuestas
    responsesList.innerHTML = '';
    
    if (!responses || responses.length === 0) {
      noResponses.classList.remove('hidden');
      return;
    }
    
    noResponses.classList.add('hidden');
    
    // Crear HTML para cada respuesta
    responses.forEach(response => {
      try {
        const responseDate = new Date(response.response_date || response.created_at || new Date());
        const formattedDate = responseDate.toLocaleString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Obtener el nombre del respondente
        const responderProfile = response.profiles || {};
        const responderName = (responderProfile.first_name && responderProfile.last_name) 
          ? `${responderProfile.first_name} ${responderProfile.last_name}`
          : (response.responder_id === currentUser?.id ? 'Tú' : 'Administrador');
          
        const isAdminResponse = response.responder_id !== currentUser?.id;
        
        // Crear elemento de respuesta
        const responseElement = document.createElement('div');
        responseElement.className = 'bg-gray-50 p-4 rounded-lg mb-4';
        responseElement.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex items-start">
              <div class="h-10 w-10 rounded-full ${isAdminResponse ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-700'} flex items-center justify-center font-medium text-sm flex-shrink-0">
                ${responderName.charAt(0).toUpperCase()}
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">${responderName}</p>
                <p class="text-xs text-gray-500">${formattedDate}</p>
              </div>
            </div>
            ${isAdminResponse ? `
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <i class="fas fa-shield-alt mr-1"></i> Administrador
              </span>
            ` : ''}
          </div>
          <div class="mt-3 text-sm text-gray-700 whitespace-pre-line bg-white p-3 rounded border border-gray-200">
            ${response.response_text || 'Sin contenido'}
          </div>
        `;
        
        responsesList.appendChild(responseElement);
        
      } catch (error) {
        console.error('Error al renderizar respuesta:', error, response);
      }
    });
    
  } catch (error) {
    console.error('Error al actualizar el modal de PQRS:', error);
    showError('Ocurrió un error al cargar los detalles de la PQRS.');
  }
}

// Obtener clase CSS para el tipo de PQRS
function getTypeClass(type) {
  if (!type) return 'bg-gray-100 text-gray-800';
  
  const typeMap = {
    'petición': 'bg-blue-100 text-blue-800',
    'queja': 'bg-yellow-100 text-yellow-800',
    'reclamo': 'bg-red-100 text-red-800',
    'sugerencia': 'bg-green-100 text-green-800'
  };
  
  return typeMap[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

// Crear una nueva PQRS
async function createNewPqrs() {
  // Verificar que el usuario esté autenticado
  if (!currentUser) {
    showError('Debes iniciar sesión para crear una PQRS');
    window.location.href = 'login.html';
    return;
  }

  const type = document.getElementById('pqrs-type').value;
  const subject = document.getElementById('pqrs-subject').value.trim();
  const description = document.getElementById('pqrs-description').value.trim();

  if (!type || !subject || !description) {
    showError('Por favor completa todos los campos obligatorios');
    return;
  }

  try {
    // Mostrar estado de carga en el botón de enviar
    const submitBtn = document.getElementById('submit-pqrs-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';
    
    // Primero obtenemos el perfil del usuario para obtener el store_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.store_id) {
      throw new Error('No se pudo determinar la tienda del usuario');
    }
    
    // Mapear los valores del formulario a los valores esperados por la base de datos
    const typeMapping = {
      'peticion': 'Petición',
      'queja': 'Queja',
      'reclamo': 'Reclamo',
      'sugerencia': 'Sugerencia'
    };
    
    const dbType = typeMapping[type] || type;
    
    // Ahora creamos la PQRS con el store_id
    const { data, error } = await supabase
      .from('pqrs')
      .insert([
        { 
          profile_id: currentUser.id,  // Cambiado de user_id a profile_id para coincidir con el esquema
          store_id: profile.store_id,
          type: dbType,  // Usar el tipo mapeado
          subject,
          description,
          status: 'Recibido',  // Usando el valor por defecto del esquema
          submission_date: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    // Cerrar el modal y limpiar el formulario
    newPqrsModal.classList.add('hidden');
    pqrsForm.reset();
    
    // Restaurar el botón de enviar
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    
    // Recargar la lista de PQRS
    await loadPqrs();
    
    // Mostrar mensaje de éxito
    const successAlert = document.createElement('div');
    successAlert.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4';
    successAlert.role = 'alert';
    successAlert.innerHTML = `
      <span class="block sm:inline">✅ Tu PQRS ha sido enviada correctamente. Pronto nos pondremos en contacto contigo.</span>
    `;
    
    const container = document.querySelector('main');
    const firstElement = container.firstChild;
    container.insertBefore(successAlert, firstElement);
    
    // Desplazarse suavemente al inicio
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
      successAlert.remove();
    }, 5000);
    
  } catch (error) {
    console.error('Error al crear PQRS:', error);
    showError('Error al enviar la PQRS. Por favor, verifica tu conexión e inténtalo de nuevo.');
    
    // Restaurar el botón de enviar en caso de error
    const submitBtn = document.getElementById('submit-pqrs-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Enviar PQRS';
    }
  }
}

// Manejar cierre de sesión
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
      alert('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
    }
  });
}

// Manejar cierre de sesión en móvil
const mobileLogoutButton = document.getElementById('mobile-logout-button');
if (mobileLogoutButton) {
  mobileLogoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, inténtalo de nuevo.');
    }
  });
}
