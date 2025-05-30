// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Elementos del DOM
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si estamos en la página de perfil
  if (!document.getElementById('profile-form')) return;

  // Inicializar eventos
  initEvents();
  
  // Cargar datos del perfil
  loadProfile();
});

// Inicializar eventos
function initEvents() {
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const avatarUpload = document.getElementById('avatar-upload');
  const solicitarCreditoBtn = document.getElementById('solicitar-credito-btn');
  
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }
  
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }
  
  if (avatarUpload) {
    avatarUpload.addEventListener('change', handleImageUpload);
  }
  
  if (solicitarCreditoBtn) {
    solicitarCreditoBtn.addEventListener('click', handleSolicitarCredito);
  }
}

// Cargar perfil del usuario
async function loadProfile() {
  try {
    showLoading(true);
    
    // Obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No hay una sesión activa');
    
    // Obtener el perfil del usuario desde la tabla profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (profileError) {
      // Si el perfil no existe, crearlo con los datos por defecto
      if (profileError.code === 'PGRST116') {
        const newProfile = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.email.split('@')[0],
          role: 'buyer',
          credit_assigned: '0.00',
          credit_used: '0.00',
          status: 'Activo',
          join_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) throw createError;
        updateUI(createdProfile);
        return;
      }
      throw profileError;
    }
    
    // Actualizar la UI con los datos del perfil
    updateUI({
      ...profile,
      email: session.user.email
    });
    
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    showError('Error al cargar el perfil: ' + (error.message || 'Error desconocido'));
  } finally {
    showLoading(false);
  }
}

// Actualizar la interfaz con los datos del perfil
function updateUI(profileData) {
  if (!profileData) return;

  // Extraer datos del perfil con valores por defecto
  const { 
    name = '', 
    email = '',
    phone = '',
    address = '',
    city = '',
    state = '',
    postal_code = '',
    document_number = '',
    avatar_url = '',
    credit_assigned = '0.00',
    credit_used = '0.00',
    status = 'Activo',
    role = 'Comprador',
    join_date = new Date().toISOString()
  } = profileData;
  
  // 1. Actualizar la sección de información del perfil (lado izquierdo)
  const profileName = document.getElementById('profile-name');
  const profileEmail = document.getElementById('profile-email');
  const profileInitials = document.getElementById('profile-initials');
  const profileAvatar = document.getElementById('profile-avatar');
  
  // Mostrar nombre o email
  const displayName = name || email.split('@')[0] || 'Usuario';
  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = email || '';
  
  // Actualizar avatar
  updateAvatarUI(profileAvatar, profileInitials, displayName, avatar_url);
  
  // 2. Actualizar el formulario de edición
  // Actualizar campos del formulario
  const formFields = {
    'name': name,
    'email': email,
    'phone': phone,
    'address': address,
    'city': city,
    'state': state,
    'postal-code': postal_code,
    'document': document_number
  };
  
  // Actualizar información de contacto en la interfaz
  const phoneElement = document.getElementById('profile-phone');
  if (phoneElement) {
    phoneElement.textContent = phone || 'Sin teléfono registrado';
  }
  
  // Actualizar dirección en la interfaz si existe el elemento
  const addressElement = document.getElementById('profile-address');
  if (addressElement) {
    const addressParts = [];
    if (address) addressParts.push(address);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    if (postal_code) addressParts.push(`Código Postal: ${postal_code}`);
    
    addressElement.textContent = addressParts.length > 0 
      ? addressParts.join(', ')
      : 'Sin dirección registrada';
  }
  
  // Aplicar valores a los campos del formulario
  Object.entries(formFields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value || '';
  });
  
  // 3. Actualizar información adicional en la interfaz
  // Mostrar crédito asignado y utilizado
  const creditAssignedElement = document.getElementById('credit-assigned');
  const creditUsedElement = document.getElementById('credit-used');
  const statusElement = document.getElementById('profile-status');
  
  if (creditAssignedElement) {
    creditAssignedElement.textContent = `$${parseFloat(credit_assigned || 0).toLocaleString('es-CO')}`;
  }
  
  if (creditUsedElement) {
    creditUsedElement.textContent = `$${parseFloat(credit_used || 0).toLocaleString('es-CO')}`;
  }
  
  if (statusElement) {
    statusElement.textContent = status || 'Activo';
    // Agregar clase de color según el estado
    statusElement.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
    if (status === 'Activo') {
      statusElement.classList.add('bg-green-100', 'text-green-800');
    } else if (status === 'Inactivo') {
      statusElement.classList.add('bg-red-100', 'text-red-800');
    } else if (status === 'Pendiente') {
      statusElement.classList.add('bg-yellow-100', 'text-yellow-800');
    } else {
      statusElement.classList.add('bg-gray-100', 'text-gray-800');
    }
  }
  
  // Actualizar rol si existe el elemento
  const roleElement = document.getElementById('profile-role');
  if (roleElement) {
    roleElement.textContent = role || 'Usuario';
  }
  
  // Actualizar fecha de ingreso si existe el elemento
  const joinDateElement = document.getElementById('join-date');
  if (joinDateElement && join_date) {
    const joinDate = new Date(join_date);
    joinDateElement.textContent = joinDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Actualizar la barra de navegación
  updateNavbarUserInfo(displayName, email, avatar_url);
}

