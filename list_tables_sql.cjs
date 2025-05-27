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
    
    // Consulta SQL directa para listar tablas en PostgreSQL
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      console.error('Error al ejecutar la función RPC:', error);
      
      // Si falla, intentar con una consulta SQL directa
      console.log('\nIntentando con consulta SQL directa...');
      const { data: tables, error: sqlError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      if (sqlError) throw sqlError;
      
      console.log('\n=== TABLAS ENCONTRADAS ===');
      if (tables && tables.length > 0) {
        tables.forEach((table, index) => {
          console.log(`${index + 1}. ${table.tablename}`);
        });
      } else {
        console.log('No se encontraron tablas en el esquema público.');
      }
      return;
    }
    
    console.log('\n=== TABLAS ENCONTRADAS ===');
    if (data && data.length > 0) {
      data.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('No se encontraron tablas en la base de datos.');
    }
    
  } catch (error) {
    console.error('Error al listar tablas:', error.message);
    
    // Intentar una consulta más básica
    try {
      console.log('\nIntentando consulta básica...');
      const { data: tables, error: basicError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
        
      if (basicError) throw basicError;
      
      console.log('La tabla products existe pero puede estar vacía.');
      
    } catch (innerError) {
      console.error('La tabla products no existe o no se puede acceder a ella:', innerError.message);
    }
  }
}

listTables();
