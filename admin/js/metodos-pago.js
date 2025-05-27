// Inicialización
let storeId = null;
let currentUser = null;
let currentMethodId = null;

// Elementos del DOM
const paymentMethodsList = document.getElementById('payment-methods-list');
const addPaymentMethodBtn = document.getElementById('add-payment-method');
const paymentMethodForm = document.getElementById('payment-method-form');
const paymentMethodModal = document.getElementById('payment-method-modal');
const closeModalBtn = document.getElementById('close-payment-method-modal');

// Tipos de métodos de pago disponibles
const PAYMENT_METHOD_TYPES = [
    { value: 'transfer', label: 'Transferencia Bancaria' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'DaviPlata' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' }
];

// Inicialización de la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        currentUser = user;

        // Obtener el store_id del perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;
        storeId = profile.store_id;

        // Cargar métodos de pago
        await loadPaymentMethods();

        // Configurar eventos
        setupEventListeners();
    } catch (error) {
        console.error('Error al inicializar métodos de pago:', error);
        showError('No se pudieron cargar los métodos de pago. Por favor, recarga la página.');
    }
});

// Configurar event listeners
function setupEventListeners() {
    // Botón para agregar nuevo método de pago
    if (addPaymentMethodBtn) {
        addPaymentMethodBtn.addEventListener('click', () => openPaymentMethodModal());
    }

    // Cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePaymentMethodModal);
    }

    // Enviar formulario
    if (paymentMethodForm) {
        paymentMethodForm.addEventListener('submit', handleSubmitPaymentMethod);
    }
}

// Cargar métodos de pago
async function loadPaymentMethods() {
    try {
        showLoading();
        
        const { data: paymentMethods, error } = await supabase
            .from('store_payment_methods')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderPaymentMethods(paymentMethods || []);
    } catch (error) {
        console.error('Error al cargar métodos de pago:', error);
        showError('No se pudieron cargar los métodos de pago. Por favor, inténtalo de nuevo.');
    } finally {
        hideLoading();
    }
}

