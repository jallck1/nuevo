// Configuración de Supabase
const SUPABASE_URL = 'https://tu-proyecto-supabase.supabase.co';
const SUPABASE_ANON_KEY = 'tu-clave-anon-supabase';

// Hacer las variables globales
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// También exportar para compatibilidad con módulos
if (typeof exports !== 'undefined') {
    exports.SUPABASE_URL = SUPABASE_URL;
    exports.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
