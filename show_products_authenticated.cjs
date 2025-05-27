const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Credenciales de autenticación
const USER_EMAIL = 'teacher@tlux.com';
const USER_PASSWORD = '123456789';

async function loginAndShowProducts() {
  try {
    console.log('Iniciando sesión como:', USER_EMAIL);
    
    // Iniciar sesión
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });
    
    if (authError) {
      console.error('Error al iniciar sesión:', authError.message);
      console.log('Verifica que el correo y la contraseña sean correctos.');
      return;
    }
    
    console.log('✅ Sesión iniciada correctamente');
    console.log('Usuario ID:', authData.user.id);
    
    // Obtener y mostrar información del perfil
    await showProfile(authData.user.id);
    
    // Obtener y mostrar productos
    await showProducts(authData.user.id);
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    // Cerrar sesión al finalizar
    await supabase.auth.signOut();
    console.log('\n🔒 Sesión cerrada');
  }
}

async function showProfile(userId) {
  try {
    console.log('\n📋 Obteniendo información del perfil...');
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    console.log('\n=== PERFIL ===');
    console.log('ID:', profile.id);
    console.log('Nombre completo:', profile.full_name);
    console.log('Rol:', profile.role);
    console.log('Tienda ID:', profile.store_id);
    console.log('Actualizado:', new Date(profile.updated_at).toLocaleString());
    
    // Obtener información de la tienda
    if (profile.store_id) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', profile.store_id)
        .single();
      
      if (!storeError && store) {
        console.log('\n🏪 INFORMACIÓN DE LA TIENDA');
        console.log('Nombre:', store.name);
        console.log('Dirección:', store.address);
        console.log('Creada:', new Date(store.created_at).toLocaleString());
      }
    }
    
  } catch (error) {
    console.error('Error al obtener el perfil:', error.message);
  }
}

async function showProducts(userId) {
  try {
    console.log('\n🔄 Obteniendo productos...');
    
    // 1. Obtener el perfil para saber el store_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    console.log('\n🔍 Buscando productos para la tienda ID:', profile.store_id);
    
    // 2. Obtener los productos del store_id del usuario
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category_id (id, name, description),
        store_id (id, name, address)
      `)
      .eq('store_id', profile.store_id)
      .order('name', { ascending: true });
    
    if (productsError) throw productsError;
    
    console.log('\n=== PRODUCTOS ENCONTRADOS ===');
    
    if (!products || products.length === 0) {
      console.log('No se encontraron productos en esta tienda.');
      return;
    }
    
    console.log(`Total de productos: ${products.length}\n`);
    
    // Mostrar los productos
    products.forEach((product, index) => {
      console.log(`\n🆔 ID: ${product.id}`);
      console.log(`📦 Producto #${index + 1}: ${product.name}`);
      console.log(`   Descripción: ${product.description || 'Sin descripción'}`);
      console.log(`   Precio: $${Number(product.price).toFixed(2)}`);
      console.log(`   Stock: ${product.stock} unidades`);
      console.log(`   SKU: ${product.sku || 'No especificado'}`);
      console.log(`   Impuesto: ${(product.tax_rate * 100).toFixed(2)}%`);
      console.log(`   Descuento: ${(product.discount_percentage * 100).toFixed(2)}%`);
      console.log(`   Estado: ${product.status}`);
      
      if (product.category_id) {
        console.log(`   Categoría: ${product.category_id.name} (${product.category_id.id})`);
      } else {
        console.log('   Categoría: No asignada');
      }
      
      if (product.image_url) {
        console.log(`   Imagen: ${product.image_url}`);
      }
      
      console.log(`   Creado: ${new Date(product.created_at).toLocaleString()}`);
      console.log(`   Actualizado: ${new Date(product.updated_at).toLocaleString()}`);
      console.log('   ' + '─'.repeat(60));
    });
    
  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
  }
}

// Iniciar el proceso
console.log('🚀 Iniciando script de visualización de productos...');
loginAndShowProducts();
