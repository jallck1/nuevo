// Función para ejecutar consultas SQL de manera segura
async function executeSafeQuery(query) {
    try {
        const { data, error } = await supabase
            .rpc('execute_sql_dynamic', { query_text: query });
            
        if (error) throw error;
        
        if (data && data.error) {
            console.error('Error en la consulta:', data.message);
            return { success: false, error: data.message };
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error);
        return { success: false, error: error.message };
    }
}

// Función de ejemplo para mostrar cómo usar executeSafeQuery
async function ejemploUsoQuery() {
    try {
        // Ejemplo de SELECT
        const resultadoSelect = await executeSafeQuery('SELECT * FROM stores LIMIT 10');
        if (resultadoSelect.success) {
            console.log('Resultados de SELECT:', resultadoSelect.data);
        }
        
        // Obtener el ID del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');
        
        // Ejemplo de INSERT
        const resultadoInsert = await executeSafeQuery(`
            INSERT INTO stores (name, address, admin_owner_id, created_by)
            VALUES ('Tienda de prueba', 'Dirección de prueba', '${user.id}', '${user.id}')
            RETURNING *
        `);
        
        if (resultadoInsert.success) {
            console.log('Datos insertados:', resultadoInsert.data);
        }
    } catch (error) {
        console.error('Error en ejemploUsoQuery:', error);
    }
}

// Hacer que las funciones estén disponibles globalmente
window.executeSafeQuery = executeSafeQuery;
window.ejemploUsoQuery = ejemploUsoQuery;

// Función para crear una nueva tienda
async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('Error al obtener el usuario:', userError);
            throw new Error('No se pudo verificar tu identidad. Por favor, recarga la página.');
        }
        
        console.log('Usuario autenticado:', user.id);
        
        // Validar datos requeridos
        if (!storeData || !storeData.name) {
            throw new Error('El nombre de la tienda es requerido');
        }
        
        // Crear el objeto de tienda con solo los campos necesarios
        const newStore = {
            name: storeData.name,
            address: storeData.address || null,
            admin_owner_id: user.id,
            created_by: user.id,
            status: 'active',  // Asegurarse de incluir el estado
            created_at: new Date().toISOString()
        };
        
        console.log('Intentando crear tienda con datos:', newStore);
        
        // Insertar usando el método de Supabase directamente
        const { data, error } = await supabase
            .from('stores')
            .insert([newStore])
            .select()
            .single();
        
        if (error) {
            console.error('Error al crear la tienda:', error);
            throw new Error(`Error al crear la tienda: ${error.message}`);
        }
        
        console.log('Tienda creada exitosamente:', data);
        
        return { 
            success: true, 
            storeId: data.id, 
            userId: user.id 
        };
        
    } catch (error) {
        console.error('Error en createStore:', error);
        throw error;
    }
}

// Hacer que la función createStore esté disponible globalmente
window.createStore = createStore;
