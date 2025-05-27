// Script temporal para mostrar productos de la base de datos
import { supabase } from './js/config/supabase.js';

async function showProducts() {
  try {
    console.log('Obteniendo productos...');
    
    // Obtener el ID de la tienda del usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No hay sesión activa');
      return;
    }
    
    // Obtener el perfil del usuario para obtener el store_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', session.user.id)
      .single();
      
    if (profileError || !profile) {
      console.error('Error al obtener el perfil del usuario:', profileError?.message || 'Perfil no encontrado');
      return;
    }
    
    // Obtener los productos de la tienda
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        category_id (id, name)
      `)
      .eq('store_id', profile.store_id)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    console.log('\n=== PRODUCTOS ENCONTRADOS ===');
    if (!products || products.length === 0) {
      console.log('No se encontraron productos en esta tienda.');
      return;
    }
    
    // Mostrar los productos en la consola
    products.forEach((product, index) => {
      console.log(`\n--- Producto #${index + 1} ---`);
      console.log('ID:', product.id);
      console.log('Nombre:', product.name);
      console.log('Descripción:', product.description || 'Sin descripción');
      console.log('Precio:', product.price);
      console.log('Stock:', product.stock);
      console.log('Categoría:', product.category_id?.name || 'Sin categoría');
      console.log('Estado:', product.status || 'active');
      console.log('Creado:', new Date(product.created_at).toLocaleString());
    });
    
  } catch (error) {
    console.error('Error al obtener productos:', error.message);
  }
}

// Ejecutar la función
showProducts();
