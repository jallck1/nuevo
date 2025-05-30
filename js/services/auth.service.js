import { supabase } from '../config/supabase.js';
import { ROLES } from '../config/constants.js';
import { showNotification } from '../utils/notifications.js';
import { ROUTES, isPublicRoute, isAdminRoute, isBuyerRoute, getDefaultRoute } from '../config/routes.js';

export class AuthService {
  // Manejar navegación
  static async handleNavigation(router) {
    const path = window.location.pathname;
    const hash = window.location.hash || ''; // Obtener el hash si existe
    const fullPath = path + hash; // Incluir hash para manejar rutas con #
    
    console.log('Navegando a:', fullPath);

    try {
      // 1. Obtener usuario actual
      const user = await AuthService.getCurrentUser();
      const userRole = user?.role?.toLowerCase();
      
      // 2. Si la ruta es pública, permitir el acceso
      if (isPublicRoute(path)) {
        console.log('Ruta pública, acceso permitido');
        
        // Si el usuario ya está autenticado y está en login/register, redirigir
        if (user && (path === ROUTES.LOGIN || path === ROUTES.REGISTER)) {
          console.log('Usuario autenticado, redirigiendo a dashboard');
          window.location.href = getDefaultRoute(userRole);
          return;
        }
        
        if (router && typeof router.renderCurrentRoute === 'function') {
          router.renderCurrentRoute();
        }
        return;
      }
      
      // 3. Si no hay usuario autenticado, redirigir a login
      if (!user) {
        console.error('Usuario no autenticado, redirigiendo a login');
        // Guardar la ruta a la que intentó acceder para redirigir después del login
        sessionStorage.setItem('redirectAfterLogin', fullPath);
        window.location.href = ROUTES.LOGIN;
        return;
      }
      
      // 4. Verificar acceso según el rol
      if (isAdminRoute(path)) {
        if (userRole !== 'admin') {
          console.error('ACCESO DENEGADO: Se requiere rol de administrador');
          window.location.href = ROUTES.BUYER_DASHBOARD;
          return;
        }
      } else if (isBuyerRoute(path)) {
        if (userRole !== 'buyer') {
          console.error('ACCESO DENEGADO: Se requiere rol de comprador');
          window.location.href = ROUTES.ADMIN_DASHBOARD;
          return;
        }
      }

      // 5. Si está autenticado y va a login/register, redirigir a su dashboard
      if (path === ROUTES.LOGIN || path === ROUTES.REGISTER) {
        console.log('Usuario autenticado, redirigiendo a dashboard');
        window.location.href = getDefaultRoute(userRole);
        return;
      }
      
      // 6. Verificar si hay una redirección pendiente
      const redirectTo = sessionStorage.getItem('redirectAfterLogin');
      if (redirectTo && redirectTo !== fullPath) {
        console.log('Redirigiendo a ruta guardada:', redirectTo);
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectTo;
        return;
      }

      // 7. Si todo está bien, renderizar la ruta
      if (router && typeof router.renderCurrentRoute === 'function') {
        console.log('Renderizando ruta:', fullPath);
        router.renderCurrentRoute();
      }

    } catch (error) {
      console.error('Error en handleNavigation:', error);
      // En caso de error, redirigir al login
      window.location.href = ROUTES.LOGIN;
    }
  }

