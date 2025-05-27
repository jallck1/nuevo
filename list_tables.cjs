const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function listTables() {
  try {
    console.log('Obteniendo lista de tablas...');
    
    // Usar la vista information_schema.tables para listar las tablas
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public');
    
    if (error) throw error;
    
    console.log('\n=== TABLAS ENCONTRADAS ===');
    
    if (!tables || tables.length === 0) {
      console.log('No se encontraron tablas en la base de datos.');
      return;
    }
    
    console.log(`Total de tablas: ${tables.length}\n`);
    
    // Mostrar las tablas ordenadas por nombre
    tables
      .sort((a, b) => a.table_name.localeCompare(b.table_name))
      .forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name} (${table.table_type})`);
      });
      
    // Mostrar conteo de registros por tabla
    console.log('\n=== CANTIDAD DE REGISTROS POR TABLA ===');
    
    for (const table of tables) {
      const tableName = table.table_name;
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`${tableName}: ${count} registros`);
      } else {
        console.log(`${tableName}: No se pudo obtener el conteo (${countError.message})`);
      }
    }
    
  } catch (error) {
    console.error('Error al listar tablas:', error.message);
  }
}

listTables();
