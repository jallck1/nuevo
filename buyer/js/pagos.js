// Configuración de la API
const API_BASE_URL = 'https://tu-api-supabase.com/rest/v1';

// Configuración de Supabase
const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';

// Inicializar Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Estado de la aplicación
let state = {
    user: null,
    store: null,
    deudaTotal: 0,
    creditoDisponible: 0,
    ordenesPendientes: [],
    historialPagos: [],
    metodosPago: [],
    metodoSeleccionado: null
};

// Elementos del DOM
const elementos = {
    // Deuda
    totalDeuda: document.getElementById('total-deuda'),
    creditoDisponible: document.getElementById('credito-disponible'),
    tablaOrdenesPendientes: document.querySelector('#tabla-ordenes-pendientes tbody'),
    
    // Historial
    tablaHistorialPagos: document.querySelector('#tabla-historial-pagos tbody'),
    
    // Métodos de pago
    metodosPagoContainer: document.getElementById('metodos-pago-container'),
    btnAgregarMetodo: document.getElementById('btn-agregar-metodo'),
    instruccionesPago: document.getElementById('instrucciones-pago'),
    
    // Modal de pago
    formPago: document.getElementById('form-pago'),
    montoPagar: document.getElementById('monto-pagar'),
    metodoPagoSelect: document.getElementById('metodo-pago'),
    referenciaPago: document.getElementById('referencia-pago'),
    notasPago: document.getElementById('notas-pago'),
    guardarMetodo: document.getElementById('guardar-metodo'),
    btnConfirmarPago: document.getElementById('btn-confirmar-pago'),
    instruccionesPagoModal: document.getElementById('instrucciones-pago-modal')
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticación primero
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            window.location.href = '/login.html';
            return;
        }
        
        // Inicializar estado del usuario
        state.user = user;
        
        // Cargar perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        
        // Actualizar estado con datos del perfil
        state.store = profile.store_id;
        state.creditoDisponible = parseFloat(profile.credit_assigned || 0) - parseFloat(profile.credit_used || 0);
        state.deudaTotal = parseFloat(profile.credit_used || 0);
        
        // Cargar el resto de los datos
        await cargarDatosIniciales();
        configurarEventos();
        
        // Actualizar UI con los datos cargados
        actualizarUI();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error al cargar los datos. Por favor, recarga la página.');
    }
});

// Verificar autenticación del usuario
async function verificarAutenticacion() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        state.user = user;
        
        // Obtener perfil del usuario
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (error) throw error;
        
        state.store = profile.store_id;
        state.creditoDisponible = (profile.credit_assigned - profile.credit_used) || 0;
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        throw error;
    }
}

// Cargar datos iniciales
async function cargarDatosIniciales() {
    try {
        // Cargar perfil del usuario para obtener la deuda actual
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credit_used')
            .eq('id', state.user.id)
            .single();
            
        if (profileError) throw profileError;
        
        // Actualizar la deuda total desde el perfil
        state.deudaTotal = parseFloat(profile.credit_used || 0);
        
        // Cargar órdenes pendientes
        await cargarOrdenesPendientes();
        
        // Cargar historial de pagos
        await cargarHistorialPagos();
        
        // Cargar métodos de pago
        await cargarMetodosPago();
        
        // Actualizar la UI con los nuevos datos
        actualizarUI();
        
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        mostrarError('Error al cargar los datos iniciales');
        throw error;
    }
}

// Cargar órdenes pendientes
async function cargarOrdenesPendientes() {
    try {
        const { data: ordenes, error } = await supabase
            .from('orders')
            .select('*')
            .eq('buyer_id', state.user.id)
            .eq('status', 'pending_payment')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        state.ordenesPendientes = ordenes || [];
        
        // No sobrescribir la deuda total aquí, ya que se establece desde el perfil
        // state.deudaTotal = state.ordenesPendientes.reduce((total, orden) => total + (orden.total || 0), 0);
        
    } catch (error) {
        console.error('Error al cargar órdenes pendientes:', error);
        throw error;
    }
}

