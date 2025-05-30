// Función para crear una nueva tienda
async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        
        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            throw new Error('No se pudo verificar tu identidad. Por favor, recarga la página.');
        }
        
        console.log('Usuario autenticado:', user.id);
        
        if (!storeData.name) {
            throw new Error('El nombre de la tienda es requerido');
        }
        
        // Insertar directamente sin RPC
        const { data, error } = await supabase
            .from('stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('Tienda creada exitosamente:', data);
        
        return { 
            success: true, 
            storeId: data.id, 
            userId: user.id 
        };
        
    } catch (error) {
        console.error('Error en createStore:', error);
        throw new Error('No se pudo crear la tienda: ' + (error.message || 'Error desconocido'));
    }
}async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase
            .from('temp_stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        
        return { 
            success: true, 
            storeId: data.id, 
            userId: user.id 
        };
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}// Función para crear una nueva tienda
async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('No autenticado');
        
        console.log('Usuario:', user.id);
        
        // Validar
        if (!storeData.name) throw new Error('Nombre requerido');
        
        // Insertar directamente
        const { data, error } = await supabase
            .from('stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error de Supabase:', error);
            throw new Error('Error al crear la tienda');
        }
        
        console.log('Tienda creada:', data);
        return { success: true, storeId: data.id };
        
    } catch (error) {
        console.error('Error en createStore:', error);
        throw error;
    }
}// Función para crear una nueva tienda
async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('No autenticado');
        
        console.log('Usuario:', user.id);
        
        // Validar
        if (!storeData.name) throw new Error('Nombre requerido');
        
        // Insertar directamente
        const { data, error } = await supabase
            .from('stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error de Supabase:', error);
            throw new Error('Error al crear la tienda');
        }
        
        console.log('Tienda creada:', data);
        return { success: true, storeId: data.id };
        
    } catch (error) {
        console.error('Error en createStore:', error);
        throw error;
    }
}// Función para crear una nueva tienda
async function createStore(storeData) {
    try {
        console.log('Iniciando creación de tienda...');
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('No autenticado');
        
        console.log('Usuario:', user.id);
        
        // Validar
        if (!storeData.name) throw new Error('Nombre requerido');
        
        // Insertar directamente
        const { data, error } = await supabase
            .from('stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error de Supabase:', error);
            throw new Error('Error al crear la tienda');
        }
        
        console.log('Tienda creada:', data);
        return { success: true, storeId: data.id };
        
    } catch (error) {
        console.error('Error en createStore:', error);
        throw error;
    }
}async function createStore(storeData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');
        
        const { data, error } = await supabase
            .from('temp_stores')
            .insert({
                name: storeData.name,
                address: storeData.address || '',
                admin_owner_id: user.id,
                created_by: user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, storeId: data.id };
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}// Obtener la instancia de Supabase desde login.js
const supabase = window.supabase;

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Verificar si ya existe un contenedor de notificaciones
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }

    // Crear el elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.padding = '15px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.backgroundColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    notification.style.transition = 'opacity 0.3s ease';
    notification.textContent = message;

    // Agregar la notificación al contenedor
    container.appendChild(notification);

    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            container.removeChild(notification);
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, 5000);
}

// Hacer que la función esté disponible globalmente
window.showNotification = showNotification;

