// Elementos del DOM
let currentUser = null;
const loadingOverlay = document.getElementById('loading');

// Mostrar/ocultar carga
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Mostrar mensaje de error
function showError(message) {
    console.error(message);
    // Mostrar mensaje en la interfaz
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.right = '10px';
    errorDiv.style.padding = '15px';
    errorDiv.style.backgroundColor = '#f8d7da';
    errorDiv.style.border = '1px solid #f5c6cb';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.maxWidth = '400px';
    errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button onclick="this.parentElement.remove()" style="margin-left: 10px; cursor: pointer;">×</button>
    `;
    document.body.appendChild(errorDiv);
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Función para actualizar la UI con los datos del perfil
function updateUI(userData) {
    if (!userData) return;
    
    // Actualizar los campos del formulario con los datos del usuario
    const form = document.getElementById('profile-form');
    if (form) {
        const fields = ['name', 'email', 'phone', 'address', 'document_number'];
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input && userData[field] !== undefined) {
                input.value = userData[field] || '';
            }
        });
    }
    
    // Actualizar la información del usuario en la interfaz
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    
    if (userNameElement) userNameElement.textContent = userData.name || 'Usuario';
    if (userEmailElement) userEmailElement.textContent = userData.email || '';
    
    console.log('Interfaz actualizada con los datos del usuario');
}

// Cargar perfil del usuario
async function loadProfile() {
    const loadingElement = document.getElementById('loading');
    const profileContent = document.getElementById('profile-content');
    
    try {
        console.log('Iniciando carga del perfil...');
        
        // Verificar si Supabase está disponible
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está disponible');
        }
        
        console.log('Supabase disponible, obteniendo sesión...');
        
        // Obtener la sesión actual
        const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
        
        console.log('Respuesta de getSession():', { sessionData, sessionError });
        
        if (sessionError) {
            console.error('Error al obtener la sesión:', sessionError);
            throw new Error('Error al verificar la sesión: ' + (sessionError.message || 'Error desconocido'));
        }
        
        if (!sessionData || !sessionData.session) {
            console.log('No hay sesión activa');
            throw new Error('No hay una sesión activa. Por favor inicia sesión.');
        }
        
        const session = sessionData.session;
        console.log('Sesión encontrada para el usuario:', session.user.email);
        console.log('Sesión activa:', session.user.email);
        
        // Mostrar loader y ocultar contenido
        if (loadingElement) loadingElement.style.display = 'block';
        if (profileContent) profileContent.style.display = 'none';
        
        // Obtener los datos del perfil desde Supabase
        console.log('Obteniendo datos del perfil para el usuario ID:', session.user.id);
        
        const { data: profileData, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        console.log('Respuesta de la consulta del perfil:', { profileData, profileError });
            
        if (profileError) {
            console.error('Error al obtener el perfil:', profileError);
            throw new Error('Error al cargar el perfil: ' + (profileError.message || 'Error desconocido'));
        }
        
        // 3. Verificar rol de administrador
        console.log('Rol del usuario:', profileData.role);
        
        if (profileData.role !== 'admin') {
            const errorMsg = 'No tienes permisos de administrador. Rol actual: ' + (profileData.role || 'no definido');
            console.log(errorMsg);
            throw new Error(errorMsg);
        }
        
        console.log('Perfil cargado correctamente:', profileData);
        
        // 4. Actualizar la interfaz de usuario
        const emailElement = document.getElementById('user-email');
        const nameInput = document.getElementById('user-name');
        const phoneInput = document.getElementById('user-phone');
        
        if (emailElement) emailElement.textContent = session.user.email;
        if (nameInput) nameInput.value = profileData.full_name || '';
        if (phoneInput) phoneInput.value = profileData.phone || '';
        
        // 5. Mostrar contenido y ocultar loader
        if (loadingElement) loadingElement.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
        
    } catch (error) {
        console.error('Error en loadProfile:', error);
        
        // Mostrar mensaje de error al usuario
        const errorMessage = error.message || 'Error desconocido al cargar el perfil';
        showError(errorMessage);
        
        // Redirigir según el tipo de error
        if (error.message && error.message.includes('sesión')) {
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else if (error.message && error.message.includes('permisos')) {
            setTimeout(() => window.location.href = '../index.html', 2000);
        }
        
        // Asegurarse de que el loader se oculte en caso de error
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// Función para inicializar la aplicación
async function initApp() {
    console.log('Inicializando aplicación...');
    
    try {
        // Mostrar carga
        showLoading(true);
        
        // Inicializar eventos
        initEvents();
        
        // Cargar el perfil
        await loadProfile();
        
    } catch (error) {
        console.error('Error en initApp:', error);
        showError('Error al inicializar la aplicación: ' + (error.message || error));
    } finally {
        // Ocultar carga
        showLoading(false);
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, verificando Supabase...');
    
    // Función para verificar e inicializar
    const checkAndInit = () => {
        if (window.supabase && window.supabase.auth) {
            console.log('Supabase está listo, iniciando aplicación...');
            initApp();
        } else {
            console.log('Esperando a que se cargue Supabase...');
            setTimeout(checkAndInit, 500);
        }
    };
    
    // Iniciar verificación
    checkAndInit();
    
    // También intentar inicializar después de un tiempo máximo
    setTimeout(() => {
        if (window.supabase && window.supabase.auth) {
            console.log('Supabase listo después de espera, iniciando...');
            initApp();
        } else {
            showError('No se pudo cargar Supabase correctamente. Recarga la página.');
        }
    }, 5000); // 5 segundos máximo de espera
    
    // Verificar si Supabase ya está cargado
    if (window.supabase) {
        console.log('Supabase ya está cargado, iniciando aplicación...');
        initApp();
    } else {
        console.log('Esperando a que se cargue Supabase...');
        // Esperar a que Supabase esté listo
        const checkSupabase = setInterval(() => {
            if (window.supabase) {
                clearInterval(checkSupabase);
                console.log('Supabase cargado, iniciando aplicación...');
                initApp();
            }
        }, 100);
        
        // Configurar timeout
        setTimeout(() => {
            if (!window.supabase) {
                clearInterval(checkSupabase);
                console.error('Error: Tiempo de espera agotado para cargar Supabase');
                showError('No se pudo cargar la aplicación. Por favor, recarga la página.');
            }
        }, 10000);
    }
});

// Escuchar el evento auth:ready para cuando la autenticación esté lista
document.addEventListener('auth:ready', (event) => {
    console.log('Evento auth:ready recibido en el manejador global');
    // Inicializar eventos después de cargar el perfil
    initEvents();
});

// Inicializar eventos
function initEvents() {
    // Formulario de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Formulario de contraseña
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Carga de avatar
    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', handleImageUpload);
    }
    
    // Botón de cancelar en el formulario de perfil
    const cancelProfileBtn = profileForm?.querySelector('button[type="button"]');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', () => {
            // Recargar los datos del perfil para descartar cambios
            loadProfile();
        });
    }
}

// Mostrar una sección específica del perfil
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostrar la sección seleccionada
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.remove('hidden');
    }
    
    // Actualizar el estado activo en el menú
    document.querySelectorAll('.sidebar nav button').forEach(button => {
        if (button.getAttribute('onclick').includes(sectionId)) {
            button.classList.remove('text-gray-600', 'hover:text-blue-600');
            button.classList.add('text-blue-600', 'bg-blue-50');
        } else {
            button.classList.remove('text-blue-600', 'bg-blue-50');
            button.classList.add('text-gray-600', 'hover:text-blue-600');
        }
    });
}

// Cargar perfil del usuario
async function loadProfile() {
    try {
        showLoading(true);
        console.log('Iniciando carga del perfil...');
        
        // Verificar que Supabase esté disponible
        if (typeof window.supabase === 'undefined') {
            const errorMsg = 'Supabase no está disponible';
            console.error(errorMsg);
            showError(errorMsg + '. Por favor, recarga la página.');
            return;
        }
        
        const supabase = window.supabase;
        console.log('Supabase obtenido, verificando sesión...');
        
        try {
            // Verificar si hay un token de sesión guardado
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Error al verificar sesión:', sessionError);
                // Intentar forzar un cierre de sesión limpio
                await supabase.auth.signOut();
                window.location.href = 'login.html';
                return;
            }
            
            if (!session) {
                console.log('No hay sesión activa, redirigiendo a login...');
                window.location.href = 'login.html';
                return;
            }
            
            console.log('Sesión válida encontrada, usuario ID:', session.user.id);
            
            // Intentar obtener el perfil del usuario
            const { data: userData, error: userError } = await supabase
                .from('profiles') // Asegúrate de que esta tabla existe en tu base de datos
                .select('*')
                .eq('id', session.user.id)
                .single();
                
            if (userError) {
                console.error('Error al cargar el perfil:', userError);
                throw userError;
            }
            
            console.log('Perfil cargado correctamente:', userData);
            currentUser = { ...session.user, ...userData };
            updateUI(currentUser);
            
        } catch (error) {
            console.error('Error en loadProfile:', error);
            showError('Error al cargar el perfil. Por favor, inicia sesión nuevamente.');
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        }
        
        // Obtener el usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Obtener datos adicionales del perfil desde la tabla de perfiles
        const { data: profileData, error: profileError } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id_usuario', user.id)
            .single();
            
        // Si hay un error diferente a "no encontrado", lanzar el error
        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        
        // Si no existe el perfil, crearlo con valores por defecto
        if (!profileData) {
            const defaultProfile = {
                id_usuario: user.id,
                nombre: user.email.split('@')[0],
                apellido: '',
                telefono: '',
                direccion: '',
                avatar_url: ''
            };
            
            const { data: newProfile, error: createError } = await supabase
                .from('perfiles')
                .insert([defaultProfile])
                .select()
                .single();
                
            if (createError) throw createError;
            
            // Usar el perfil recién creado
            currentUser = {
                ...defaultProfile,
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: new Date().toISOString()
            };
        } else {
            // Usar el perfil existente
            currentUser = {
                id: user.id,
                email: user.email,
                nombre: profileData.nombre || user.email.split('@')[0],
                apellido: profileData.apellido || '',
                telefono: profileData.telefono || '',
                direccion: profileData.direccion || '',
                avatar_url: profileData.avatar_url || '',
                created_at: user.created_at,
                updated_at: profileData.updated_at || user.updated_at
            };
        }
        
        // Actualizar la interfaz de usuario
        updateUI(currentUser);
        
        // Actualizar la barra de navegación
        updateNavbarUserInfo(
            currentUser.nombre,
            currentUser.email,
            currentUser.avatar_url
        );
        
        return currentUser;
        
    } catch (error) {
        console.error('Error al cargar el perfil:', error);
        showError(error.message || 'Error al cargar los datos del perfil');
        return null;
    } finally {
        showLoading(false);
    }
}

// Actualizar la interfaz con los datos del perfil
function updateUI(userData) {
    if (!userData) return;
    
    // Actualizar avatar
    const avatar = document.getElementById('user-avatar');
    const avatarInitials = document.getElementById('avatar-initials');
    const avatarImg = document.getElementById('avatar-img');
    
    if (userData.avatar_url) {
        avatarImg.src = userData.avatar_url;
        avatarImg.classList.remove('hidden');
        avatarInitials?.classList.add('hidden');
    } else {
        const initials = getInitials(userData.nombre || userData.email);
        if (avatarInitials) {
            avatarInitials.textContent = initials;
            avatarInitials.classList.remove('hidden');
        }
        avatarImg?.classList.add('hidden');
    }
    
    // Actualizar información básica
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    
    if (profileName) profileName.textContent = userData.nombre || userData.email.split('@')[0];
    if (profileEmail) profileEmail.textContent = userData.email;
    
    // Actualizar formulario de perfil
    const form = document.getElementById('profile-form');
    if (form) {
        const nombreInput = form.elements['nombre'];
        const emailInput = form.elements['email'];
        const telefonoInput = form.elements['telefono'];
        const direccionInput = form.elements['direccion'];
        
        if (nombreInput) nombreInput.value = userData.nombre || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (telefonoInput) telefonoInput.value = userData.telefono || '';
        if (direccionInput) direccionInput.value = userData.direccion || '';
    }
    
    // Actualizar información en la barra de navegación
    updateNavbarUserInfo(
        userData.nombre || userData.email.split('@')[0],
        userData.email,
        userData.avatar_url
    );
    
    // Actualizar información adicional en el perfil
    const fullName = [userData.nombre, userData.apellido].filter(Boolean).join(' ');
    const userFullName = document.getElementById('user-full-name');
    const userPhone = document.getElementById('user-phone');
    const userAddress = document.getElementById('user-address');
    const userSince = document.getElementById('user-since');
    
    if (userFullName) userFullName.textContent = fullName || 'No especificado';
    if (userPhone) userPhone.textContent = userData.telefono || 'No especificado';
    if (userAddress) userAddress.textContent = userData.direccion || 'No especificada';
    if (userSince) userSince.textContent = userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'No disponible';
    // Actualizar barra de navegación
    updateNavbarUserInfo(fullName, userData.email, userData.avatar_url);
}

// Obtener iniciales del nombre
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Actualizar información del usuario en la barra de navegación
function updateNavbarUserInfo(name, email, avatarUrl) {
    // Actualizar avatar en la barra de navegación
    const navbarAvatar = document.querySelector('.navbar-avatar');
    const navbarInitials = document.querySelector('.navbar-initials');
    
    if (navbarAvatar && navbarInitials) {
        if (avatarUrl) {
            navbarAvatar.src = avatarUrl;
            navbarAvatar.classList.remove('hidden');
            navbarInitials.classList.add('hidden');
        } else {
            navbarInitials.textContent = getInitials(name);
            navbarInitials.classList.remove('hidden');
            navbarAvatar.classList.add('hidden');
        }
    }
    
    // Actualizar nombre y correo en el menú desplegable
    const userNameElement = document.querySelector('.user-name');
    const userEmailElement = document.querySelector('.user-email');
    
    if (userNameElement) userNameElement.textContent = name;
    if (userEmailElement) userEmailElement.textContent = email;
}

// Manejar envío del formulario de perfil
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Preparar datos para actualizar
    const updates = {
        nombre: formData.get('nombre')?.trim(),
        apellido: formData.get('apellido')?.trim() || null,
        telefono: formData.get('telefono')?.trim() || null,
        direccion: formData.get('direccion')?.trim() || null,
        updated_at: new Date().toISOString()
    };
    
    // Validaciones
    if (!updates.nombre) {
        showError('El nombre es requerido');
        return;
    }
    
    try {
        showLoading(true);
        
        // Verificar sesión
        const isAuthenticated = await checkSession();
        if (!isAuthenticated) return;
        
        // Actualizar perfil en la tabla de perfiles
        const { data: profileData, error: profileError } = await supabase
            .from('perfiles')
            .upsert({
                id_usuario: currentUser.id,
                ...updates
            })
            .eq('id_usuario', currentUser.id)
            .select()
            .single();
            
        if (profileError) throw profileError;
        
        // Actualizar datos locales
        currentUser = { 
            ...currentUser, 
            ...updates,
            ...profileData
        };
        
        // Actualizar la interfaz
        updateUI(currentUser);
        updateNavbarUserInfo(
            currentUser.nombre,
            currentUser.email,
            currentUser.avatar_url
        );
        
        // Mostrar notificación de éxito
        showSuccess('Perfil actualizado correctamente');
        
    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        showError(error.message || 'Error al actualizar el perfil');
    } finally {
        showLoading(false);
    }
}
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const form = e.target;
    const currentPassword = form.elements['current-password']?.value;
    const newPassword = form.elements['new-password']?.value;
    const confirmPassword = form.elements['confirm-password']?.value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Todos los campos son obligatorios');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('Las nuevas contraseñas no coinciden');
        return;
    }
    
    if (newPassword.length < 8) {
        showError('La contraseña debe tener al menos 8 caracteres');
        return;
    }
    
    try {
        showLoading(true);
        
        // Primero reautenticar al usuario
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });
        
        if (authError) {
            if (authError.message.includes('Invalid login credentials')) {
                throw new Error('La contraseña actual es incorrecta');
            }
            throw authError;
        }
        
        // Si la autenticación es exitosa, actualizar la contraseña
        const { data, error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (updateError) throw updateError;
        
        // Limpiar formulario
        form.reset();
        
        // Mostrar notificación de éxito
        showSuccess('Contraseña actualizada correctamente');
        
        // Cerrar sesión después de cambiar la contraseña (opcional)
        // await supabase.auth.signOut();
        // window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Error al actualizar la contraseña:', error);
        showError(error.message || 'Error al actualizar la contraseña');
    } finally {
        showLoading(false);
    }
}

// Manejar carga de imagen
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(file.type)) {
        showError('Por favor, sube una imagen válida (JPEG, PNG o GIF)');
        return;
    }
    
    // Validar tamaño del archivo (máx 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        showError('La imagen no debe superar los 2MB');
        return;
    }
    
    try {
        showLoading(true);
        const avatarUrl = await uploadProfileImage(file);
        
        // Actualizar el perfil con la nueva URL del avatar
        await updateUserProfile({ avatar_url: avatarUrl });
        
        // Actualizar la UI
        const avatarElement = document.getElementById('user-avatar');
        const initialsElement = document.getElementById('user-initials');
        
        avatarElement.src = avatarUrl;
        avatarElement.classList.remove('hidden');
        initialsElement.classList.add('hidden');
        
        // Actualizar la barra de navegación
        updateNavbarUserInfo(
            `${currentUser.nombre || ''} ${currentUser.apellido || ''}`.trim(),
            currentUser.email,
            avatarUrl
        );
        
        showSuccess('Foto de perfil actualizada exitosamente');
    } catch (error) {
        console.error('Error al subir la imagen:', error);
        showError('Error al subir la imagen: ' + (error.message || 'Error desconocido'));
    } finally {
        showLoading(false);
        // Restablecer el input de archivo para permitir cargar la misma imagen de nuevo si es necesario
        e.target.value = '';
    }
}

// Alternar visibilidad de contraseña
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.querySelector(`button[onclick="togglePasswordVisibility('${inputId}')"] i`);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Actualizar perfil del usuario
async function updateUserProfile(updates) {
    if (!currentUser) throw new Error('No hay un usuario autenticado');
    
    const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', currentUser.id)
        .select();
        
    if (error) throw error;
    
    // Actualizar datos del usuario actual
    if (data && data.length > 0) {
        currentUser = { ...currentUser, ...data[0] };
    }
    
    return data;
}

// Actualizar contraseña del usuario
async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });
    
    if (error) throw error;
    
    // Registrar el cambio de contraseña en el historial
    await supabase
        .from('user_activities')
        .insert([
            {
                user_id: currentUser.id,
                action: 'password_change',
                description: 'Contraseña actualizada',
                ip_address: await getClientIP()
            }
        ]);
}

// Subir imagen de perfil
async function uploadProfileImage(file) {
    if (!currentUser) throw new Error('No hay un usuario autenticado');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Subir el archivo al bucket de almacenamiento
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });
    
    if (uploadError) throw uploadError;
    
    // Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);
    
    return publicUrl;
}

// Obtener la IP del cliente
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error al obtener la IP del cliente:', error);
        return 'unknown';
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Usar SweetAlert2 para mostrar notificaciones
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
    
    Toast.fire({
        icon: type,
        title: message
    });
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    showNotification(message, 'success');
}

// Mostrar mensaje de error
function showError(message) {
    showNotification(message, 'error');
}

// Mostrar/ocultar carga
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.toggle('hidden', !show);
    }
}

// Funciones de utilidad para el perfil
function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Función para formatear fechas
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

// Mensajes temporales
function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'danger');
}

function showToast(message, type = 'info') {
    // Mapear tipos de mensaje a clases de Bootstrap
    const typeClasses = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };
    
    // Crear el contenedor del toast
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1000';
    
    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white ${typeClasses[type] || 'bg-primary'} border-0`;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Contenido del toast
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Agregar el toast al contenedor
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    // Inicializar el toast de Bootstrap
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Eliminar el toast después de mostrarse
    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
    
    // Cerrar automáticamente después de 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Función para verificar la sesión del usuario
async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar la sesión:', error);
        showError('Error al verificar la sesión');
        return false;
    }
}