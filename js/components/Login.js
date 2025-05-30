import { ROUTES, getDefaultRoute } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { showNotification } from '../utils/notifications.js';
import { supabase } from '../config/supabase.js';

// Constantes para el bloqueo de intentos
const MAX_ATTEMPTS = 3;
const MAX_TOTAL_ATTEMPTS = 6; // 3 iniciales + 3 después del primer bloqueo
const INITIAL_LOCKOUT_DURATION = 60 * 1000; // 1 minuto para el primer bloqueo
const SECOND_LOCKOUT_DURATION = 2 * 60 * 1000; // 2 minutos para el segundo bloqueo
const SECOND_LOCK_KEY = 'second_lock';

// Claves para localStorage
const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const LOCKOUT_UNTIL_KEY = 'login_lockout_until';
const TOTAL_ATTEMPTS_KEY = 'total_login_attempts';
const TRON_ALERT_SHOWN_KEY = 'tron_alert_shown';

export async function renderLogin() {
  const app = document.getElementById('app');
  
  // Verificar si ya está autenticado
  const isAuthenticated = await AuthService.isAuthenticated();
  if (isAuthenticated) {
    const user = await AuthService.getCurrentUser();
    const defaultRoute = getDefaultRoute(user.role);
    window.navigateTo(defaultRoute);
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar sesión</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          ¿No tienes una cuenta? 
          <a href="${ROUTES.REGISTER}" data-route class="font-medium text-blue-600 hover:text-blue-500">
            Regístrate
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form id="loginForm" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <div class="mt-1">
                <input id="email" name="email" type="email" autocomplete="email" required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              </div>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
              <div class="mt-1">
                <input id="password" name="password" type="password" autocomplete="current-password" required 
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" 
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                  Recordarme
                </label>
              </div>

              <div class="text-sm">
                <a href="#" id="forgotPasswordLink" class="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div class="mt-6 space-y-4">
            <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Iniciar sesión
            </button>
            
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onclick="handleGoogleLogin()"
                class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span class="ml-2">Google</span>
              </button>
              
              <button 
                type="button" 
                onclick="handleFacebookLogin()"
                class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg class="w-5 h-5 text-[#1877F2]" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd"/>
                </svg>
                <span class="ml-2">Facebook</span>
              </button>
            </div>
          </div>
          </form>
          
          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Iniciar sesión con Google</span>
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.527 2.341 1.086 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.14 18.16 20 14.418 20 10c0-5.523-4.477-10-10-10z" clip-rule="evenodd" />
                  </svg>
                </a>
              </div>

              <div>
                <a href="#" class="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span class="sr-only">Iniciar sesión con Microsoft</span>
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

  // Actualizar estado inicial del botón
  updateLoginButtonState();
  
  // Agregar manejador de formulario
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  
  // Agregar manejador para el enlace de recuperación
  document.getElementById('forgotPasswordLink')?.addEventListener('click', handleForgotPassword);
}

// Función para verificar si la cuenta está bloqueada
function isAccountLocked() {
  // Verificar segundo bloqueo (2 minutos)
  const secondLock = localStorage.getItem(SECOND_LOCK_KEY);
  if (secondLock) {
    const lockTime = parseInt(secondLock, 10);
    const now = new Date().getTime();
    if (now < lockTime) {
      return true;
    } else {
      // Limpiar el bloqueo si ya pasó el tiempo
      localStorage.removeItem(SECOND_LOCK_KEY);
      localStorage.removeItem(LOCKOUT_UNTIL_KEY);
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
      updateLoginButtonState();
      
      // Mostrar notificación cuando se desbloquee
      showNotification({
        type: 'info',
        message: 'El bloqueo temporal ha finalizado. Puedes intentar iniciar sesión nuevamente.'
      });
    }
  }
  
  // Verificar bloqueo temporal normal (1 minuto)
  const lockoutUntil = localStorage.getItem(LOCKOUT_UNTIL_KEY);
  if (!lockoutUntil) return false;
  
  const now = new Date().getTime();
  const isLocked = now < parseInt(lockoutUntil, 10);
  
  // Si el bloqueo ya expiró, limpiar
  if (!isLocked) {
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    updateLoginButtonState();
  }
  
  return isLocked;
}

// Función para mostrar la alerta Cyborg
function showTronAlert() {
  // Establecer bloqueo de 2 minutos
  const lockTime = new Date().getTime() + SECOND_LOCKOUT_DURATION;
  localStorage.setItem(SECOND_LOCK_KEY, lockTime.toString());
  
  // Crear el elemento de la alerta
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4 overflow-auto';
  
  // Contenido de la alerta
  alertDiv.innerHTML = `
    <div class="relative max-w-2xl w-full text-center overflow-hidden">
      <!-- Fondo con efecto de escaneo -->
      <div class="absolute inset-0 bg-black">
        <div class="absolute inset-0 bg-cover bg-center opacity-30" style="background-image: url('https://i.imgur.com/8Km9tLL.jpg');"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-pink-500/10 to-purple-500/10"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0)_0%,_rgba(0,0,0,0.9)_70%)]"></div>
      </div>
      
      <!-- Contenido principal -->
      <div class="relative z-10 p-8">
        <!-- Título con efecto neón -->
        <h2 class="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-400">
          <span class="neon-text">ACCESO DENEGADO</span>
        </h2>
        
        <!-- Imagen de cyborg -->
        <div class="my-8 flex justify-center">
          <div class="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-pink-500/50 shadow-lg shadow-pink-500/30">
            <div class="absolute inset-0 bg-[url('https://i.imgur.com/8Km9tLL.jpg')] bg-cover bg-center transform scale-110"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div class="absolute inset-0 flex items-end justify-center pb-4">
              <div class="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
            </div>
          </div>
        </div>
        
        <!-- Mensaje -->
        <p class="text-gray-300 text-lg mb-8 max-w-lg mx-auto">
          <span class="text-pink-400 font-medium">Sistema de Seguridad Activado:</span> Se ha detectado actividad sospechosa. El acceso ha sido bloqueado temporalmente por medidas de seguridad.
        </p>
        
        <!-- Botones -->
        <div class="flex flex-col space-y-4 max-w-xs mx-auto">
          <a href="#" id="recoverPasswordLink" class="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium rounded-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-pink-500/30 flex items-center justify-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            <span>Recuperar Acceso</span>
          </a>
          
          <button id="closeTronAlert" class="px-6 py-2.5 border border-pink-500/50 text-pink-400 hover:bg-pink-500/10 rounded-md transition-colors duration-300 flex items-center justify-center space-x-2">
            <span>Cerrar</span>
          </button>
        </div>
      </div>
      
      <!-- Efectos de neón -->
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse"></div>
      
      <style>
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0.1; }
          50% { opacity: 0.3; }
          100% { transform: translateY(100%); opacity: 0.1; }
        }
        
        .neon-text {
          text-shadow: 0 0 5px #ff69b4, 0 0 10px #ff69b4, 0 0 20px #ff69b4, 0 0 40px #ff00ff, 0 0 80px #ff00ff;
          animation: neon-flicker 1.5s infinite alternate;
        }
        
        @keyframes neon-flicker {
          0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% {
            opacity: 1;
          }
          20%, 21.999%, 63%, 63.999%, 65%, 69.999% {
            opacity: 0.7;
          }
        }
        
        .cyborg-eye {
          position: absolute;
          width: 20px;
          height: 8px;
          background: #ff00ff;
          border-radius: 50%;
          box-shadow: 0 0 5px #ff00ff, 0 0 10px #ff00ff;
          animation: eye-scan 3s infinite;
        }
        
        @keyframes eye-scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
      </style>
    </div>
  `;
  
  // Agregar la alerta al documento
  document.body.appendChild(alertDiv);
  document.body.style.overflow = 'hidden';
  
  // Configurar manejadores de eventos
  document.getElementById('recoverPasswordLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.removeChild(alertDiv);
    document.body.style.overflow = '';
    handleForgotPassword(e);
  });
  
  document.getElementById('closeTronAlert')?.addEventListener('click', () => {
    document.body.removeChild(alertDiv);
    document.body.style.overflow = '';
  });
  
  // Marcar que ya se mostró la alerta
  localStorage.setItem(TRON_ALERT_SHOWN_KEY, 'true');
}

