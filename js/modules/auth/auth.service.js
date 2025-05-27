// Servicio de autenticación
export class AuthService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Iniciar sesión con email y contraseña
    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            return { success: false, error: error.message };
        }
    }

    // Registrar nuevo usuario
    async register(email, password, userData) {
        try {
            // Crear usuario en Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.name
                    }
                }
            });

            if (authError) throw authError;

            // Crear perfil en la base de datos
            const { data: profileData, error: profileError } = await this.supabase
                .from('profiles')
                .insert([
                    { 
                        id: authData.user.id,
                        email,
                        name: userData.name,
                        role: userData.role || 'buyer',
                        store_id: userData.store_id || null,
                        credit_assigned: 0,
                        credit_used: 0,
                        status: 'active',
                        join_date: new Date().toISOString()
                    }
                ]);

            if (profileError) throw profileError;

            return { success: true, data: authData };
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            return { success: false, error: error.message };
        }
    }

    // Cerrar sesión
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener perfil del usuario actual
    async getProfile() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return { success: true, data: profile };
        } catch (error) {
            console.error('Error al obtener perfil:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar perfil
    async updateProfile(updates) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            const { data, error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            return { success: false, error: error.message };
        }
    }

    // Verificar sesión
    async checkAuth() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error || !user) {
                return { isAuthenticated: false };
            }

            const { data: profile, error: profileError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            return {
                isAuthenticated: true,
                user: {
                    ...user,
                    profile
                }
            };
        } catch (error) {
            console.error('Error al verificar autenticación:', error);
            return { isAuthenticated: false, error: error.message };
        }
    }

    // Restablecer contraseña
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error al enviar correo de restablecimiento:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar contraseña
    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            return { success: false, error: error.message };
        }
    }
}
