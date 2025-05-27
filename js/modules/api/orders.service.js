// Servicio para manejar órdenes
export class OrdersService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Obtener todas las órdenes (con filtros opcionales)
    async getOrders(filters = {}) {
        try {
            let query = this.supabase
                .from('orders')
                .select(`
                    *,
                    buyer_id (*),
                    store_id (*),
                    order_items (
                        *,
                        product_id (*)
                    )
                `);

            // Aplicar filtros
            if (filters.buyer_id) {
                query = query.eq('buyer_id', filters.buyer_id);
            }
            if (filters.store_id) {
                query = query.eq('store_id', filters.store_id);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.start_date && filters.end_date) {
                query = query.gte('order_date', filters.start_date).lte('order_date', filters.end_date);
            }

            const { data, error } = await query.order('order_date', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener una orden por ID
    async getOrderById(orderId) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    buyer_id (*),
                    store_id (*),
                    order_items (
                        *,
                        product_id (*)
                    )
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener orden:', error);
            return { success: false, error: error.message };
        }
    }

    // Crear una nueva orden
    async createOrder(orderData) {
        const { items, buyer_id, store_id, shipping_address } = orderData;
        
        try {
            // Calcular total
            const total = items.reduce((sum, item) => {
                return sum + (item.quantity * item.unit_price);
            }, 0);

            // Iniciar transacción
            const { data: order, error: orderError } = await this.supabase
                .rpc('create_order_with_items', {
                    p_buyer_id: buyer_id,
                    p_store_id: store_id,
                    p_shipping_address: shipping_address,
                    p_items: items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    }))
                });

            if (orderError) throw orderError;
            return { success: true, data: order };
        } catch (error) {
            console.error('Error al crear orden:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar estado de una orden
    async updateOrderStatus(orderId, newStatus) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', orderId)
                .select();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al actualizar estado de orden:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener estadísticas de órdenes
    async getOrderStats(storeId = null, startDate = null, endDate = null) {
        try {
            let query = this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true });

            if (storeId) {
                query = query.eq('store_id', storeId);
            }
            
            if (startDate && endDate) {
                query = query.gte('order_date', startDate).lte('order_date', endDate);
            }

            // Contar órdenes por estado
            const { count: total, error: countError } = await query;
            if (countError) throw countError;

            // Obtener total de ventas
            const { data: salesData, error: salesError } = await this.supabase
                .from('orders')
                .select('total_amount')
                .eq('status', 'completada');

            if (salesError) throw salesError;

            const totalSales = salesData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);

            return {
                success: true,
                data: {
                    total_orders: total,
                    total_sales: totalSales,
                    orders_by_status: {
                        pending: 0, // Se puede implementar con consultas adicionales
                        processing: 0,
                        completed: 0,
                        cancelled: 0
                    }
                }
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de órdenes:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener historial de órdenes de un comprador
    async getBuyerOrderHistory(buyerId, limit = 10, offset = 0) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('buyer_id', buyerId)
                .order('order_date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener historial de órdenes:', error);
            return { success: false, error: error.message };
        }
    }
}
