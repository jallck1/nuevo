// Inicializar Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Crear la instancia de Supabase
let supabase;

document.addEventListener('DOMContentLoaded', function() {
    // Asegurarse de que la biblioteca de Supabase esté cargada
    if (typeof supabaseClient !== 'undefined') {
        supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);
    } else if (window.supabase) {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
        console.error('No se pudo cargar el cliente de Supabase');
        return;
    }
    
    initializeForm();
});

function initializeForm() {

    // Mostrar/ocultar información bancaria según el método de reembolso
    document.querySelectorAll('input[name="refund_method"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const bankInfo = document.getElementById('bankInfo');
            const bankFields = bankInfo.querySelectorAll('input, select');
            
            if (this.value === 'Transferencia bancaria') {
                bankInfo.classList.remove('hidden');
                bankFields.forEach(field => field.required = true);
            } else {
                bankInfo.classList.add('hidden');
                bankFields.forEach(field => field.required = false);
            }
        });
    });

    // Manejar el envío del formulario
    const form = document.getElementById('returnForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    } else {
        console.error('No se encontró el formulario de devolución');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const returnData = {
        order_id: formData.get('order_id'),
        reason: formData.get('reason'),
        description: formData.get('description'),
        refund_method: formData.get('refund_method'),
        status: 'Pendiente',
        created_at: new Date().toISOString()
    };

    // Si se seleccionó transferencia bancaria, agregar la información bancaria
    if (returnData.refund_method === 'Transferencia bancaria') {
        returnData.bank_account_info = {
            bank_name: formData.get('bank_name'),
            account_type: formData.get('account_type'),
            account_number: formData.get('account_number')
        };
    }

    try {
        // Obtener el ID del usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Debe iniciar sesión para realizar una devolución');
        }
        returnData.user_id = user.id;

        // Obtener información del pedido para validar
        // Usamos el ID del pedido directamente ya que es el campo único
        const orderId = returnData.order_id.replace(/^#/, '');
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, store_id, total_amount')
            .eq('id', orderId)
            .single();

        if (orderError) {
            console.error('Error al buscar el pedido:', orderError);
            throw new Error('Error al buscar el pedido. Por favor, verifica el número e inténtalo de nuevo.');
        }
        
        if (!order) {
            throw new Error('No se encontró el pedido especificado. Verifica el número de pedido.');
        }

        // Asignar el ID de la tienda
        returnData.store_id = order.store_id;

        // Insertar la solicitud de devolución
        const { data, error } = await supabase
            .from('returns')
            .insert([returnData])
            .select();

        if (error) throw error;

        // Mostrar mensaje de éxito
        Swal.fire({
            icon: 'success',
            title: '¡Solicitud enviada!',
            text: 'Tu solicitud de devolución ha sido registrada con éxito.',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            // Redirigir a la página de seguimiento de devoluciones
            window.location.href = 'mis-devoluciones.html';
        });

    } catch (error) {
        console.error('Error al procesar la devolución:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.'
        });
    }
}