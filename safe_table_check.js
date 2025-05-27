// Script seguro para verificar la estructura de las tablas en Supabase
// Solo realiza consultas de lectura y no modifica datos

// Configuración de Supabase
const SUPABASE_URL = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Función para obtener información de las tablas de forma segura
async function checkTablesSafely() {
  try {
    console.log('=== INICIO DE VERIFICACIÓN SEGURA ===\n');
    
    // 1. Verificar conexión con Supabase
    console.log('Conectando a Supabase...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 2. Obtener lista de tablas usando una función segura
    console.log('\n=== TABLAS DISPONIBLES ===');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_info');
    
    if (tablesError) {
      console.log('No se pudo obtener la lista de tablas usando RPC. Intentando método alternativo...');
      await checkTablesAlternative(supabase);
      return;
    }
    
    if (tables && tables.length > 0) {
      console.log('Tablas encontradas:');
      console.table(tables);
      
      // 3. Para cada tabla, obtener información básica
      for (const table of tables) {
        console.log(`\n=== INFORMACIÓN DE ${table.table_name.toUpperCase()} ===`);
        
        // Obtener estructura de columnas usando RPC
        const { data: columns, error: columnsError } = await supabase
          .rpc('get_columns_info', { table_name: table.table_name });
        
        if (columnsError) {
          console.log(`No se pudo obtener la estructura de ${table.table_name}`);
          continue;
        }
        
        console.log('\nColumnas:');
        console.table(columns);
        
        // Obtener conteo de registros (solo si la tabla no es muy grande)
        try {
          const { count, error: countError } = await supabase
            .from(table.table_name)
            .select('*', { count: 'exact', head: true });
            
          if (!countError) {
            console.log(`\nNúmero de registros: ${count}`);
          }
        } catch (e) {
          console.log('No se pudo obtener el conteo de registros');
        }
      }
    } else {
      console.log('No se encontraron tablas o no se tienen permisos para verlas.');
    }
    
  } catch (error) {
    console.error('Error durante la verificación:', error.message);
  } finally {
    console.log('\n=== FIN DE LA VERIFICACIÓN ===');
  }
}

// Método alternativo si falla el RPC
async function checkTablesAlternative(supabase) {
  try {
    console.log('\n=== MÉTODO ALTERNATIVO ===');
    
    // Intentar con una consulta directa a una tabla conocida
    const knownTables = ['profiles', 'products', 'orders', 'order_items', 'categories'];
    
    for (const tableName of knownTables) {
      try {
        console.log(`\nVerificando tabla: ${tableName}`);
        
        // Obtener un solo registro para verificar la estructura
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`- No se pudo acceder a ${tableName}`);
          continue;
        }
        
        if (data && data.length > 0) {
          console.log(`- Estructura de ${tableName}:`);
          console.table(Object.keys(data[0]));
        } else {
          console.log(`- ${tableName} existe pero está vacía`);
        }
      } catch (e) {
        console.log(`- Error al verificar ${tableName}:`, e.message);
      }
    }
    
  } catch (error) {
    console.error('Error en el método alternativo:', error.message);
  }
}

// Ejecutar la verificación segura
checkTablesSafely();