// Función para verificar la autenticación
async function checkAuth() {
    try {
        // Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('Error de sesión:', sessionError);
            showNotification('Por favor inicia sesión para continuar', 'error');
            window.location.href = 'login.html';
            return null;
        }
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('Error al obtener el usuario:', userError);
            showNotification('Error al verificar tu identidad', 'error');
            window.location.href = 'login.html';
            return null;
        }
        
        console.log('Usuario autenticado:', user.id);
        return user;
        
    } catch (error) {
        console.error('Error en checkAuth:', error);
        showNotification('Error de autenticación', 'error');
        window.location.href = 'login.html';
        return null;
    }
}

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', (async () => {
    console.log('Inicializando admincecepsiesa.js...');
    
    try {
        // Verificar autenticación
        const user = await checkAuth();
        if (!user) return;
        
        console.log('Usuario autenticado correctamente:', user.email);
        
        // Inicializar el formulario de creación de tienda
        setupStoreForm();
        
        // Escuchar cambios en la autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Cambio en estado de autenticación:', event);
            
            if (event === 'SIGNED_OUT') {
                window.location.href = 'login.html';
            }
        });
        
        // Limpiar suscripción al desmontar
        return () => {
            if (subscription?.unsubscribe) {
                subscription.unsubscribe();
            }
        };
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        window.showNotification('Error al cargar la aplicación', 'error');
    }
})());

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
        
        // Validar datos mínimos
        if (!storeData.name) {
            throw new Error('El nombre de la tienda es requerido');
        }
        
        // Crear objeto con los campos requeridos
        const storeToCreate = {
            name: storeData.name,
            address: storeData.address || '',
            admin_owner_id: user.id,
            created_by: user.id
            // created_at y updated_at se generan automáticamente
        };
        
        console.log('Datos a enviar:', storeToCreate);
        
        // Insertar en la tabla stores
        const { data, error } = await supabase
            .from('stores')
            .insert(storeToCreate)
            .select()
            .single();
        
        if (error) {
            console.error('Error al crear la tienda:', error);
            // Si falla, intentar con una inserción directa usando RPC
            try {
                console.log('Intentando con inserción directa...');
                const { data: rpcData, error: rpcError } = await supabase.rpc('create_store_simple', {
                    p_name: storeData.name,
                    p_address: storeData.address || '',
                    p_user_id: user.id
                });
                
                if (rpcError) throw rpcError;
                
                console.log('Tienda creada exitosamente con RPC:', rpcData);
                return { 
                    success: true, 
                    storeId: rpcData, 
                    userId: user.id 
                };
            } catch (rpcError) {
                console.error('Error en inserción RPC:', rpcError);
                throw new Error('No se pudo crear la tienda. ' + (rpcError.message || ''));
            }
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

// Manejador del formulario de creación de tienda
function setupStoreForm() {
    const form = document.getElementById('createStoreForm');
    const cancelBtn = document.querySelector('#storeModal .btn-cancel');
    const confirmBtn = document.querySelector('#storeModal .btn-confirm');
    
    if (!form || !cancelBtn || !confirmBtn) {
        console.error('No se encontraron los elementos del formulario de creación de tienda');
        return;
    }
    
    console.log('Configurando formulario de creación de tienda...');
    
    // Manejar el clic en Cancelar
    cancelBtn.addEventListener('click', () => {
        window.closeModal('storeModal');
        form.reset();
    });
    
    // Manejar el clic en Confirmar
    confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Mostrar estado de carga
        const originalBtnText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
        
        try {
            // Crear objeto con los datos del formulario
            const formData = new FormData(form);
            const storeData = Object.fromEntries(formData.entries());
            
            console.log('Datos del formulario:', storeData);
            
            // Crear la tienda
            const result = await createStore(storeData);
            
            // Mostrar mensaje de éxito
            window.showNotification('¡Tienda creada exitosamente!', 'success');
            
            // Cerrar el modal y limpiar el formulario
            window.closeModal('storeModal');
            form.reset();
            
            console.log('Resultado de la creación:', result);
            
            // Recargar la página para actualizar la lista de tiendas
            setTimeout(() => window.location.reload(), 1500);
            
        } catch (error) {
            console.error('Error al crear la tienda:', error);
            
            // Mostrar mensaje de error específico
            let errorMessage = 'Error al crear la tienda';
            if (error.message.includes('duplicate key')) {
                errorMessage = 'El correo electrónico ya está en uso';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            window.showNotification(errorMessage, 'error');
        } finally {
            // Restaurar el botón
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText;
        }
    });
}

// Hacer que las funciones estén disponibles globalmente
window.createStore = createStore;
window.setupStoreForm = setupStoreForm;