// Actualizar la información del usuario en la barra de navegación
function updateNavbarUserInfo(name, email, avatarUrl) {
  // Actualizar iniciales
  const userInitials = document.getElementById('user-initials');
  const userAvatar = document.getElementById('user-avatar');
  
  if (name && userInitials) {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    
    userInitials.textContent = initials;
  }
  
  // Actualizar avatar si existe
  if (avatarUrl && userAvatar) {
    userAvatar.src = avatarUrl;
    userAvatar.classList.remove('hidden');
    if (userInitials) userInitials.classList.add('hidden');
  } else if (userAvatar) {
    userAvatar.classList.add('hidden');
    if (userInitials) userInitials.classList.remove('hidden');
  }
  
  // Actualizar correo en el menú desplegable si existe
  const userEmailElement = document.querySelector('#user-menu [data-user-email]');
  if (userEmailElement && email) {
    userEmailElement.textContent = email;
  }
}

// Actualizar la visualización del avatar
function updateAvatarUI(avatarElement, initialsElement, name, avatarUrl) {
  if (!avatarElement || !initialsElement) return;
  
  // Actualizar iniciales
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'US';
  
  initialsElement.textContent = initials;
  
  // Actualizar avatar si existe
  if (avatarUrl) {
    avatarElement.src = avatarUrl;
    avatarElement.classList.remove('hidden');
    initialsElement.classList.add('hidden');
  } else {
    avatarElement.classList.add('hidden');
    initialsElement.classList.remove('hidden');
  }
}

// Manejar envío del formulario de perfil
async function handleProfileSubmit(e) {
  e.preventDefault();
  
  // Obtener los valores del formulario
  const formData = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone')?.value.trim() || '',
    address: document.getElementById('address')?.value.trim() || '',
    document: document.getElementById('document')?.value.trim() || '',
    city: document.getElementById('city')?.value.trim() || '',
    state: document.getElementById('state')?.value || '',
    postalCode: document.getElementById('postal-code')?.value.trim() || ''
  };
  
  // Validar campos requeridos
  if (!formData.name) {
    showError('El nombre es obligatorio');
    return;
  }
  
  if (!formData.email) {
    showError('El correo electrónico es obligatorio');
    return;
  }
  
  // Crear objeto con los datos a actualizar
  const updates = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    document: formData.document,
    city: formData.city,
    state: formData.state,
    postal_code: formData.postalCode,
    updated_at: new Date().toISOString()
  };
  
  try {
    showLoading(true);
    await updateUserProfile(updates);
    showNotification('Perfil actualizado correctamente', 'success');
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    showError('Error al actualizar el perfil: ' + (error.message || 'Error desconocido'));
  } finally {
    showLoading(false);
  }
}

// Manejar cambio de contraseña
async function handlePasswordChange(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (newPassword !== confirmPassword) {
    showNotification('Las contraseñas no coinciden', 'error');
    return;
  }
  
  try {
    showLoading(true);
    await updateUserPassword(newPassword);
    e.target.reset();
    showNotification('Contraseña actualizada correctamente', 'success');
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    showNotification('Error al actualizar la contraseña', 'error');
  } finally {
    showLoading(false);
  }
}

// Manejar carga de imagen
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Verificar el tipo de archivo
  if (!file.type.match('image.*')) {
    showNotification('Por favor, selecciona un archivo de imagen válido', 'error');
    return;
  }

  // Verificar el tamaño del archivo (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    showNotification('La imagen es demasiado grande. El tamaño máximo permitido es 5MB', 'error');
    return;
  }
  
  try {
    showLoading(true);
    
    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = function(event) {
      const profileAvatar = document.getElementById('profile-avatar');
      const profileInitials = document.getElementById('profile-initials');
      
      if (profileAvatar && profileInitials) {
        profileAvatar.src = event.target.result;
        profileAvatar.classList.remove('hidden');
        profileInitials.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
    
    // Subir la imagen
    const imageUrl = await uploadProfileImage(file);
    
    // Actualizar la URL de la imagen en el perfil
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await updateUserProfile({ avatar_url: imageUrl });
    }
    
    showNotification('Imagen de perfil actualizada correctamente', 'success');
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    showNotification('Error al subir la imagen. Por favor, inténtalo de nuevo.', 'error');
  } finally {
    showLoading(false);
  }
}

