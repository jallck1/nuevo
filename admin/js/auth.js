// Configuración de Supabase
const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar autenticación y rol
async function checkAuthAndRole(requiredRole = 'admin') {
    try {
        // Verificar si hay una sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        // Si no hay sesión, redirigir al login
        if (!session) {
            window.location.href = 'login.html';
            return { isAuthenticated: false };
        }
        
        // Obtener el perfil del usuario
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
        if (userError) throw userError;
        
        // Verificar si el usuario tiene el rol requerido
        if (userData.role !== requiredRole) {
            // Redirigir al dashboard correspondiente según el rol
            if (userData.role === 'buyer') {
                window.location.href = '../buyer/dashboard.html';
            } else {
                window.location.href = 'login.html';
            }
            return { isAuthenticated: false };
        }
        
        return { 
            isAuthenticated: true, 
            user: {
                ...session.user,
                role: userData.role
            } 
        };
        
    } catch (error) {
        console.error('Error en autenticación:', error);
        window.location.href = 'login.html';
        return { isAuthenticated: false };
    }
}

// Cerrar sesión
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Exportar funciones
export { supabase, checkAuthAndRole, logout };
