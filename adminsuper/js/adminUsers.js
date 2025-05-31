// adminUsers.js - Manejo de creación de usuarios administradores

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const createAdminModal = document.getElementById('createAdminModal');
    const adminForm = createAdminModal?.querySelector('form');
    const createAdminBtn = createAdminModal?.querySelector('.btn-confirm');
    const cancelAdminBtn = createAdminModal?.querySelector('.btn-cancel');
    const closeModalBtn = createAdminModal?.querySelector('.close-modal');
    const openAdminModalBtn = document.getElementById('createAdminBtn');
    
    // Si no se encuentra el modal, salir
    if (!createAdminModal || !adminForm) {
        console.error('No se encontró el modal de creación de administradores o el formulario');
        return;
    }
    
        // Función para cargar las tiendas desde Supabase
    async function loadStores() {
        try {
            const { data: stores, error } = await window.supabaseAdmin
                .from('stores')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            
            return stores || [];
        } catch (error) {
            console.error('Error al cargar las tiendas:', error);
            showNotification('Error al cargar las tiendas', 'error');
            return [];
        }
    }
    
    // Función para actualizar el select de tiendas
    async function updateStoreSelect() {
        const storeSelect = document.getElementById('adminStore');
        if (!storeSelect) return;
        
        // Mostrar estado de carga
        const originalInnerHTML = storeSelect.innerHTML;
        storeSelect.innerHTML = '<option value="">Cargando tiendas...</option>';
        
        try {
            const stores = await loadStores();
            
            if (stores.length === 0) {
                storeSelect.innerHTML = '<option value="">No hay tiendas disponibles</option>';
                return;
            }
            
            // Limpiar opciones actuales excepto la primera
            storeSelect.innerHTML = '<option value="">SELECCIONE UNA TIENDA</option>';
            
            // Agregar tiendas al select
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                storeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al actualizar el select de tiendas:', error);
            storeSelect.innerHTML = originalInnerHTML;
        }
    }
    
    // Función para abrir el modal
    async function openModal() {
        console.log('Abriendo modal de creación de administradores');
        createAdminModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
        
        // Cargar tiendas cuando se abre el modal
        await updateStoreSelect();
    }
    
    // Función para cerrar el modal
    function closeModal() {
        console.log('Cerrando modal de creación de administradores');
        createAdminModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar scroll
        resetForm();
    }
    
    // Agregar evento al botón de abrir modal
    if (openAdminModalBtn) {
        openAdminModalBtn.addEventListener('click', openModal);
    } else {
        console.error('No se encontró el botón para abrir el modal de administradores');
    }

    // Mostrar/ocultar contraseña
    const togglePasswordBtn = createAdminModal.querySelector('.toggle-password');
    const passwordInput = createAdminModal.querySelector('input[type="password"]');
    
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('i');
            
            passwordInput.type = type;
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Función para limpiar el formulario
    function resetForm() {
        adminForm.reset();
        // Restaurar tipo de input de contraseña
        if (passwordInput) passwordInput.type = 'password';
        const eyeIcon = togglePasswordBtn?.querySelector('i');
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }

    // Función para cerrar el modal
    function closeModal() {
        createAdminModal.style.display = 'none';
        resetForm();
    }

    // Función para crear un administrador
    async function createAdmin() {
        if (!adminForm.checkValidity()) {
            adminForm.reportValidity();
            return;
        }

        const formData = new FormData(adminForm);
        const adminData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            storeId: formData.get('storeId') || null
        };

        const confirmBtn = createAdminBtn;
        const originalBtnText = confirmBtn.innerHTML;
        
        try {
            // Deshabilitar botón y mostrar carga
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

            // Crear el usuario en Supabase Auth usando el cliente de administración
            async function createAdmin(userData) {
                try {
                    console.log('Creando administrador con datos:', userData);
                    
                    // Verificar que el cliente de administración esté disponible
                    if (!window.supabaseAdmin) {
                        throw new Error('No se pudo acceder al cliente de administración de Supabase');
                    }
                    
                    // 1. Crear el usuario en Supabase Auth usando el cliente de administración
                    // Forzar el rol a 'admin' en lugar de 'store_admin'
                    const role = 'admin';
                    
                    const { data: authData, error: authError } = await window.supabaseAdmin.auth.admin.createUser({
                        email: userData.email,
                        password: userData.password,
                        email_confirm: true, // Confirmar el correo electrónico automáticamente
                        user_metadata: {
                            full_name: userData.name,
                            role: role,
                            email_verified: true
                        },
                        app_metadata: {
                            role: role
                        }
                    });

                    if (authError) {
                        console.error('Error al crear el usuario en Auth:', authError);
                        throw authError;
                    }

                    console.log('Usuario creado exitosamente:', authData);
                    return { success: true, userId: authData.user.id };

                } catch (error) {
                    console.error('Error al crear administrador:', error);
                    throw error;
                }
            }

            const result = await createAdmin(adminData);

            if (result.success) {
                // Si se seleccionó una tienda, actualizar el perfil después de 15 segundos
                if (adminData.storeId) {
                    showNotification('Usuario creado. Actualizando perfil con la tienda...', 'info');
                    
                    // Esperar 15 segundos antes de actualizar el perfil
                    setTimeout(async () => {
                        try {
                            const { error: updateError } = await window.supabaseAdmin
                                .from('profiles')
                                .update({ store_id: adminData.storeId })
                                .eq('id', result.userId);
                            
                            if (updateError) throw updateError;
                            
                            showNotification('Perfil actualizado con la tienda correctamente', 'success');
                            
                            // Cerrar el modal y recargar
                            closeModal();
                            setTimeout(() => window.location.reload(), 1000);
                            
                        } catch (updateError) {
                            console.error('Error al actualizar el perfil con la tienda:', updateError);
                            showNotification('Usuario creado, pero hubo un error al asignar la tienda. Por favor, actualiza manualmente el perfil.', 'error');
                            closeModal();
                            setTimeout(() => window.location.reload(), 1000);
                        }
                    }, 15000); // 15 segundos de espera
                } else {
                    // Si no hay tienda seleccionada, solo mostrar éxito
                    showNotification('Administrador creado exitosamente', 'success');
                    closeModal();
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                throw new Error('Error al crear el administrador');
            }

        } catch (error) {
            console.error('Error al crear administrador:', error);
            showNotification(error.message || 'Error al crear el administrador', 'error');
        } finally {
            // Restaurar botón
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalBtnText;
            }
        }
    }

    // Event Listeners
    if (createAdminBtn) {
        createAdminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            createAdmin();
        });
    }

    if (cancelAdminBtn) {
        cancelAdminBtn.addEventListener('click', closeModal);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Cerrar modal al hacer clic fuera del contenido
    createAdminModal.addEventListener('click', (e) => {
        if (e.target === createAdminModal) {
            closeModal();
        }
    });
});
