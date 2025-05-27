const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Credenciales
const USER_EMAIL = 'teacher@tlux.com';
const USER_PASSWORD = '123456789';

async function checkProducts() {
  try {
    console.log('🔍 Iniciando verificación de productos...');
    
    // 1. Iniciar sesión
    console.log('\n🔑 Iniciando sesión...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });
    
    if (authError) {
      console.error('❌ Error al iniciar sesión:', authError.message);
      return;
    }
    
    console.log('✅ Sesión iniciada correctamente');
    console.log('   Usuario ID:', authData.user.id);
    
    // 2. Obtener perfil del usuario
    console.log('\n👤 Obteniendo perfil del usuario...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (profileError) throw profileError;
    
    console.log('✅ Perfil obtenido');
    console.log('   Nombre:', profile.name || 'No especificado');
    console.log('   Rol:', profile.role);
    console.log('   Tienda ID:', profile.store_id);
    
    if (!profile.store_id) {
      console.error('❌ El usuario no tiene una tienda asignada');
      return;
    }
    
    // 3. Obtener información de la tienda
    console.log('\n🏪 Obteniendo información de la tienda...');
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', profile.store_id)
      .single();
      
    if (storeError) throw storeError;
    
    console.log('✅ Información de la tienda:');
    console.log('   Nombre:', store.name);
    console.log('   Dirección:', store.address || 'No especificada');
    console.log('   Creada:', new Date(store.created_at).toLocaleString());
    
    // 4. Obtener productos de la tienda
    console.log('\n📦 Obteniendo productos de la tienda...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category_id (id, name, description)
      `)
      .eq('store_id', profile.store_id)
      .order('name', { ascending: true });
      
    if (productsError) throw productsError;
    
    console.log(`\n📊 Total de productos encontrados: ${products.length}`);
    
    if (products.length === 0) {
      console.log('ℹ️ No se encontraron productos en esta tienda.');
      return;
    }
    
    // Mostrar información detallada de los productos
    console.log('\n📝 Lista de productos:');
    console.log('='.repeat(80));
    
    products.forEach((product, index) => {
      console.log(`\n🆔 ID: ${product.id}`);
      console.log(`📦 ${index + 1}. ${product.name}`);
      console.log(`   Descripción: ${product.description || 'Sin descripción'}`);
      console.log(`   Precio: $${parseFloat(product.price || 0).toFixed(2)}`);
      console.log(`   Stock: ${product.stock || 0} unidades`);
      console.log(`   Estado: ${product.status || 'Activo'}`);
      console.log(`   Categoría: ${product.category_id?.name || 'Sin categoría'}`);
      console.log(`   Creado: ${new Date(product.created_at).toLocaleString()}`);
      
      if (product.image_url) {
        console.log(`   Imagen: ${product.image_url}`);
      }
      
      console.log('-' + '-'.repeat(79));
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Detalles:', error);
  } finally {
    // Cerrar sesión al finalizar
    await supabase.auth.signOut();
    console.log('\n🔒 Sesión cerrada');
  }
}

// Ejecutar la verificación
checkProducts();
