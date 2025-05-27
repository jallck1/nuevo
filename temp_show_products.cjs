// Script temporal para mostrar productos de la base de datos
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function showProducts() {
  try {
    console.log('Obteniendo productos...');
    
    // Obtener información básica de todas las tiendas
    const { data: allStores, error: storesListError } = await supabase
      .from('stores')
      .select('id, name')
      .order('name', { ascending: true });
      
    if (storesListError) throw storesListError;
    
    if (!allStores || allStores.length === 0) {
      console.log('No se encontraron tiendas en la base de datos.');
      return;
    }
    
    console.log('\n=== TIENDAS ENCONTRADAS ===');
    allStores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name} (ID: ${store.id})`);
    });
    
    // Primero, obtener todas las tiendas con sus productos
    console.log('\nObteniendo productos con información de tienda...');
    
    // 1. Obtener todos los productos con categoría
    const { data: allProducts, error } = await supabase
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
    
    if (error) {
      console.error('Error en la consulta de productos:', error);
      throw error;
    }
    
    // 2. Obtener información de las tiendas
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, address, phone, email')
      .in('id', allProducts.map(p => p.store_id).filter(Boolean));
      
    if (storesError) {
      console.error('Error al obtener tiendas:', storesError);
      throw storesError;
    }
    
    // 3. Mapear tiendas a un objeto para acceso rápido
    const storesMap = {};
    stores.forEach(store => {
      storesMap[store.id] = store;
    });
    
    // 4. Añadir información de la tienda a cada producto
    allProducts.forEach(product => {
      if (product.store_id && storesMap[product.store_id]) {
        product.store = storesMap[product.store_id];
      } else {
        product.store = { name: 'Tienda Desconocida', id: product.store_id };
      }
    });
    
    console.log('\n=== PRODUCTOS ENCONTRADOS ===');
    if (!allProducts || allProducts.length === 0) {
      console.log('No se encontraron productos en la base de datos.');
      return;
    }
    
    // Agrupar productos por tienda
    const productsByStore = {};
    allProducts.forEach(product => {
      const storeId = product.store_id || 'sin-tienda';
      if (!productsByStore[storeId]) {
        productsByStore[storeId] = {
          store: product.store || { id: storeId, name: 'Tienda Desconocida' },
          products: []
        };
      }
      productsByStore[storeId].products.push(product);
    });
    
    // Mostrar los productos agrupados por tienda
    console.log(`\n=== RESUMEN ===`);
    console.log(`Total de tiendas con productos: ${Object.keys(productsByStore).length}`);
    console.log(`Total de productos encontrados: ${allProducts.length}\n`);
    
    // Mostrar cada tienda con sus productos
    Object.entries(productsByStore).forEach(([storeId, storeData], storeIndex) => {
      const store = storeData.store;
      const products = storeData.products;
      
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║ TIENDA #${storeIndex + 1}: ${store.name.padEnd(30, ' ')}║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║ ID: ${store.id.padEnd(35)}║`);
      if (store.address) console.log(`║ Dirección: ${store.address.padEnd(28)}║`);
      if (store.phone) console.log(`║ Teléfono: ${store.phone.padEnd(30)}║`);
      if (store.email) console.log(`║ Email: ${store.email.padEnd(33)}║`);
      console.log(`║ Productos: ${String(products.length).padEnd(29)}║`);
      console.log(`╚════════════════════════════════════════╝`);
      
      // Mostrar productos de esta tienda
      console.log(`\n  PRODUCTOS (${products.length}):`);
      console.log('  ' + '─'.repeat(80));
      
      products.forEach((product, productIndex) => {
        console.log(`  #${String(productIndex + 1).padStart(2, '0')} [${product.id}] ${product.name}`);
        console.log(`     Precio: $${product.price.toFixed(2)}`);
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
    console.log(`• Total de tiendas: ${allStores.length}`);
    console.log(`• Tiendas con productos: ${Object.keys(productsByStore).length}`);
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

// Ejecutar la función
showProducts();
