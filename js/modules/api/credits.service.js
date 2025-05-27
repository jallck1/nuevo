// Servicio para manejar créditos
export class CreditsService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Obtener saldo de crédito de un usuario
    async getUserCredit(userId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('credit_balance')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { 
                success: true, 
                data: { 
                    balance: data.credit_balance || 0,
                    user_id: userId
                } 
            };
        } catch (error) {
            console.error('Error al obtener saldo de crédito:', error);
            return { success: false, error: error.message };
        }
    }

    // Agregar crédito a un usuario
    async addCredit(userId, amount, reason = '', reference = '') {
        try {
            if (amount <= 0) {
                return { 
                    success: false, 
                    error: 'El monto debe ser mayor a cero' 
                };
            }


            // Iniciar transacción
            const { data, error } = await this.supabase.rpc('add_credit_transaction', {
                p_user_id: userId,
                p_amount: amount,
                p_reason: reason,
                p_reference: reference
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al agregar crédito:', error);
            return { success: false, error: error.message };
        }
    }

    // Descontar crédito de un usuario
    async deductCredit(userId, amount, reason = '', reference = '') {
        try {
            if (amount <= 0) {
                return { 
                    success: false, 
                    error: 'El monto debe ser mayor a cero' 
                };
            }


            // Verificar saldo suficiente
            const { data: creditData, error: creditError } = await this.getUserCredit(userId);
            if (creditError) throw creditError;

            if (creditData.data.balance < amount) {
                return { 
                    success: false, 
                    error: 'Saldo insuficiente' 
                };
            }

            // Iniciar transacción
            const { data, error } = await this.supabase.rpc('deduct_credit_transaction', {
                p_user_id: userId,
                p_amount: amount,
                p_reason: reason,
                p_reference: reference
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al descontar crédito:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener historial de transacciones de crédito
    async getCreditHistory(userId, filters = {}) {
        try {
            let query = this.supabase
                .from('credit_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters.type) {
                query = query.eq('transaction_type', filters.type);
            }
            if (filters.start_date && filters.end_date) {
                query = query.gte('created_at', filters.start_date)
                           .lte('created_at', filters.end_date);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener historial de créditos:', error);
            return { success: false, error: error.message };
        }
    }

    // Transferir créditos entre usuarios
    async transferCredits(fromUserId, toUserId, amount, reason = '') {
        try {
            if (amount <= 0) {
                return { 
                    success: false, 
                    error: 'El monto debe ser mayor a cero' 
                };
            }


            // Verificar que el remitente tenga saldo suficiente
            const { data: senderCredit, error: senderError } = await this.getUserCredit(fromUserId);
            if (senderError) throw senderError;

            if (senderCredit.data.balance < amount) {
                return { 
                    success: false, 
                    error: 'Saldo insuficiente para realizar la transferencia' 
                };
            }

            // Iniciar transacción de transferencia
            const { data, error } = await this.supabase.rpc('transfer_credits', {
                p_from_user_id: fromUserId,
                p_to_user_id: toUserId,
                p_amount: amount,
                p_reason: reason
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al transferir créditos:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener resumen de créditos por tienda (para administradores)
    async getStoreCreditsSummary(storeId) {
        try {
            const { data, error } = await this.supabase.rpc('get_store_credits_summary', {
                p_store_id: storeId
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al obtener resumen de créditos de la tienda:', error);
            return { success: false, error: error.message };
        }
    }

    // Ajustar manualmente el saldo de crédito (solo administradores)
    async adjustCreditBalance(userId, newBalance, reason = 'Ajuste manual') {
        try {
            // Verificar permisos de administrador
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError) throw userError;

            const { data: adminProfile, error: profileError } = await this.supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError || adminProfile.role !== 'admin') {
                return { 
                    success: false, 
                    error: 'No autorizado' 
                };
            }


            // Obtener saldo actual
            const { data: currentCredit } = await this.getUserCredit(userId);
            const currentBalance = currentCredit.data.balance;
            const adjustment = newBalance - currentBalance;

            // Registrar ajuste
            const { data, error } = await this.supabase.rpc('adjust_credit_balance', {
                p_user_id: userId,
                p_new_balance: newBalance,
                p_adjustment: adjustment,
                p_reason: reason,
                p_admin_id: user.id
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error al ajustar saldo de crédito:', error);
            return { success: false, error: error.message };
        }
    }
}
