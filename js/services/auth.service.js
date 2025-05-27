import { supabase } from '../config/supabase.js';
import { ROLES } from '../config/constants.js';
import { showNotification } from '../utils/notifications.js';

export class AuthService {
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
  static async getUserProfile(userId) {
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
        throw profileError;
      }

      console.log('Perfil básico obtenido:', profileData);

      // Si ya tiene un store_id, devolver el perfil
      if (profileData.store_id) {
        console.log('Perfil ya tiene store_id:', profileData.store_id);
        return profileData;
      }

      // Si es administrador, intentar obtener la tienda asociada
      if (profileData.role === 'admin') {
        console.log('Buscando tienda para administrador...');
        
        // Buscar tienda por owner_id (ID del usuario)
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', userId)
          .single();

        if (storeError) {
          console.error('Error al buscar tienda del administrador:', storeError);
          // Si no hay tienda, devolver el perfil sin store_id
          return profileData;
        }

        console.log('Tienda encontrada para administrador:', storeData);

        // Actualizar el perfil con el store_id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            store_id: storeData.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error al actualizar perfil con store_id:', updateError);
          return profileData;
        }

        console.log('Perfil actualizado con store_id:', storeData.id);
        return { ...profileData, store_id: storeData.id };
      }

      // Para otros roles, devolver el perfil tal cual
      return profileData;
      
    } catch (error) {
      console.error('Error en getUserProfile:', error);
      throw error; // Relanzar el error para manejarlo en el método que llama
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
      // Primero verificar si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Obtener el usuario de la sesión
      const { user } = session;
      if (!user) return null;

      // Obtener el perfil del usuario
      const profile = await this.getUserProfile(user.id);
      
      // Devolver un objeto de usuario consistente
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || profile?.name || user.email?.split('@')[0] || 'Usuario',
        role: profile?.role || ROLES.BUYER,
        ...user,
        profile: profile || {}
      };
    } catch (error) {
      console.error('Error al obtener el usuario actual:', error);
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
}
