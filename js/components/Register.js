import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';
import { supabase } from '../config/supabase.js';

export async function renderRegister() {
  const app = document.getElementById('app');
  
  // Verificar si ya está autenticado
  const isAuthenticated = await AuthService.isAuthenticated();
  if (isAuthenticated) {
    const user = await AuthService.getCurrentUser();
    const defaultRoute = getDefaultRoute(user.role);
    window.navigateTo(defaultRoute);
    return;
  }

  // Cargar tiendas disponibles
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error cargando tiendas:', error);
    showNotification({
      type: 'error',
      message: 'Error al cargar las tiendas disponibles. Por favor, recarga la página.'
    });
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Registro de Comprador</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta? 
          <a href="${ROUTES.LOGIN}" data-route class="font-medium text-blue-600 hover:text-blue-500">
            Inicia sesión
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form id="registerForm" class="space-y-6">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">Nombre completo <span class="text-red-500">*</span></label>
              <div class="mt-1">
                <input id="name" name="name" type="text" required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ingresa tu nombre completo">
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico <span class="text-red-500">*</span></label>
              <div class="mt-1">
                <input id="email" name="email" type="email" autocomplete="email" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="correo@ejemplo.com">
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Contraseña <span class="text-red-500">*</span></label>
              <div class="mt-1">
                <input id="password" name="password" type="password" autocomplete="new-password" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••">
                <p class="mt-2 text-sm text-gray-500">
                  Mínimo 6 caracteres
                </p>
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirmar contraseña <span class="text-red-500">*</span></label>
              <div class="mt-1">
                <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••">
              </div>
            </div>

            <div>
              <label for="store_id" class="block text-sm font-medium text-gray-700">Selecciona tu tienda <span class="text-red-500">*</span></label>
              <div class="mt-1">
                <select id="store_id" name="store_id" required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Selecciona una tienda</option>
                  ${stores ? stores.map(store => 
                    `<option value="${store.id}">${store.name}</option>`
                  ).join('') : ''}
                </select>
              </div>
            </div>

            <div class="flex items-start">
              <div class="flex items-center h-5">
                <input id="terms" name="terms" type="checkbox" required
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              </div>
              <div class="ml-3 text-sm">
                <label for="terms" class="text-gray-700">
                  Acepto los <a href="${ROUTES.TERMS}" data-route class="font-medium text-blue-600 hover:text-blue-500">Términos de servicio</a> y la <a href="${ROUTES.PRIVACY}" data-route class="font-medium text-blue-600 hover:text-blue-500">Política de privacidad</a> <span class="text-red-500">*</span>
                </label>
              </div>
            </div>

            <div>
              <button type="submit" id="submitBtn"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="flex items-center">
                  <span id="btnText">Crear cuenta</span>
                  <svg id="spinner" class="hidden ml-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              </button>
            </div>
          </form>

          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">O regístrate con</span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Registrarse con Google</span>
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.527 2.341 1.086 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.14 18.16 20 14.418 20 10c0-5.523-4.477-10-10-10z" clip-rule="evenodd" />
                  </svg>
                </a>
              </div>

              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Registrarse con Microsoft</span>
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 21 21">
                    <path d="M11.403 9.166h5.675V4.49h-5.675v4.675zm-7.04 0h5.675V4.49H4.364v4.675zm0 6.825h5.675v-4.633H4.364v4.633zm7.04 0h5.675v-4.633h-5.675v4.633zM1.667 1.667h17.5v17.5H1.667V1.667z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar manejador de formulario
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');
  
  // Obtener valores del formulario
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const storeId = document.getElementById('store_id').value;
  
  // Validaciones del frontend
  if (!name || !email || !password || !confirmPassword || !storeId) {
    showNotification({
      type: 'error',
      message: 'Todos los campos son obligatorios.'
    });
    return;
  }
  
  // Validar formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showNotification({
      type: 'error',
      message: 'Por favor, ingresa un correo electrónico válido.'
    });
    return;
  }
  
  // Validar contraseña
  if (password.length < 6) {
    showNotification({
      type: 'error',
      message: 'La contraseña debe tener al menos 6 caracteres.'
    });
    return;
  }
  
  if (password !== confirmPassword) {
    showNotification({
      type: 'error',
      message: 'Las contraseñas no coinciden.'
    });
    return;
  }
  
  // Mostrar loading
  submitBtn.disabled = true;
  btnText.textContent = 'Creando cuenta...';
  spinner.classList.remove('hidden');
  
  try {
    // 1. Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('already registered');
    }

    // 2. Registrar al usuario en Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'buyer',
          store_id: storeId
        },
        emailRedirectTo: window.location.origin + ROUTES.LOGIN
      }
    });
    
    if (signUpError) throw signUpError;
    
    // 3. Crear perfil en la tabla profiles
    const profileData = {
      id: authData.user.id,
      email,
      name,
      role: 'buyer',
      store_id: storeId,
      status: 'Activo',
      credit_assigned: 0.00,
      credit_used: 0.00,
      join_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });
      
    if (profileError) {
      console.error('Error al crear perfil:', profileError);
      // Intentar eliminar el usuario de Auth si falla la creación del perfil
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Error al limpiar usuario después de fallo en perfil:', deleteError);
      }
      throw new Error('Error al crear el perfil del usuario');
    }
    
    // 3. Cerrar sesión automáticamente después del registro exitoso
    try {
      await supabase.auth.signOut();
      
      // Mostrar mensaje de éxito
      showNotification({
        type: 'success',
        message: '¡Cuenta creada con éxito! Por favor verifica tu correo electrónico para activar tu cuenta e inicia sesión.'
      });
      
      // Redirigir a la página de login
      window.navigateTo(ROUTES.LOGIN);
      
    } catch (signOutError) {
      console.error('Error al cerrar sesión después del registro:', signOutError);
      // Aún así redirigir al login aunque falle el cierre de sesión
      window.location.href = ROUTES.LOGIN;
    }
    
  } catch (error) {
    console.error('Error en el registro:', error);
    
    let errorMessage = 'Error al crear la cuenta. Por favor, inténtalo de nuevo.';
    
    if (error.message.includes('already registered')) {
      errorMessage = 'Este correo electrónico ya está registrado. Por favor, inicia sesión o utiliza otro correo.';
    } else if (error.message.includes('password')) {
      errorMessage = 'La contraseña no cumple con los requisitos mínimos.';
    } else if (error.message.includes('email')) {
      errorMessage = 'El formato del correo electrónico no es válido.';
    }
    
    showNotification({
      type: 'error',
      message: errorMessage
    });
    
  } finally {
    // Restaurar el botón
    submitBtn.disabled = false;
    btnText.textContent = 'Crear cuenta';
    spinner.classList.add('hidden');
  }
}

// Función auxiliar para obtener la ruta por defecto según el rol
function getDefaultRoute(role) {
  return role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.BUYER_DASHBOARD;
}