// Renderizar lista de métodos de pago
function renderPaymentMethods(methods) {
    if (!paymentMethodsList) return;

    if (!methods || methods.length === 0) {
        paymentMethodsList.innerHTML = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12">
                <div class="text-gray-500">
                    <i class="fas fa-credit-card text-4xl mb-2"></i>
                    <p>No hay métodos de pago registrados</p>
                </div>
            </div>
        `;
        return;
    }

    paymentMethodsList.innerHTML = methods.map(method => `
        <div class="bg-white rounded-lg shadow p-6 mb-4 border-l-4 ${getMethodTypeBorderClass(method.method_type)} flex justify-between items-center">
            <div class="flex items-center">
                <div class="p-3 rounded-full ${getMethodTypeBgClass(method.method_type)} text-white mr-4">
                    <i class="${getMethodTypeIcon(method.method_type)} text-xl"></i>
                </div>
                <div>
                    <h3 class="font-semibold text-lg">${method.name || getMethodTypeLabel(method.method_type)}</h3>
                    <p class="text-gray-600 text-sm">${getMethodDetails(method)}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="editPaymentMethod('${method.id}')" class="text-blue-600 hover:text-blue-800 p-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="confirmDeletePaymentMethod('${method.id}')" class="text-red-600 hover:text-red-800 p-2">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="flex items-center">
                    <span class="text-sm ${method.is_active ? 'text-green-600' : 'text-gray-400'}">
                        ${method.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <label class="switch ml-2">
                        <input type="checkbox" ${method.is_active ? 'checked' : ''} 
                               onchange="togglePaymentMethodStatus('${method.id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    `).join('');
}

// Abrir modal para agregar/editar método de pago
function openPaymentMethodModal(methodId = null) {
    currentMethodId = methodId;
    const modal = document.getElementById('payment-method-modal');
    const modalTitle = document.getElementById('payment-method-modal-title');
    const methodTypeSelect = document.getElementById('payment-method-type');
    
    // Limpiar el formulario
    paymentMethodForm.reset();
    
    // Configurar el título del modal
    if (methodId) {
        modalTitle.textContent = 'Editar Método de Pago';
        loadPaymentMethodData(methodId);
    } else {
        modalTitle.textContent = 'Agregar Método de Pago';
        // Mostrar solo los campos relevantes para el tipo seleccionado
        updatePaymentMethodFields();
    }
    
    // Mostrar el modal
    modal.classList.remove('hidden');
}

// Cerrar modal
function closePaymentMethodModal() {
    const modal = document.getElementById('payment-method-modal');
    modal.classList.add('hidden');
    currentMethodId = null;
    paymentMethodForm.reset();
}

// Cargar datos de un método de pago existente
async function loadPaymentMethodData(methodId) {
    try {
        showLoading();
        
        const { data: method, error } = await supabase
            .from('store_payment_methods')
            .select('*')
            .eq('id', methodId)
            .single();

        if (error) throw error;

        // Llenar el formulario con los datos existentes
        document.getElementById('payment-method-name').value = method.name || '';
        document.getElementById('payment-method-type').value = method.method_type;
        
        // Actualizar campos según el tipo de método
        updatePaymentMethodFields(method.method_type, method);
        
        // Configurar instrucciones
        document.getElementById('payment-method-instructions').value = method.instructions || '';
        
        // Configurar estado
        document.getElementById('payment-method-active').checked = method.is_active !== false;
        
    } catch (error) {
        console.error('Error al cargar el método de pago:', error);
        showError('No se pudo cargar el método de pago. Por favor, inténtalo de nuevo.');
    } finally {
        hideLoading();
    }
}

// Actualizar campos del formulario según el tipo de método seleccionado
function updatePaymentMethodFields(methodType = null, methodData = null) {
    const methodTypeSelect = document.getElementById('payment-method-type');
    const selectedType = methodType || methodTypeSelect.value;
    
    // Ocultar todos los campos primero
    document.querySelectorAll('.payment-method-field').forEach(field => {
        field.classList.add('hidden');
    });
    
    // Mostrar campos según el tipo seleccionado
    switch(selectedType) {
        case 'transfer':
            document.getElementById('transfer-fields').classList.remove('hidden');
            if (methodData) {
                document.getElementById('bank-name').value = methodData.details?.bank_name || '';
                document.getElementById('account-type').value = methodData.details?.account_type || 'savings';
                document.getElementById('account-number').value = methodData.details?.account_number || '';
                document.getElementById('account-holder').value = methodData.details?.account_holder || '';
                document.getElementById('id-number').value = methodData.details?.id_number || '';
                document.getElementById('id-type').value = methodData.details?.id_type || 'cc';
            }
            break;
            
        case 'nequi':
        case 'daviplata':
            document.getElementById('mobile-fields').classList.remove('hidden');
            if (methodData) {
                document.getElementById('phone-number').value = methodData.details?.phone_number || '';
                document.getElementById('holder-name').value = methodData.details?.holder_name || '';
                if (methodData.qr_image_url) {
                    document.getElementById('qr-code-preview').src = methodData.qr_image_url;
                    document.getElementById('qr-code-container').classList.remove('hidden');
                }
            }
            break;
            
        case 'efectivo':
            document.getElementById('cash-fields').classList.remove('hidden');
            if (methodData) {
                document.getElementById('cash-instructions').value = methodData.details?.instructions || '';
            }
            break;
            
        case 'otro':
            document.getElementById('other-fields').classList.remove('hidden');
            if (methodData) {
                document.getElementById('custom-details').value = methodData.details?.custom_details || '';
            }
            break;
    }
}

// Manejar envío del formulario
async function handleSubmitPaymentMethod(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const formData = new FormData(paymentMethodForm);
        const methodType = formData.get('method_type');
        
        // Validar campos según el tipo de método
        if (!validatePaymentMethod(methodType)) {
            return;
        }
        
        // Construir objeto de detalles según el tipo de método
        const details = {};
        
        switch(methodType) {
            case 'transfer':
                details.bank_name = formData.get('bank_name');
                details.account_type = formData.get('account_type');
                details.account_number = formData.get('account_number');
                details.account_holder = formData.get('account_holder');
                details.id_number = formData.get('id_number');
                details.id_type = formData.get('id_type');
                break;
                
            case 'nequi':
            case 'daviplata':
                details.phone_number = formData.get('phone_number');
                details.holder_name = formData.get('holder_name');
                // Manejar carga de código QR si existe
                const qrFile = document.getElementById('qr-code-upload').files[0];
                if (qrFile) {
                    const fileExt = qrFile.name.split('.').pop();
                    const fileName = `${methodType}_${Date.now()}.${fileExt}`;
                    const filePath = `payment_methods/${storeId}/${fileName}`;
                    
                    // Subir archivo a storage
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('payments')
                        .upload(filePath, qrFile);
                        
                    if (uploadError) throw uploadError;
                    
                    // Obtener URL pública
                    const { data: { publicUrl } } = supabase.storage
                        .from('payments')
                        .getPublicUrl(filePath);
                        
                    details.qr_image_url = publicUrl;
                }
                break;
                
            case 'efectivo':
                details.instructions = formData.get('cash_instructions');
                break;
                
            case 'otro':
                details.custom_details = formData.get('custom_details');
                break;
        }
        
        // Crear o actualizar el método de pago
        const methodData = {
            store_id: storeId,
            method_type: methodType,
            name: formData.get('name') || getMethodTypeLabel(methodType),
            details: details,
            instructions: formData.get('instructions') || '',
            is_active: formData.get('is_active') === 'on'
        };
        
        let error;
        if (currentMethodId) {
            // Actualizar método existente
            const { error: updateError } = await supabase
                .from('store_payment_methods')
                .update({
                    ...methodData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentMethodId);
            error = updateError;
        } else {
            // Crear nuevo método
            const { error: insertError } = await supabase
                .from('store_payment_methods')
                .insert([methodData]);
            error = insertError;
        }
        
        if (error) throw error;
        
        // Cerrar modal y recargar lista
        closePaymentMethodModal();
        await loadPaymentMethods();
        
        showToast(currentMethodId ? 'Método de pago actualizado correctamente' : 'Método de pago creado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al guardar el método de pago:', error);
        showError('No se pudo guardar el método de pago. Por favor, inténtalo de nuevo.');
    } finally {
        hideLoading();
    }
}

// Validar campos del formulario según el tipo de método
function validatePaymentMethod(methodType) {
    // Validaciones básicas
    if (methodType === 'transfer') {
        const requiredFields = ['bank_name', 'account_number', 'account_holder', 'id_number'];
        for (const field of requiredFields) {
            const value = document.getElementById(field)?.value?.trim();
            if (!value) {
                showError(`El campo ${field.replace('-', ' ')} es obligatorio`);
                return false;
            }
        }
    } else if (methodType === 'nequi' || methodType === 'daviplata') {
        const phoneNumber = document.getElementById('phone-number')?.value?.trim();
        if (!phoneNumber) {
            showError('El número de teléfono es obligatorio');
            return false;
        }
    }
    
    return true;
}

// Alternar estado de un método de pago
async function togglePaymentMethodStatus(methodId, isActive) {
    try {
        const { error } = await supabase
            .from('store_payment_methods')
            .update({ 
                is_active: isActive,
                updated_at: new Date().toISOString() 
            })
            .eq('id', methodId);
            
        if (error) throw error;
        
        showToast(`Método de pago ${isActive ? 'activado' : 'desactivado'} correctamente`, 'success');
    } catch (error) {
        console.error('Error al actualizar el estado del método de pago:', error);
        showError('No se pudo actualizar el estado del método de pago');
        // Revertir el cambio en la interfaz
        const checkbox = document.querySelector(`input[on*="togglePaymentMethodStatus('${methodId}'"]`);
        if (checkbox) {
            checkbox.checked = !isActive;
        }
    }
}

// Confirmar eliminación de método de pago
function confirmDeletePaymentMethod(methodId) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            deletePaymentMethod(methodId);
        }
    });
}