// Función para incrementar el contador de intentos fallidos
function incrementFailedAttempts() {
  // Incrementar intentos de la sesión actual
  const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, attempts.toString());
  
  // Incrementar contador total de intentos
  const totalAttempts = parseInt(localStorage.getItem(TOTAL_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(TOTAL_ATTEMPTS_KEY, totalAttempts.toString());
  
  // Verificar si es el segundo bloqueo (6 intentos en total)
  const isSecondLock = totalAttempts >= MAX_TOTAL_ATTEMPTS;
  
  // Bloquear después de MAX_ATTEMPTS intentos en la sesión actual
  if (attempts >= MAX_ATTEMPTS) {
    const lockoutDuration = isSecondLock ? 
      SECOND_LOCKOUT_DURATION : // 2 minutos para el segundo bloqueo
      INITIAL_LOCKOUT_DURATION;  // 1 minuto para el primer bloqueo
    
    const lockoutUntil = new Date().getTime() + lockoutDuration;
    localStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntil.toString());
    
    // Si es el segundo bloqueo, mostrar la alerta
    if (isSecondLock) {
      showTronAlert();
    } else {
      // Para el primer bloqueo, actualizar el estado del botón
      updateLoginButtonState();
      
      // Configurar un temporizador para reactivar el botón después de 1 minuto
      setTimeout(() => {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        localStorage.removeItem(LOCKOUT_UNTIL_KEY);
        updateLoginButtonState();
        
        // Mostrar notificación cuando se reactive el botón
        showNotification({
          type: 'info',
          message: 'Puedes intentar iniciar sesión nuevamente.'
        });
      }, INITIAL_LOCKOUT_DURATION);
    }
  }
}

