const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function checkStoresTable() {
  try {
    console.log('Obteniendo información de la tabla stores...');
    
    // Obtener una tienda de ejemplo para ver su estructura
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .limit(1)
      .single();
      
    if (error) throw error;
    
    if (!store) {
      console.log('No se encontraron tiendas en la base de datos.');
      return;
    }
    
    console.log('\n=== ESTRUCTURA DE LA TABLA STORES ===');
    console.log('Columnas encontradas:');
    Object.keys(store).forEach(key => {
      console.log(`- ${key}: ${typeof store[key]}`);
    });
    
    console.log('\n=== EJEMPLO DE TIENDA ===');
    console.log(store);
    
  } catch (error) {
    console.error('Error al verificar la tabla stores:', error.message);
  }
}

checkStoresTable();
