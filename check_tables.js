// Script para consultar la estructura de las tablas en Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para obtener información de las tablas
async function checkTables() {
  try {
    console.log('Obteniendo información de la base de datos...\n');
    
    // 1. Obtener lista de tablas
    console.log('=== TABLAS DISPONIBLES ===');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .ilike('schemaname', 'public');
    
    if (tablesError) throw tablesError;
    
    const tableNames = tables.map(t => t.tablename);
    console.log('Tablas encontradas:', tableNames);
    
    // 2. Para cada tabla, obtener su estructura
    for (const tableName of tableNames) {
      console.log(`\n=== ESTRUCTURA DE ${tableName.toUpperCase()} ===`);
      
      // Obtener estructura de columnas
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName);
      
      if (columnsError) {
        console.error(`Error al obtener columnas de ${tableName}:`, columnsError.message);
        continue;
      }
      
      console.log('Columnas:');
      console.table(columns);
      
      // Obtener políticas de RLS (Row Level Security)
      try {
        const { data: policies, error: policiesError } = await supabase
          .rpc('get_policies', { table_name: tableName });
        
        if (policiesError) throw policiesError;
        
        if (policies && policies.length > 0) {
          console.log('\nPolíticas de seguridad (RLS):');
          console.table(policies);
        } else {
          console.log('\nNo se encontraron políticas de seguridad para esta tabla o no se pueden leer.');
        }
      } catch (rlsError) {
        console.log('\nNo se pudieron obtener las políticas de seguridad:', rlsError.message);
      }
      
      // Obtener índices
      try {
        const { data: indexes, error: indexesError } = await supabase
          .rpc('get_indexes', { table_name: tableName });
        
        if (indexesError) throw indexesError;
        
        if (indexes && indexes.length > 0) {
          console.log('\nÍndices:');
          console.table(indexes);
        }
      } catch (indexError) {
        console.log('\nNo se pudieron obtener los índices:', indexError.message);
      }
      
      // Mostrar un ejemplo de datos (solo si la tabla no es muy grande)
      try {
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sampleError) throw sampleError;
        
        if (sample && sample.length > 0) {
          console.log('\nEjemplo de registro:');
          console.table(sample);
        }
      } catch (sampleError) {
        console.log('\nNo se pudo obtener un ejemplo de datos:', sampleError.message);
      }
    }
    
  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
  }
}

// Ejecutar la función principal
checkTables();
