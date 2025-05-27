// Servicio para manejar tiendas
export class StoresService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Obtener todas las tiendas
    async getStores(filters = {}) {
        try {
            let query = this.supabase
                .from('stores')
                .select('*')
                .order('name', { ascending: true });

            // Aplicar filtros
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener tiendas:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener una tienda por ID
    async getStoreById(storeId) {
        try {
            const { data, error } = await this.supabase
                .from('stores')
                .select(`
                    *,
                    users:profiles(*)
                `)
                .eq('id', storeId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Crear una nueva tienda
    async createStore(storeData) {
        try {
            const { data, error } = await this.supabase
                .from('stores')
                .insert([{
                    ...storeData,
                    status: storeData.status || 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al crear tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar una tienda
    async updateStore(storeId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('stores')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', storeId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al actualizar tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Eliminar una tienda (cambiar estado a inactivo)
    async deleteStore(storeId) {
        try {
            // Verificar si hay productos en esta tienda
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('id')
                .eq('store_id', storeId)
                .limit(1);

            if (productsError) throw productsError;
            
            if (products && products.length > 0) {
                return { 
                    success: false, 
                    error: 'No se puede eliminar la tienda porque tiene productos asociados' 
                };
            }


            // Cambiar estado a inactivo en lugar de eliminar
            const { data, error } = await this.supabase
                .from('stores')
                .update({ 
                    status: 'inactive',
                    updated_at: new Date().toISOString() 
                })
                .eq('id', storeId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al eliminar tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener estadísticas de la tienda
    async getStoreStats(storeId) {
        try {
            // Obtener total de productos
            const { count: productCount, error: productError } = await this.supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId);

            if (productError) throw productError;

            // Obtener total de categorías
            const { count: categoryCount, error: categoryError } = await this.supabase
                .from('categories')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId);

            if (categoryError) throw categoryError;

            // Obtener total de órdenes
            const { count: orderCount, error: orderError } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId);

            if (orderError) throw orderError;

            // Obtener total de ventas
            const { data: salesData, error: salesError } = await this.supabase
                .from('orders')
                .select('total_amount')
                .eq('store_id', storeId)
                .eq('status', 'completada');

            if (salesError) throw salesError;

            const totalSales = salesData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);

            return {
                success: true,
                data: {
                    total_products: productCount || 0,
                    total_categories: categoryCount || 0,
                    total_orders: orderCount || 0,
                    total_sales: totalSales,
                    // Agregar más estadísticas según sea necesario
                }
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de la tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener usuarios asociados a una tienda
    async getStoreUsers(storeId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('store_id', storeId);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener usuarios de la tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Agregar usuario a una tienda
    async addUserToStore(storeId, userId, role = 'staff') {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .update({
                    store_id: storeId,
                    role: role,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al agregar usuario a la tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Remover usuario de una tienda
    async removeUserFromStore(userId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .update({
                    store_id: null,
                    role: 'buyer',
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al remover usuario de la tienda:', error);
            return { success: false, error: error.message };
        }
    }
}
