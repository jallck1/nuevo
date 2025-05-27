/**
 * Sincroniza el rol de un usuario entre la tabla profiles y auth.users
 * @param {string} userId - ID del usuario a sincronizar
 * @param {string} newRole - Nuevo rol del usuario
 */
async function syncUserRole(userId, newRole) {
    try {
        console.log(`Sincronizando rol para usuario ${userId} a ${newRole}`);
        
        // Verificar que el usuario sea administrador
        const { data: { user }, error: userError } = await window.supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('No se pudo verificar la autenticación');
        }
        
        // Verificar que el usuario que hace la solicitud sea administrador
        const { data: currentUserProfile, error: profileError } = await window.supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !currentUserProfile || currentUserProfile.role !== 'admin') {
            throw new Error('No tienes permisos para realizar esta acción');
        }
        
        // Actualizar el rol en auth.users usando el cliente de administración
        const { data, error } = await window.adminSupabase.auth.admin.updateUserById(userId, {
            user_metadata: {
                user_role: newRole,
                email_verified: true,
                is_super_admin: newRole === 'admin'
            }
        });
        
        if (error) {
            console.error('Error al actualizar el rol en auth.users:', error);
            throw new Error('No se pudo actualizar el rol del usuario');
        }
        
        console.log('Rol actualizado exitosamente en auth.users:', data);
        return data;
    } catch (error) {
        console.error('Error en syncUserRole:', error);
        throw error;
    }
}

// Hacer la función disponible globalmente
window.syncUserRole = syncUserRole;
