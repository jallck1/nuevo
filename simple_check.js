// Script simple para verificar tablas en Supabase (versión CommonJS)
const { createClient } = require('@supabase/supabase-js');

// Configuración
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseKey);

// Tablas conocidas a verificar
const TABLES_TO_CHECK = [
  'profiles', 'products', 'orders', 'order_items', 
  'categories', 'cart_items', 'payments', 'suppliers'
];

// Función para verificar una tabla
async function checkTable(tableName) {
  try {
    // Intentar contar registros (operación ligera)
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${tableName}: No accesible (${error.message})`);
      return false;
    }
    
    // Si llegamos aquí, la tabla existe y podemos acceder
    console.log(`✅ ${tableName}: ${count || 0} registros`);
    
    // Obtener estructura de columnas (solo si la tabla no está vacía)
    if (count > 0) {
      const { data, error: dataError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (!dataError && data && data.length > 0) {
        console.log(`   Columnas: ${Object.keys(data[0]).join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${tableName}: Error (${error.message})`);
    return false;
  }
}

// Función principal
async function main() {
  console.log('=== VERIFICANDO TABLAS EN SUPABASE ===\n');
  
  for (const table of TABLES_TO_CHECK) {
    await checkTable(table);
  }
  
  console.log('\n=== FIN DE LA VERIFICACIÓN ===');
}

// Ejecutar
main().catch(console.error);
