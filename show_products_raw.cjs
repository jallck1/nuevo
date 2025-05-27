const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function showRawProducts() {
  try {
    console.log('Obteniendo productos...');
    
    // Obtener todos los productos sin filtros
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('\n=== PRODUCTOS ENCONTRADOS ===');
    
    if (!products || products.length === 0) {
      console.log('No se encontraron productos en la base de datos.');
      return;
    }
    
    console.log(`Total de productos: ${products.length}\n`);
    
    // Mostrar los productos en formato JSON para ver toda la estructura
    products.forEach((product, index) => {
      console.log(`Producto #${index + 1}:`);
      console.log(JSON.stringify(product, null, 2));
      console.log('─'.repeat(80));
    });
    
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
  }
}

showRawProducts();
