// Script simple para listar tablas en Supabase
// Solo realiza consultas de lectura básicas

// Importar Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuración
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Crear cliente
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para listar tablas
async function listTables() {
  try {
    console.log('=== TABLAS DISPONIBLES ===');
    
    // Intentar con una consulta directa a information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('Tablas encontradas:');
      data.forEach(table => console.log(`- ${table.table_name}`));
    } else {
      console.log('No se encontraron tablas o no se tienen permisos.');
    }
    
  } catch (error) {
    console.error('Error al listar tablas:', error.message);
    console.log('\n=== MÉTODO ALTERNATIVO ===');
    await tryAlternativeMethod();
  }
}

// Método alternativo para tablas conocidas
async function tryAlternativeMethod() {
  console.log('Intentando con tablas conocidas...');
  
  const knownTables = [
    'profiles', 'products', 'orders', 'order_items', 
    'categories', 'cart_items', 'payments', 'suppliers'
  ];
  
  for (const table of knownTables) {
    try {
      // Intentar contar registros para verificar si la tabla existe
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`- ${table} (${count || 0} registros)`);
      }
    } catch (e) {
      // La tabla probablemente no existe o no tenemos acceso
    }
  }
}

// Ejecutar
listTables();
