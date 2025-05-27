// Servicio para manejar categorías
export class CategoriesService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Obtener todas las categorías
    async getCategories(storeId = null) {
        try {
            let query = this.supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (storeId) {
                query = query.eq('store_id', storeId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener una categoría por ID
    async getCategoryById(categoryId) {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .select('*')
                .eq('id', categoryId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener categoría:', error);
            return { success: false, error: error.message };
        }
    }

    // Crear una nueva categoría
    async createCategory(categoryData) {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .insert([{
                    ...categoryData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al crear categoría:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar una categoría
    async updateCategory(categoryId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', categoryId)
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error al actualizar categoría:', error);
            return { success: false, error: error.message };
        }
    }

    // Eliminar una categoría
    async deleteCategory(categoryId) {
        try {
            // Verificar si hay productos en esta categoría
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('id')
                .eq('category_id', categoryId)
                .limit(1);

            if (productsError) throw productsError;
            
            if (products && products.length > 0) {
                return { 
                    success: false, 
                    error: 'No se puede eliminar la categoría porque tiene productos asociados' 
                };
            }

            // Si no hay productos, eliminar la categoría
            const { error } = await this.supabase
                .from('categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener estadísticas de categorías
    async getCategoryStats(storeId = null) {
        try {
            // Obtener todas las categorías con conteo de productos
            let query = this.supabase
                .from('categories')
                .select(`
                    *,
                    products:products (id)
                `, { count: 'exact' });

            if (storeId) {
                query = query.eq('store_id', storeId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Procesar datos para incluir conteo de productos
            const categoriesWithStats = data.map(category => ({
                ...category,
                product_count: category.products ? category.products.length : 0
            }));

            return { success: true, data: categoriesWithStats };
        } catch (error) {
            console.error('Error al obtener estadísticas de categorías:', error);
            return { success: false, error: error.message };
        }
    }
}