// Cargar y mostrar el historial de pagos del usuario
async function cargarHistorialPagos() {
    try {
        if (!state.user?.id) return;
        
        // Obtener los pagos del usuario
        const { data: pagos, error } = await supabase
            .from('payments')
            .select('*')
            .eq('buyer_id', state.user.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Actualizar la tabla con los pagos
        const tbody = document.querySelector('#tabla-historial-pagos tbody');
        tbody.innerHTML = '';
        
        if (!pagos || pagos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros de pagos</td></tr>';
            return;
        }
        
        // Agregar cada pago a la tabla
        pagos.forEach(pago => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${new Date(pago.created_at).toLocaleString()}</td>
                <td>${pago.reference_id || 'N/A'}</td>
                <td>${pago.payment_method || 'N/A'}</td>
                <td>$${pago.amount?.toFixed(2) || '0.00'}</td>
                <td><span class="badge ${pago.status === 'Completado' ? 'bg-success' : 'bg-secondary'}">${pago.status || 'Pendiente'}</span></td>
                <td><button class="btn btn-sm btn-outline-secondary" data-pago-id="${pago.id}">Ver</button></td>
            `;
            tbody.appendChild(fila);
        });
        
    } catch (error) {
        console.error('Error al cargar historial de pagos:', error);
    }
}

// Cargar métodos de pago
async function cargarMetodosPago() {
    try {
        console.log('Cargando métodos de pago para la tienda:', state.store);
        
        const { data: metodos, error } = await supabase
            .from('store_payment_methods')
            .select('*')
            .eq('store_id', state.store)
            .eq('is_active', true);
            
        if (error) {
            console.error('Error al cargar métodos de pago:', error);
            throw error;
        }
        
        console.log('Métodos de pago cargados:', metodos);
        state.metodosPago = metodos || [];
        
        // Forzar actualización de la UI
        actualizarMetodosPagoUI();
        
    } catch (error) {
        console.error('Error en cargarMetodosPago:', error);
        mostrarError('Error al cargar los métodos de pago. Por favor, recarga la página.');
        // Inicializar como array vacío para evitar errores
        state.metodosPago = [];
    }
}

// Configurar eventos
function configurarEventos() {
    // Evento para seleccionar método de pago
    elementos.metodoPagoSelect.addEventListener('change', (e) => {
        const metodoId = e.target.value;
        state.metodoSeleccionado = state.metodosPago.find(m => m.id === metodoId);
        
        if (state.metodoSeleccionado) {
            elementos.instruccionesPagoModal.innerHTML = `
                <h6>${state.metodoSeleccionado.name}</h6>
                <p class="mb-0">${state.metodoSeleccionado.instructions || 'No hay instrucciones específicas.'}</p>
            `;
        } else {
            elementos.instruccionesPagoModal.innerHTML = '<small>Seleccione un método de pago para ver las instrucciones.</small>';
        }
    });
    
    // Evento para el botón de confirmar pago
    elementos.btnConfirmarPago.addEventListener('click', async () => {
        // Validar el formulario manualmente
        if (!elementos.formPago.checkValidity()) {
            elementos.formPago.reportValidity();
            return;
        }
        
        const btn = elementos.btnConfirmarPago;
        if (btn.disabled) return; // Evitar múltiples clics
        
        try {
            // Mostrar estado de carga
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
            
            // Procesar el pago
            const exito = await procesarPago();
            
            if (exito) {
                // Cerrar el modal si el pago fue exitoso
                const modal = bootstrap.Modal.getInstance(document.getElementById('pagarModal'));
                if (modal) modal.hide();
            }
        } catch (error) {
            console.error('Error al procesar el pago:', error);
            mostrarError('Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo.');
        } finally {
            // Restaurar el botón
            btn.disabled = false;
            btn.textContent = 'Confirmar Pago';
        }
    });
    
    // Evento para agregar método de pago
    elementos.btnAgregarMetodo.addEventListener('click', () => {
        // Implementar lógica para agregar método de pago
        mostrarAlerta('info', 'Próximamente', 'Esta función estará disponible próximamente.');
    });
}

// Procesar pago
async function procesarPago() {
    // Validar el formulario
    if (!elementos.formPago.checkValidity()) {
        elementos.formPago.reportValidity();
        return false;
    }
    
    const monto = parseFloat(elementos.montoPagar.value);
    const metodoPagoId = elementos.metodoPagoSelect.value;
    const referencia = elementos.referenciaPago.value;
    const notas = elementos.notasPago.value;
    
    if (monto <= 0) {
        mostrarError('El monto debe ser mayor a cero');
        return false;
    }
    
    try {
        // Llamar a la función de base de datos para procesar el pago
        console.log('Enviando pago a la base de datos:', {
            user_id: state.user.id,
            store_id: state.store,
            amount: monto,
            payment_method: state.metodoSeleccionado?.name,
            reference_id: referencia || null,
            notes: notas || null,
            status: 'Completado'
        });
        
        const { data: resultado, error } = await supabase.rpc('process_payment', {
            p_user_id: state.user.id,
            p_store_id: state.store,
            p_amount: monto,
            p_payment_method: state.metodoSeleccionado?.name || 'Efectivo',
            p_reference_id: referencia || null,
            p_notes: notas || null,
            p_status: 'Completado'
        });
            
        console.log('Respuesta de process_payment:', { resultado, error });
        
        if (error) {
            console.error('Error en process_payment:', error);
            throw error;
        }
        
        // Actualizar el estado local con los nuevos valores
        state.creditoDisponible = resultado.available_credit;
        state.deudaTotal = resultado.new_credit_used;
        
        // Cerrar modal y limpiar formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('pagarModal'));
        if (modal) modal.hide();
        elementos.formPago.reset();
        
        // Actualizar la UI
        actualizarUI();
        
        // Recargar el historial de pagos
        await cargarHistorialPagos();
        
        // Generar número de factura (usando timestamp + 3 dígitos aleatorios)
        const invoiceNumber = `FAC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        
        // Generar factura PDF
        const datosFactura = {
            invoiceNumber,
            userName: state.user?.user_metadata?.full_name || 'Cliente',
            userEmail: state.user?.email || 'N/A',
            userDocument: state.user?.user_metadata?.document || 'N/A',
            amount: monto,
            paymentMethod: state.metodoSeleccionado?.name || 'No especificado',
            reference: referencia || 'N/A',
            date: new Date().toISOString()
        };
        
        // Esperar un momento antes de generar el PDF para que el usuario vea el mensaje de éxito
        setTimeout(() => {
            if (window.generarFacturaPDF) {
                window.generarFacturaPDF(datosFactura);
            } else {
                console.warn('La función generarFacturaPDF no está disponible');
            }
        }, 500);
        
        // Mostrar confirmación
        mostrarAlerta('success', '¡Pago exitoso!', 
            `Se ha registrado tu pago de $${monto.toFixed(2)}. ` +
            `Tu crédito disponible ahora es de $${resultado.available_credit.toFixed(2)}. ` +
            'Se ha generado tu factura, se descargará automáticamente.');
        
        return true;
        
    } catch (error) {
        console.error('Error al procesar el pago:', error);
        mostrarError('Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo. ' + 
                    (error.message || ''));
        return false;
    }
}

// Actualizar la interfaz de usuario
function actualizarUI() {
    // Actualizar resumen de deuda
    elementos.totalDeuda.textContent = `$${state.deudaTotal.toFixed(2)}`;
    elementos.creditoDisponible.textContent = `$${state.creditoDisponible.toFixed(2)}`;
    
    // Actualizar tabla de órdenes pendientes
    actualizarTablaOrdenesPendientes();
    
    // Actualizar tabla de historial de pagos
    actualizarTablaHistorialPagos();
    
    // Actualizar métodos de pago
    actualizarMetodosPagoUI();
}

// Actualizar tabla de órdenes pendientes
function actualizarTablaOrdenesPendientes() {
    elementos.tablaOrdenesPendientes.innerHTML = '';
    
    if (state.ordenesPendientes.length === 0) {
        elementos.tablaOrdenesPendientes.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No tienes órdenes pendientes de pago</td>
            </tr>
        `;
        return;
    }
    
    state.ordenesPendientes.forEach(orden => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${orden.id.substring(0, 8)}</td>
            <td>${new Date(orden.created_at).toLocaleDateString()}</td>
            <td>$${orden.total?.toFixed(2) || '0.00'}</td>
            <td><span class="badge bg-warning">${orden.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" data-orden-id="${orden.id}">
                    <i class="bi bi-cash-coin"></i> Pagar
                </button>
            </td>
        `;
        
        // Agregar evento al botón de pagar
        fila.querySelector('button').addEventListener('click', () => {
            elementos.montoPagar.value = orden.total?.toFixed(2) || '0.00';
            const modal = new bootstrap.Modal(document.getElementById('pagarModal'));
            modal.show();
        });
        
        elementos.tablaOrdenesPendientes.appendChild(fila);
    });
}

// Actualizar tabla de historial de pagos
function actualizarTablaHistorialPagos() {
    console.log('=== actualizarTablaHistorialPagos ===');
    console.log('Elemento tablaHistorialPagos:', elementos.tablaHistorialPagos);
    
    if (!elementos.tablaHistorialPagos) {
        console.error('No se encontró el elemento tablaHistorialPagos en el DOM');
        return;
    }
    
    // Limpiar la tabla
    elementos.tablaHistorialPagos.innerHTML = '';
    
    // Verificar si hay pagos para mostrar
    if (!Array.isArray(state.historialPagos) || state.historialPagos.length === 0) {
        console.log('No hay pagos para mostrar');
        const filaVacia = document.createElement('tr');
        filaVacia.innerHTML = `
            <td colspan="6" class="text-center">No hay registros de pagos</td>
        `;
        elementos.tablaHistorialPagos.appendChild(filaVacia);
        return;
    }
    
    console.log(`Mostrando ${state.historialPagos.length} pagos en la tabla`);
    
    // Ordenar por fecha más reciente primero
    const pagosOrdenados = [...state.historialPagos].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Agregar cada pago a la tabla
    pagosOrdenados.forEach((pago, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${new Date(pago.created_at).toLocaleString()}</td>
            <td>${pago.reference_id || 'N/A'}</td>
            <td>${pago.payment_method}</td>
            <td>$${pago.amount.toFixed(2)}</td>
            <td><span class="badge ${pago.status === 'Completado' ? 'bg-success' : 'bg-secondary'}">${pago.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" data-pago-id="${pago.id}">
                    <i class="bi bi-receipt"></i> Ver
                </button>
            </td>
        `;
        
        // Agregar evento al botón de ver
        fila.querySelector('button').addEventListener('click', () => {
            mostrarDetallePago(pago);
        });
        
        elementos.tablaHistorialPagos.appendChild(fila);
    });
}

// Actualizar métodos de pago en la UI
function actualizarMetodosPagoUI() {
    console.log('Actualizando UI de métodos de pago:', state.metodosPago);
    
    // Limpiar select de métodos de pago
    elementos.metodoPagoSelect.innerHTML = '<option value="" selected disabled>Seleccione un método de pago</option>';
    
    // Limpiar contenedor de métodos de pago
    elementos.metodosPagoContainer.innerHTML = '';
    
    if (!state.metodosPago || state.metodosPago.length === 0) {
        elementos.metodosPagoContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No hay métodos de pago disponibles actualmente.
                </div>
            </div>
        `;
        return;
    }
    
    // Agregar métodos al select del modal
    state.metodosPago.forEach(metodo => {
        // Añadir al select del modal
        const option = document.createElement('option');
        option.value = metodo.id;
        option.textContent = metodo.name;
        option.dataset.method = JSON.stringify(metodo);
        elementos.metodoPagoSelect.appendChild(option);
        
        // Crear tarjeta de método de pago
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';
        
        const card = document.createElement('div');
        card.className = 'card h-100';
        card.style.cursor = 'pointer';
        card.dataset.id = metodo.id;
        
        // Construir el contenido de la tarjeta
        let cardContent = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title mb-1">${metodo.name}</h5>
                        <span class="badge bg-primary">${metodo.method_type || 'Pago'}</span>
                    </div>
                    ${metodo.qr_image_url ? `
                        <div class="qr-preview" style="width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                            <img src="${metodo.qr_image_url}" alt="QR ${metodo.name}" class="img-fluid">
                        </div>
                    ` : ''}
                </div>
                ${metodo.instructions ? `
                    <p class="card-text small mt-2">${metodo.instructions}</p>
                ` : ''}
            </div>
        `;
        
        card.innerHTML = cardContent;
        
        // Agregar evento de clic
        card.addEventListener('click', () => {
            // Desmarcar todas las tarjetas
            document.querySelectorAll('.card').forEach(c => c.classList.remove('border-primary'));
            // Marcar la tarjeta seleccionada
            card.classList.add('border-primary');
            // Actualizar método seleccionado
            state.metodoSeleccionado = metodo;
            // Actualizar el select
            elementos.metodoPagoSelect.value = metodo.id;
            // Mostrar instrucciones en el modal
            actualizarInstruccionesPago(metodo);
        });
        
        col.appendChild(card);
        elementos.metodosPagoContainer.appendChild(col);
    });
    
    // Si hay métodos de pago, seleccionar el primero por defecto
    if (state.metodosPago.length > 0) {
        state.metodoSeleccionado = state.metodosPago[0];
        elementos.metodoPagoSelect.value = state.metodosPago[0].id;
        actualizarInstruccionesPago(state.metodosPago[0]);
    }
}

// Función auxiliar para actualizar las instrucciones de pago
function actualizarInstruccionesPago(metodo) {
    if (!metodo) return;
    
    let instruccionesHTML = `
        <h6>${metodo.name}</h6>
        <p class="mb-2">${metodo.instructions || 'No hay instrucciones específicas.'}</p>
    `;
    
    if (metodo.qr_image_url) {
        instruccionesHTML += `
            <div class="text-center mt-3">
                <img src="${metodo.qr_image_url}" alt="Código QR" class="img-fluid" style="max-width: 200px;">
                <p class="text-muted small mt-2">Escanee el código para realizar el pago</p>
            </div>
        `;
    }
    
    // Actualizar en ambas secciones (modal y pestaña)
    elementos.instruccionesPago.innerHTML = instruccionesHTML;
    elementos.instruccionesPagoModal.innerHTML = instruccionesHTML;
}

// Mostrar detalle de pago
function mostrarDetallePago(pago) {
    const detalles = [
        { label: 'ID de Transacción', value: pago.id },
        { label: 'Fecha', value: new Date(pago.created_at).toLocaleString() },
        { label: 'Método de Pago', value: pago.payment_method },
        { label: 'Monto', value: `$${pago.amount.toFixed(2)}` },
        { label: 'Referencia', value: pago.reference_id || 'N/A' },
        { label: 'Estado', value: pago.status },
        { label: 'ID de Orden', value: pago.order_id || 'N/A' },
        { label: 'Notas', value: pago.notes || 'Ninguna' }
    ];
    
    let detallesHTML = '<div class="list-group">';
    detalles.forEach(detalle => {
        detallesHTML += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${detalle.label}:</h6>
                    <span>${detalle.value}</span>
                </div>
            </div>
        `;
    });
    detallesHTML += '</div>';
    
    Swal.fire({
        title: 'Detalles del Pago',
        html: detallesHTML,
        icon: 'info',
        confirmButtonText: 'Cerrar',
        width: '600px'
    });
}

// Mostrar alerta
function mostrarAlerta(icono, titulo, mensaje) {
    Swal.fire({
        icon: icono,
        title: titulo,
        text: mensaje,
        timer: 3000,
        showConfirmButton: false
    });
}

// Mostrar error
function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        confirmButtonText: 'Entendido'
    });
}

// Inicializar tooltips
function inicializarTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Inicializar popovers
function inicializarPopovers() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// Inicializar componentes
async function inicializarComponentes() {
    try {
        inicializarTooltips();
        inicializarPopovers();
        
        // Cargar datos iniciales
        await verificarAutenticacion();
        await cargarDatosIniciales();
        await cargarHistorialPagos();
        await cargarMetodosPago();
        
        // Configurar eventos
        configurarEventos();
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error al cargar los datos iniciales: ' + error.message);
    }
}

// Inicializar la aplicación
inicializarComponentes();