// Eliminar método de pago
async function deletePaymentMethod(methodId) {
    try {
        showLoading();
        
        const { error } = await supabase
            .from('store_payment_methods')
            .delete()
            .eq('id', methodId);
            
        if (error) throw error;
        
        // Recargar lista
        await loadPaymentMethods();
        showToast('Método de pago eliminado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al eliminar el método de pago:', error);
        showError('No se pudo eliminar el método de pago. Por favor, inténtalo de nuevo.');
    } finally {
        hideLoading();
    }
}

// Funciones de utilidad
function getMethodTypeLabel(methodType) {
    const method = PAYMENT_METHOD_TYPES.find(m => m.value === methodType);
    return method ? method.label : 'Método de pago';
}

function getMethodTypeIcon(methodType) {
    switch(methodType) {
        case 'transfer': return 'fas fa-university';
        case 'nequi': return 'fas fa-mobile-alt';
        case 'daviplata': return 'fas fa-mobile-alt';
        case 'efectivo': return 'fas fa-money-bill-wave';
        default: return 'fas fa-credit-card';
    }
}

function getMethodTypeBorderClass(methodType) {
    switch(methodType) {
        case 'transfer': return 'border-blue-500';
        case 'nequi': return 'border-purple-500';
        case 'daviplata': return 'border-green-500';
        case 'efectivo': return 'border-yellow-500';
        default: return 'border-gray-500';
    }
}

function getMethodTypeBgClass(methodType) {
    switch(methodType) {
        case 'transfer': return 'bg-blue-500';
        case 'nequi': return 'bg-purple-500';
        case 'daviplata': return 'bg-green-500';
        case 'efectivo': return 'bg-yellow-500';
        default: return 'bg-gray-500';
    }
}

function getMethodDetails(method) {
    if (!method.details) return '';
    
    switch(method.method_type) {
        case 'transfer':
            return `${method.details.bank_name} · ${method.details.account_type === 'savings' ? 'Ahorros' : 'Corriente'} ${method.details.account_number}`;
        case 'nequi':
        case 'daviplata':
            return `${method.details.phone_number} · ${method.details.holder_name || ''}`;
        case 'efectivo':
            return 'Pago en efectivo';
        default:
            return method.details.custom_details || '';
    }
}

// Mostrar vista previa del código QR
function previewQrCode(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('qr-code-preview');
            preview.src = e.target.result;
            document.getElementById('qr-code-container').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Mostrar/ocultar loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
}

// Mostrar mensaje de error
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'Aceptar'
    });
}

// Mostrar notificación
function showToast(message, type = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
    
    Toast.fire({
        icon: type,
        title: message
    });
}

// Hacer funciones disponibles globalmente
window.editPaymentMethod = openPaymentMethodModal;
window.confirmDeletePaymentMethod = confirmDeletePaymentMethod;
window.togglePaymentMethodStatus = togglePaymentMethodStatus;
window.updatePaymentMethodFields = updatePaymentMethodFields;
window.previewQrCode = previewQrCode;