// Actualizar perfil del usuario
async function updateUserProfile(updates) {
  try {
    showLoading(true);
    
    // Obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No hay una sesión activa');
    
    // Preparar los datos para actualizar
    // Solo incluir campos que existen en la base de datos
    const profileUpdates = {
      name: updates.name || null,
      phone: updates.phone || null,
      document_number: updates.document || null,
      // Solo incluir dirección si el campo existe en tu base de datos
      ...(updates.address && { address: updates.address }),
      ...(updates.city && { city: updates.city }),
      ...(updates.state && { state: updates.state }),
      ...(updates.postalCode && { postal_code: updates.postalCode }),
      updated_at: new Date().toISOString()
    };
    
    // Eliminar campos que son null o undefined
    Object.keys(profileUpdates).forEach(key => {
      if (profileUpdates[key] === null || profileUpdates[key] === undefined) {
        delete profileUpdates[key];
      }
    });
    
    // Actualizar el perfil en la base de datos
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', session.user.id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Actualizar el correo electrónico si es necesario
    if (updates.email && updates.email !== session.user.email) {
      const { error: updateEmailError } = await supabase.auth.updateUser({
        email: updates.email
      });
      
      if (updateEmailError) throw updateEmailError;
      
      // Actualizar también en la tabla profiles
      const { error: updateProfileEmailError } = await supabase
        .from('profiles')
        .update({ email: updates.email })
        .eq('id', session.user.id);
        
      if (updateProfileEmailError) throw updateProfileEmailError;
      
      data.email = updates.email;
    } else {
      data.email = session.user.email;
    }
    
    // Mostrar notificación de éxito
    showNotification('Perfil actualizado correctamente', 'success');
    return data;
    
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    showError('Error al actualizar el perfil: ' + (error.message || 'Error desconocido'));
    throw error;
  } finally {
    showLoading(false);
  }
}

// Actualizar contraseña del usuario
async function updateUserPassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    return data;
    
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    
    // Manejar errores específicos
    if (error.message.includes('password')) {
      throw new Error('La contraseña no cumple con los requisitos mínimos');
    } else if (error.message.includes('Auth session missing')) {
      throw new Error('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
    } else {
      throw new Error('Error al actualizar la contraseña');
    }
  }
}

// Subir imagen de perfil
async function uploadProfileImage(file) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) throw new Error('No se pudo obtener la información del usuario');
    
    // Validar el tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('El archivo debe ser una imagen (JPEG, PNG, GIF o WebP)');
    }
    
    // Validar el tamaño del archivo (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error('La imagen es demasiado grande. El tamaño máximo permitido es 2MB.');
    }
    
    // Nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Subir la imagen
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      // Si el error es porque el archivo ya existe, intentar con un nombre diferente
      if (uploadError.message.includes('already exists')) {
        return uploadProfileImage(file); // Recursión con el mismo archivo para generar un nuevo nombre
      }
      throw uploadError;
    }
    
    // Obtener la URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);
    
    // Actualizar el perfil con la nueva URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    
    return publicUrl;
    
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    throw new Error(error.message || 'Error al subir la imagen de perfil');
  }
}

// Manejar solicitud de crédito
async function handleSolicitarCredito() {
  try {
    // Obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      showError('Debes iniciar sesión para solicitar un crédito');
      return;
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) throw profileError;

    // Mostrar modal para ingresar el monto solicitado
    const montoSolicitado = prompt('Ingrese el monto de crédito que desea solicitar:');
    
    if (!montoSolicitado || isNaN(montoSolicitado) || parseFloat(montoSolicitado) <= 0) {
      showError('Por favor ingrese un monto válido');
      return;
    }

    // Crear la solicitud de crédito
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitudes_credito')
      .insert([{
        user_id: session.user.id,
        email: session.user.email,
        nombre_completo: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario sin nombre',
        monto_solicitado: parseFloat(montoSolicitado),
        estado: 'pendiente',
        store_id: profile.store_id
      }])
      .select();

    if (solicitudError) throw solicitudError;

    // Notificar a los administradores
    await notificarAdminSolicitudCredito(session.user.email, montoSolicitado);
    
    showNotification('Solicitud de crédito enviada correctamente. Un administrador la revisará pronto.', 'success');
  } catch (error) {
    console.error('Error al solicitar crédito:', error);
    showError('Error al procesar la solicitud de crédito: ' + error.message);
  }
}

// Notificar a los administradores sobre la nueva solicitud
async function notificarAdminSolicitudCredito(emailUsuario, monto) {
  try {
    // Insertar notificación para administradores
    const { error } = await supabase
      .from('notificaciones')
      .insert([{
        tipo: 'solicitud_credito',
        titulo: 'Nueva solicitud de crédito',
        mensaje: `El usuario ${emailUsuario} ha solicitado un crédito por $${monto}`,
        leido: false,
        user_role: 'admin', // Solo para administradores
        metadata: {
          tipo: 'solicitud_credito',
          email_usuario: emailUsuario,
          monto_solicitado: monto
        }
      }]);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error al notificar a los administradores:', error);
    return false;
  }
}

// Funciones de utilidad
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md text-white ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Eliminar la notificación después de 3 segundos
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showLoading(show) {
  if (!loadingElement) return;
  
  if (show) {
    loadingElement.classList.remove('hidden');
  } else {
    loadingElement.classList.add('hidden');
  }
}

function showError(message) {
  console.error(message);
  
  if (errorElement && errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Ocultar el mensaje de error después de 5 segundos
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
  
  showNotification(message, 'error');
}
