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
        showError('No se pudo cargar el sistema. Por favor, recarga la página.');
        return;
    }
    
    loadDevoluciones();
});

async function loadDevoluciones() {
    const devolucionesList = document.getElementById('devolucionesList');
    if (!devolucionesList) return;

    try {
        // Obtener el ID del usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Debe iniciar sesión para ver sus devoluciones');
        }

        // Obtener las devoluciones del usuario
        const { data: devoluciones, error } = await supabase
            .from('returns')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Limpiar el contenedor
        devolucionesList.innerHTML = '';

        if (devoluciones.length === 0) {
            devolucionesList.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-box-open text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg font-medium">No hay devoluciones registradas</p>
                    <p class="mt-1">Aún no has realizado ninguna solicitud de devolución.</p>
                    <a href="devoluciones.html" class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i> Solicitar Devolución
                    </a>
                </div>`;
            return;
        }

        // Mostrar las devoluciones
        const template = document.getElementById('devolucionTemplate');
        
        devoluciones.forEach(devolucion => {
            const clone = template.content.cloneNode(true);
            
            // Llenar los datos
            clone.querySelector('#orderId').textContent = devolucion.order_id;
            clone.querySelector('#reason').textContent = devolucion.reason;
            clone.querySelector('#description').textContent = devolucion.description;
            
            // Formatear fecha
            const fecha = new Date(devolucion.created_at);
            clone.querySelector('#fecha').textContent = fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Establecer el estado
            const statusElement = clone.querySelector('#status');
            const statusIcon = clone.querySelector('#statusIcon');
            
            statusElement.textContent = devolucion.status;
            
            // Estilos según el estado
            switch(devolucion.status.toLowerCase()) {
                case 'pendiente':
                    statusElement.classList.add('bg-yellow-100', 'text-yellow-800');
                    statusIcon.className = 'fas fa-clock text-yellow-500';
                    break;
                case 'aprobado':
                    statusElement.classList.add('bg-green-100', 'text-green-800');
                    statusIcon.className = 'fas fa-check-circle text-green-500';
                    break;
                case 'rechazado':
                    statusElement.classList.add('bg-red-100', 'text-red-800');
                    statusIcon.className = 'fas fa-times-circle text-red-500';
                    break;
                case 'en proceso':
                    statusElement.classList.add('bg-blue-100', 'text-blue-800');
                    statusIcon.className = 'fas fa-sync-alt text-blue-500 animate-spin';
                    break;
                default:
                    statusElement.classList.add('bg-gray-100', 'text-gray-800');
                    statusIcon.className = 'fas fa-info-circle text-gray-500';
            }
            
            devolucionesList.appendChild(clone);
        });

    } catch (error) {
        console.error('Error al cargar las devoluciones:', error);
        showError('No se pudieron cargar las devoluciones. Por favor, intenta de nuevo más tarde.');
    }
}

function showError(message) {
    const devolucionesList = document.getElementById('devolucionesList');
    if (devolucionesList) {
        devolucionesList.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p class="text-lg font-medium">Error al cargar las devoluciones</p>
                <p class="mt-1">${message}</p>
                <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md">
                    <i class="fas fa-sync-alt mr-2"></i>Reintentar
                </button>
            </div>`;
    }
}
