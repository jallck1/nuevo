const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function showProducts() {
  try {
    console.log('Obteniendo productos...');
    
    // 1. Obtener todos los productos con categoría
    console.log('\nObteniendo productos con información de tienda...');
    
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock,
        status,
        created_at,
        category_id (id, name),
        store_id
      `)
      .order('store_id', { ascending: true })
      .order('name', { ascending: true });
    
    if (productsError) throw productsError;
    
    if (!allProducts || allProducts.length === 0) {
      console.log('No se encontraron productos en la base de datos.');
      return;
    }
    
    // 2. Obtener información de las tiendas únicas
    const storeIds = [...new Set(allProducts.map(p => p.store_id).filter(Boolean))];
    let storesMap = {};
    
    if (storeIds.length > 0) {
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name, address')
        .in('id', storeIds);
        
      if (storesError) throw storesError;
      
      // Crear mapa de tiendas para acceso rápido
      stores.forEach(store => {
        storesMap[store.id] = store;
      });
    }
    
    // 3. Agrupar productos por tienda
    const productsByStore = {};
    allProducts.forEach(product => {
      const storeId = product.store_id || 'sin-tienda';
      if (!productsByStore[storeId]) {
        const storeInfo = storesMap[storeId] || { id: storeId, name: 'Tienda Desconocida' };
        productsByStore[storeId] = {
          store: storeInfo,
          products: []
        };
      }
      productsByStore[storeId].products.push(product);
    });
    
    // 4. Mostrar resultados
    console.log('\n=== RESUMEN ===');
    console.log(`Total de tiendas con productos: ${Object.keys(productsByStore).length}`);
    console.log(`Total de productos encontrados: ${allProducts.length}\n`);
    
    // Mostrar cada tienda con sus productos
    Object.entries(productsByStore).forEach(([storeId, storeData], storeIndex) => {
      const store = storeData.store;
      const products = storeData.products;
      
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║ TIENDA #${storeIndex + 1}: ${(store.name || 'Sin nombre').padEnd(30, ' ')}║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║ ID: ${store.id.padEnd(35)}║`);
      if (store.address) console.log(`║ Dirección: ${String(store.address).padEnd(28)}║`);
      console.log(`║ Productos: ${String(products.length).padEnd(29)}║`);
      console.log(`╚════════════════════════════════════════╝`);
      
      // Mostrar productos de esta tienda
      console.log(`\n  PRODUCTOS (${products.length}):`);
      console.log('  ' + '─'.repeat(80));
      
      products.forEach((product, productIndex) => {
        console.log(`  #${String(productIndex + 1).padStart(2, '0')} [${product.id}] ${product.name}`);
        console.log(`     Precio: $${Number(product.price).toFixed(2)}`);
        console.log(`     Stock: ${product.stock}`);
        console.log(`     Categoría: ${product.category_id?.name || 'Sin categoría'}`);
        console.log(`     Estado: ${product.status || 'active'}`);
        if (product.description) {
          // Mostrar descripción en múltiples líneas si es necesario
          const descLines = product.description.match(/.{1,70}(\s|$)/g) || [];
          console.log(`     Descripción: ${descLines[0]?.trim() || ''}`);
          for (let i = 1; i < descLines.length; i++) {
            console.log(`                 ${descLines[i].trim()}`);
          }
        }
        console.log(`     Creado: ${new Date(product.created_at).toLocaleString()}`);
        if (productIndex < products.length - 1) {
          console.log('     ' + '─'.repeat(40));
        }
      });
      
      console.log('\n' + '═'.repeat(80));
    });
    
    // Mostrar resumen final
    console.log('\n=== RESUMEN FINAL ===');
    console.log(`• Total de tiendas con productos: ${Object.keys(productsByStore).length}`);
    console.log(`• Total de productos: ${allProducts.length}`);
    
    // Mostrar estadísticas por tienda
    console.log('\nPRODUCTOS POR TIENDA:');
    Object.entries(productsByStore).forEach(([storeId, storeData]) => {
      const store = storeData.store;
      console.log(`• ${store.name}: ${storeData.products.length} productos`);
    });
    
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
  }
}

showProducts();