// Función para actualizar el estado del botón de inicio de sesión
function updateLoginButtonState() {
  const loginButton = document.querySelector('#loginForm button[type="submit"]');
  if (!loginButton) return;
  
  // Verificar si estamos en el segundo bloqueo (no mostrar contador)
  const secondLock = localStorage.getItem(SECOND_LOCK_KEY);
  if (secondLock) {
    loginButton.disabled = true;
    loginButton.textContent = 'Acceso temporalmente deshabilitado';
    loginButton.classList.add('bg-gray-400', 'cursor-not-allowed');
    loginButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    return;
  }
  
  const lockoutUntil = localStorage.getItem(LOCKOUT_UNTIL_KEY);
  
  if (lockoutUntil) {
    const now = new Date().getTime();
    const timeLeft = parseInt(lockoutUntil, 10) - now;
    
    if (timeLeft > 0) {
      // Calcular minutos y segundos restantes
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      // Deshabilitar el botón y mostrar contador
      loginButton.disabled = true;
      loginButton.innerHTML = `Inténtalo de nuevo en ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      loginButton.classList.add('bg-gray-400', 'cursor-not-allowed');
      loginButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      
      // Actualizar el contador cada segundo
      setTimeout(updateLoginButtonState, 1000);
      return;
    } else {
      // Tiempo de bloqueo terminado
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    }
  }
  
  // Restaurar estado normal del botón
  loginButton.disabled = false;
  loginButton.textContent = 'Iniciar sesión';
  loginButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
  loginButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
}

// Funciones globales para autenticación
window.handleGoogleLogin = async () => {
  const loginButton = document.querySelector('button[onclick*="handleGoogleLogin"]');
  if (loginButton) {
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner">Conectando...</span>';
  }
  
  try {
    const { error } = await AuthService.loginWithGoogle();
    if (error) {
      showNotification({
        type: 'error',
        message: 'Error al iniciar sesión con Google. Por favor, inténtalo de nuevo.'
      });
    }
  } catch (error) {
    console.error('Error en handleGoogleLogin:', error);
    showNotification({
      type: 'error',
      message: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'
    });
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = '<svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg><span class="ml-2">Google</span>';
    }
  }
};

window.handleFacebookLogin = async () => {
  const loginButton = document.querySelector('button[onclick*="handleFacebookLogin"]');
  if (loginButton) {
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner">Conectando...</span>';
  }
  
  try {
    const { error } = await AuthService.loginWithFacebook();
    if (error) {
      showNotification({
        type: 'error',
        message: 'Error al iniciar sesión con Facebook. Por favor, inténtalo de nuevo.'
      });
    }
  } catch (error) {
    console.error('Error en handleFacebookLogin:', error);
    showNotification({
      type: 'error',
      message: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'
    });
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.innerHTML = '<svg class="w-5 h-5 text-[#1877F2]" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd"/></svg><span class="ml-2">Facebook</span>';
    }
  }
};

// Verificar estado de bloqueo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname === ROUTES.LOGIN) {
    updateLoginButtonState();
  }
});

async function handleLogin(e) {
  e.preventDefault();
  
  // Verificar si la cuenta está bloqueada
  if (isAccountLocked()) {
    updateLoginButtonState();
    showNotification({
      type: 'error',
      message: 'Demasiados intentos fallidos. Por favor, espera unos minutos antes de intentar de nuevo.'
    });
    return;
  }
  
  const loginButton = e.target.querySelector('button[type="submit"]');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;
  
  try {
    // Deshabilitar botón mientras se procesa
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner">Iniciando sesión...</span>';
    
    const { success, user, error } = await AuthService.login(email, password);
    
    if (error || !success) {
      throw error || new Error('Error al iniciar sesión');
    }
    
    // Mostrar notificación de éxito
    showNotification({
      type: 'success',
      message: `¡Bienvenido/a, ${user.name || user.email}!`
    });
    
    // Limpiar todos los contadores y bloqueos
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);
    localStorage.removeItem(TOTAL_ATTEMPTS_KEY);
    localStorage.removeItem(TRON_ALERT_SHOWN_KEY);
    localStorage.removeItem(SECOND_LOCK_KEY);
    
    // Forzar recarga de la página para asegurar que todos los estados se actualicen
    const defaultRoute = getDefaultRoute(user.role);
    window.location.href = defaultRoute;
    
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    
    // Incrementar contador de intentos fallidos
    incrementFailedAttempts();
    
    // Mostrar mensaje de error apropiado
    let errorMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
    
    if (isAccountLocked()) {
      errorMessage = 'Demasiados intentos fallidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente. Por favor, inténtalo de nuevo en 5 minutos.';
    } else {
      const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10);
      const remainingAttempts = MAX_ATTEMPTS - attempts;
      
      if (remainingAttempts > 0) {
        errorMessage += ` (${remainingAttempts} ${remainingAttempts === 1 ? 'intento' : 'intentos'} restantes)`;
      }
    }
    
    showNotification({
      type: 'error',
      message: errorMessage
    });
    
    // Restaurar botón
    updateLoginButtonState();
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  
  if (!email) {
    showNotification({
      type: 'error',
      message: 'Por favor ingresa tu correo electrónico para recuperar tu contraseña.'
    });
    return;
  }
  
  try {
    // Mostrar mensaje de carga
    showNotification({
      type: 'info',
      message: 'Enviando correo de recuperación...',
      duration: 3000
    });
    
    // Usar el método de Supabase para enviar el correo de recuperación
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    });
    
    if (error) throw error;
    
    // Mostrar mensaje de éxito
    showNotification({
      type: 'success',
      message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.'
    });
    
  } catch (error) {
    console.error('Error al enviar correo de recuperación:', error);
    showNotification({
      type: 'error',
      message: error.message || 'Error al enviar el correo de recuperación. Inténtalo de nuevo más tarde.'
    });
  }
}