  // Obtener usuario actual
  static async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Verificar token expirado
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed?.session) {
          await this.logout();
          return null;
        }
      }

      // Obtener perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        await this.logout();
        return null;
      }

      // Validar rol
      if (!['admin', 'buyer'].includes(profile.role?.toLowerCase())) {
        await this.logout();
        return null;
      }

      return {
        ...session.user,
        role: profile.role.toLowerCase(),
        profile
      };
    } catch (error) {
      console.error('Error en getCurrentUser:', error);
      await this.logout();
      return null;
    }
  }

  // Iniciar sesión
  static async login(email, password) {
    try {
      console.log('Iniciando proceso de login para:', email);
      
      // 1. Autenticar al usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Error de autenticación:', authError);
        throw new Error('Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
      }
      
      if (!authData || !authData.user) {
        console.error('No se pudo obtener la información del usuario después de autenticar');
        throw new Error('Error al obtener la información del usuario. Por favor, inténtalo de nuevo.');
      }
      
      console.log('Usuario autenticado en Supabase Auth:', authData.user.id);
      
      // 2. Obtener el perfil del usuario
      let profile;
      try {
        profile = await this.getUserProfile(authData.user.id);
        console.log('Perfil obtenido:', profile);
      } catch (profileError) {
        console.error('Error al obtener el perfil del usuario:', profileError);
        // Continuar incluso si hay un error al obtener el perfil
      }
      
      // 3. Construir el objeto de usuario
      const user = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || profile?.name || authData.user.email?.split('@')[0] || 'Usuario',
        role: profile?.role || ROLES.BUYER,
        store_id: profile?.store_id || null,
        profile: profile || {}
      };
      
      console.log('Usuario autenticado con éxito:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        store_id: user.store_id
      });
      
      // 4. Actualizar la fecha de último inicio de sesión
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error al actualizar la última sesión:', updateError);
        } else {
          console.log('Última sesión actualizada correctamente');
        }
      } catch (updateError) {
        console.error('Error al actualizar la última sesión:', updateError);
      }
      
      // 5. Si es administrador sin tienda, registrar en consola
      if (user.role === 'admin' && !user.store_id) {
        console.warn('El administrador no tiene una tienda asignada');
        // No es un error crítico, solo un aviso
      }
      
      return {
        success: true,
        user,
        session: authData.session
      };
      
    } catch (error) {
      console.error('Error en el proceso de login:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Ocurrió un error inesperado al iniciar sesión')
      };
    }
  }

  // Cerrar sesión
  static async logout() {
    try {
      console.log('Iniciando cierre de sesión...');
      
      // Forzar cierre de sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      // Limpiar almacenamiento local
      localStorage.removeItem('sb:token');
      localStorage.removeItem('sb:user');
      sessionStorage.clear();
      
      // Limpiar cookies relacionadas
      document.cookie = 'sb:token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'sb:refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      console.log('Sesión cerrada exitosamente');
      
      // Disparar evento personalizado de cierre de sesión
      window.dispatchEvent(new Event('auth:logout'));
      
      return { success: true };
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Error desconocido al cerrar sesión')
      };
    }
  }

  // Registrar nuevo usuario
  static async register(userData) {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role || ROLES.BUYER
          }
        }
      });

      if (signUpError) throw signUpError;

      // Crear perfil del usuario
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || ROLES.BUYER,
            status: 'active',
            join_date: new Date().toISOString()
          }
        ]);

      if (profileError) throw profileError;

      return { success: true, data };
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      showNotification({
        type: 'error',
        message: error.message || 'Error al registrar el usuario.'
      });
      return { success: false, error };
    }
  }

  // Obtener el perfil del usuario
  static async getUserProfile(userId, maxRetries = 3) {
    try {
      console.log('Obteniendo perfil para el usuario ID:', userId);
      
      // Primero, obtener el perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error al obtener perfil básico:', profileError);
        
        // Si es un error 404 (perfil no encontrado), crear un perfil básico
        if (profileError.code === 'PGRST116' || profileError.code === 'PGRST202') {
          console.log('Perfil no encontrado, creando perfil básico...');
          return this.createBasicProfile(userId);
        }
        
        throw profileError;
      }

      console.log('Perfil básico obtenido:', profileData);
      return profileData;
      
    } catch (error) {
      console.error('Error en getUserProfile:', error);
      
      // Reintentar si es posible
      if (maxRetries > 0) {
        console.log(`Reintentando obtener perfil... (${maxRetries} intentos restantes)`);
        return this.getUserProfile(userId, maxRetries - 1);
      }
      
      throw error; // Relanzar el error después de agotar los reintentos
    }
  }
  
  // Crear un perfil básico para usuarios nuevos
  static async createBasicProfile(userId) {
    try {
      console.log('Creando perfil básico para usuario:', userId);
      
      // Obtener el usuario actual para el correo electrónico
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Crear el perfil con datos básicos
      const { data: profileData, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            role: 'buyer', // Rol por defecto
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('Error al crear perfil básico:', createError);
        throw createError;
      }
      
      console.log('Perfil básico creado:', profileData);
      return profileData;
      
    } catch (error) {
      console.error('Error en createBasicProfile:', error);
      throw error;
    }
  }

  // Verificar si el usuario está autenticado
  static async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }

  // Obtener el usuario actual
  static async getCurrentUser() {
    try {
      // Obtener la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error de sesión o no autenticado:', sessionError);
        return null;
      }

      // Verificar si el token ha expirado
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        console.log('Token expirado, intentando renovar...');
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Error al renovar sesión:', refreshError);
          await this.logout();
          return null;
        }
      }

      // Obtener el perfil del usuario
      const profile = await this.getUserProfile(session.user.id);
      if (!profile) {
        console.error('Perfil de usuario no encontrado');
        await this.logout();
        return null;
      }

      // Validar que el rol sea válido
      const validRoles = ['admin', 'buyer'];
      if (!validRoles.includes(profile.role?.toLowerCase())) {
        console.error('Rol de usuario no válido:', profile.role);
        await this.logout();
        return null;
      }

      // Devolver un objeto de usuario consistente
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || profile?.name || session.user.email?.split('@')[0] || 'Usuario',
        role: profile.role.toLowerCase(), // Asegurar que el rol esté en minúsculas
        store_id: profile.store_id || null,
        ...session.user,
        profile: profile || {}
      };
      
    } catch (error) {
      console.error('Error al obtener el usuario actual:', error);
      await this.logout();
      return null;
    }
  }

  // Verificar rol del usuario
  static async checkRole(requiredRole) {
    const user = await this.getCurrentUser();
    return user?.role === requiredRole;
  }

  // Escuchar cambios en la autenticación
  static onAuthStateChange(callback) {
    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Cambio en el estado de autenticación:', event);
      
      // Forzar actualización del usuario actual
      if (event === 'SIGNED_OUT') {
        // Limpiar cualquier dato residual
        localStorage.removeItem('sb:token');
        localStorage.removeItem('sb:user');
        
        // Disparar evento personalizado
        window.dispatchEvent(new Event('auth:signout'));
      }
      
      // Llamar al callback original
      callback(event, session);
    });
    
    // Devolver función para cancelar la suscripción
    return () => {
      subscription?.unsubscribe();
    };
  }

  // Verificar token y rol del usuario
  static async verifyTokenAndRole(requiredRole = null) {
    try {
      // Obtener la sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error de sesión o no autenticado:', sessionError);
        await this.logout();
        return { valid: false, error: 'No autenticado' };
      }

      // Verificar si el token ha expirado
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        console.log('Token expirado, intentando renovar...');
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Error al renovar sesión:', refreshError);
          await this.logout();
          return { valid: false, error: 'Sesión expirada' };
        }
      }

      // Obtener el perfil del usuario
      const userProfile = await this.getUserProfile(session.user.id);
      if (!userProfile) {
        console.error('Perfil de usuario no encontrado');
        await this.logout();
        return { valid: false, error: 'Perfil no encontrado' };
      }

      // Si se especificó un rol requerido, verificarlo
      if (requiredRole && userProfile.role !== requiredRole) {
        console.error(`Acceso denegado: Se requiere rol ${requiredRole}, pero el usuario tiene ${userProfile.role}`);
        return { 
          valid: false, 
          error: 'Acceso no autorizado',
          user: {
            ...session.user,
            role: userProfile.role,
            profile: userProfile
          }
        };
      }

      return { 
        valid: true, 
        user: {
          ...session.user,
          role: userProfile.role,
          profile: userProfile
        } 
      };

    } catch (error) {
      console.error('Error en verifyTokenAndRole:', error);
      await this.logout();
      return { valid: false, error: error.message || 'Error de autenticación' };
    }
  }

  // Verificar si el usuario puede acceder a una ruta
  static async canAccessRoute(path) {
    // Si es ruta pública, permitir acceso
    if (isPublicRoute(path)) {
      return { allowed: true };
    }

    // Verificar autenticación y token
    const { valid, user, error } = await this.verifyTokenAndRole();
    if (!valid) {
      return { allowed: false, redirectTo: ROUTES.LOGIN };
    }

    // Verificar roles
    if (isAdminRoute(path) && user.role !== 'admin') {
      return { 
        allowed: false, 
        redirectTo: getDefaultRoute(user.role),
        error: 'Acceso restringido a administradores'
      };
    }

    if (isBuyerRoute(path) && user.role !== 'buyer') {
      return { 
        allowed: false, 
        redirectTo: getDefaultRoute(user.role),
        error: 'Acceso restringido a compradores'
      };
    }

    return { allowed: true, user };
  }

  // Verificar acceso a ruta
  static async checkRouteAccess(path) {
    try {
      // Si es ruta pública, permitir acceso
      if (isPublicRoute(path)) {
        return { allowed: true };
      }

      // Obtener usuario actual
      const user = await this.getCurrentUser();
      
      // Si no hay usuario, denegar acceso
      if (!user) {
        return { 
          allowed: false, 
          redirectTo: ROUTES.LOGIN,
          error: 'Debes iniciar sesión para acceder a esta página'
        };
      }

      const userRole = user.role?.toLowerCase();
      
      // Verificar acceso a rutas de administrador
      if (isAdminRoute(path)) {
        if (userRole !== 'admin') {
          return { 
            allowed: false, 
            redirectTo: getDefaultRoute(userRole) || ROUTES.HOME,
            error: 'Acceso restringido a administradores'
          };
        }
        return { allowed: true, user };
      }
      
      // Verificar acceso a rutas de comprador
      if (isBuyerRoute(path)) {
        if (userRole !== 'buyer') {
          return { 
            allowed: false, 
            redirectTo: getDefaultRoute(userRole) || ROUTES.HOME,
            error: 'Acceso restringido a compradores'
          };
        }
        return { allowed: true, user };
      }

      // Si la ruta no está definida, denegar acceso
      return { 
        allowed: false, 
        redirectTo: getDefaultRoute(userRole) || ROUTES.HOME,
        error: 'Ruta no encontrada'
      };
      
    } catch (error) {
      console.error('Error en checkRouteAccess:', error);
      return { 
        allowed: false, 
        redirectTo: ROUTES.LOGIN,
        error: 'Error al verificar permisos'
      };
    }
  }

  // Iniciar sesión con Google
  static async loginWithGoogle() {
    try {
      console.log('Iniciando autenticación con Google...');
      
      // Obtener la URL base actual
      const baseUrl = window.location.origin;
      
      // Usar la URL de redirección de Supabase para compradores
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: baseUrl, // Redirigir a la raíz, el router manejará la redirección
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Error en login con Google:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error inesperado en login con Google:', error);
      return { success: false, error };
    }
  }

  // Redirigir a Facebook
  static loginWithFacebook() {
    try {
      console.log('Redirigiendo a Facebook...');
      
      // Redirigir directamente a Facebook
      window.location.href = 'https://www.facebook.com';
      
      return { success: true };
    } catch (error) {
      console.error('Error al redirigir a Facebook:', error);
      return { success: false, error };
    }
  }
}
