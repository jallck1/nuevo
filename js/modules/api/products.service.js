// Servicio para manejar productos
export class ProductsService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    /**
     * Obtiene los productos según los filtros especificados
     * @param {Object} filters - Filtros para la consulta
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    async getProducts(filters = {}) {
        try {
            console.log('🔍 [ProductsService] Iniciando consulta de productos con filtros:', JSON.stringify(filters, null, 2));
            
            // Construir la consulta base - Usando la misma estructura que show_products_fixed.cjs
            let query = this.supabase
                .from('products')
                .select(`
                    id,
                    name,
                    description,
                    price,
                    stock,
                    status,
                    created_at,
                    category_id (id, name, description, image_url),
                    store_id
                `);

            // Aplicar filtros
            if (filters.store_id) {
                console.log(`🔍 [ProductsService] Aplicando filtro de tienda: ${filters.store_id}`);
                query = query.eq('store_id', filters.store_id);
            }
            
            if (filters.category_id) {
                console.log(`🔍 [ProductsService] Aplicando filtro de categoría: ${filters.category_id}`);
                query = query.eq('category_id', filters.category_id);
            }
            
            if (filters.status) {
                console.log(`🔍 [ProductsService] Aplicando filtro de estado: ${filters.status}`);
                query = query.eq('status', filters.status);
            } else {
                // Por defecto, solo productos activos
                query = query.eq('status', 'active');
            }
            
            if (filters.search) {
                console.log(`🔍 [ProductsService] Aplicando búsqueda: ${filters.search}`);
                query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }

            // Ordenar
            const orderBy = filters.orderBy || 'name';
            const orderAsc = filters.orderAsc === false ? false : true;
            
            console.log(`🔍 [ProductsService] Aplicando ordenación: ${orderBy} (${orderAsc ? 'asc' : 'desc'})`);
            query = query.order(orderBy, { ascending: orderAsc });

            // Paginación
            const limit = filters.limit || 100; // Límite por defecto
            const offset = filters.offset || 0;
            console.log(`🔍 [ProductsService] Aplicando paginación: limit=${limit}, offset=${offset}`);
            query = query.range(offset, offset + limit - 1);

            // Ejecutar la consulta
            console.log('🚀 [ProductsService] Ejecutando consulta a la base de datos...');
            const { data, error, status, statusText } = await query;

            if (error) {
                console.error('❌ [ProductsService] Error en la consulta:', { 
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    status,
                    statusText
                });
                throw error;
            }

            // Verificar si no hay datos
            if (!data || data.length === 0) {
                console.log('ℹ️ [ProductsService] No se encontraron productos con los filtros proporcionados');
                return { 
                    success: true, 
                    data: [] 
                };
            }

            console.log(`✅ [ProductsService] Consulta exitosa. ${data.length} productos encontrados`);
            
            // Procesar los datos para asegurar un formato consistente
            const processedData = data.map(item => {
                // Asegurar que category sea siempre un objeto
                const category = item.category_id || {};
                const store = { id: item.store_id };
                
                // Devolver el producto con la estructura esperada
                return {
                    id: item.id,
                    name: item.name || 'Producto sin nombre',
                    description: item.description || '',
                    price: parseFloat(item.price) || 0,
                    stock: parseInt(item.stock, 10) || 0,
                    status: item.status || 'active',
                    created_at: item.created_at,
                    category_id: category.id || null,
                    store_id: store.id || null,
                    // Mantener compatibilidad con el código existente
                    category: category,
                    store: store,
                    // Asegurar que la imagen tenga una URL por defecto si no hay imagen
                    image_url: item.image_url || 'https://via.placeholder.com/300x200?text=Sin+imagen'
                };
            });

            return { 
                success: true, 
                data: processedData 
            };
            
        } catch (error) {
            const errorMsg = error.message || 'Error desconocido al cargar los productos';
            console.error('❌ Error al obtener productos:', {
                message: errorMsg,
                code: error.code,
                details: error.details,
                hint: error.hint,
                stack: error.stack
            });
            
            // Enviar notificación de error
            if (typeof window !== 'undefined' && window.showNotification) {
                window.showNotification(`Error al cargar productos: ${errorMsg}`, 'error');
            }
            
            return { 
                success: false, 
                error: errorMsg
            };
        }
    }

    // Obtener un producto por ID
    async getProductById(productId) {
        try {
            // Verificar autenticación
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session) {
                throw new Error('Usuario no autenticado');
            }
            
            // Obtener el store_id del usuario
            const { data: profile, error: profileError } = await this.supabase
                .from('profiles')
                .select('store_id, role')
                .eq('id', session.user.id)
                .single();
                
            if (profileError) throw profileError;
            
            // Obtener el producto con las relaciones necesarias
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    category_id (id, name, description, image_url),
                    store_id (id, name, address)
                `)
                .eq('id', productId)
                .eq('store_id', profile.store_id) // Asegurar que el producto pertenezca a la tienda del usuario
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener producto:', error);
            return { success: false, error: error.message };
        }
    }

    // Crear un nuevo producto
    async createProduct(productData) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .insert([{
                    ...productData,
                    status: productData.status || 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al crear producto:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar un producto
    async updateProduct(productId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al actualizar producto:', error);
            return { success: false, error: error.message };
        }
    }

    // Eliminar un producto (cambiar estado a inactivo)
    async deleteProduct(productId) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .update({ 
                    status: 'inactive',
                    updated_at: new Date().toISOString() 
                })
                .eq('id', productId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar stock de un producto
    async updateStock(productId, quantityChange, action = 'add') {
        try {
            // Obtener stock actual
            const { data: product, error: fetchError } = await this.supabase
                .from('products')
                .select('stock')
                .eq('id', productId)
                .single();

            if (fetchError) throw fetchError;

            // Calcular nuevo stock
            let newStock = product.stock;
            if (action === 'add') {
                newStock += quantityChange;
            } else if (action === 'subtract') {
                newStock = Math.max(0, newStock - quantityChange);
            }

            // Actualizar stock
            const { data, error } = await this.supabase
                .from('products')
                .update({ 
                    stock: newStock,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', productId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener productos por categoría
    async getProductsByCategory(categoryId, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('category_id', categoryId)
                .eq('status', 'active')
                .order('name', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener productos por categoría:', error);
            return { success: false, error: error.message };
        }
    }

    // Buscar productos por término
    async searchProducts(term, storeId = null) {
        try {
            let query = this.supabase
                .from('products')
                .select('*')
                .ilike('name', `%${term}%`)
                .eq('status', 'active')
                .limit(10);

            if (storeId) {
                query = query.eq('store_id', storeId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al buscar productos:', error);
            return { success: false, error: error.message };
        }
    }
}
