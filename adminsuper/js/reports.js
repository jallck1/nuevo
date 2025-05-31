/**
 * Módulo de reportes para el panel de administración
 * Muestra gráficos con estadísticas de tiendas y clientes
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const reportsBtn = document.getElementById('reportsBtn');
    const reportsModal = document.getElementById('reportsModal');
    const closeModalBtn = reportsModal?.querySelector('.close-modal');
    const cancelBtn = reportsModal?.querySelector('.btn-cancel');
    const reportsContainer = document.getElementById('reportsContainer');
    const reportsLoading = document.getElementById('reportsLoading');
    
    // Inicializar el modal de reportes
    function initReportsModal() {
        console.log('Iniciando inicialización del modal de reportes...');
        
        if (!reportsBtn) {
            console.error('No se encontró el botón de reportes');
            return;
        }
        
        if (!reportsModal) {
            console.error('No se encontró el modal de reportes');
            return;
        }
        
        console.log('Elementos del DOM encontrados correctamente');
        
        // Función para abrir el modal
        const openModal = async (e) => {
            console.log('Abriendo modal de reportes');
            
            // Prevenir el comportamiento por defecto del botón
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            // Mostrar el modal
            reportsModal.style.display = 'flex';
            
            // Mantener el scroll en el body
            document.body.style.overflow = 'auto';
            
            // Mostrar indicador de carga y ocultar contenido
            if (reportsContainer) reportsContainer.classList.add('hidden');
            if (reportsLoading) {
                reportsLoading.classList.remove('hidden');
                reportsLoading.style.display = 'flex';
                reportsLoading.style.justifyContent = 'center';
                reportsLoading.style.alignItems = 'center';
                reportsLoading.style.minHeight = '200px';
            }
            
            // Forzar un reflow para asegurar que el modal se muestre
            void reportsModal.offsetHeight;
            
            try {
                console.log('Cargando reportes...');
                await loadReports();
                console.log('Reportes cargados correctamente');
                
                if (reportsLoading) reportsLoading.classList.add('hidden');
                if (reportsContainer) reportsContainer.classList.remove('hidden');
            } catch (error) {
                console.error('Error al cargar reportes:', error);
                if (reportsLoading) {
                    reportsLoading.innerHTML = `
                        <div class="text-red-400 text-center py-4">
                            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                            <p>Error al cargar los reportes: ${error.message || 'Error desconocido'}</p>
                        </div>
                    `;
                }
            }
        };

        // Función para cerrar el modal
        const closeModal = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            console.log('Cerrando modal de reportes');
            reportsModal.style.display = 'none';
            
            // Restaurar el scroll del body
            document.body.style.overflow = 'auto';
        };

        // Event listeners
        console.log('Agregando event listeners...');
        
        reportsBtn.addEventListener('click', openModal);
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        } else {
            console.error('No se encontró el botón de cierre del modal');
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        } else {
            console.error('No se encontró el botón de cancelar');
        }
        
        // Cerrar al hacer clic fuera del modal
        window.addEventListener('click', (e) => {
            if (e.target === reportsModal) {
                closeModal(e);
            }
        });
        
        console.log('Event listeners agregados correctamente');
    }
    
    // Cargar datos para los reportes
    async function loadReports() {
        try {
            showLoading(true);
            
            // Obtener estadísticas de tiendas y clientes
            const [storesData, clientsData] = await Promise.all([
                fetchStoresStats(),
                fetchClientsStats()
            ]);
            
            // Renderizar gráficos
            renderCharts(storesData, clientsData);
            
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            showNotification('Error al cargar los reportes: ' + (error.message || 'Error desconocido'), 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Obtener estadísticas de tiendas
    async function fetchStoresStats() {
        try {
            // Obtener todas las tiendas
            const { data: stores, error } = await window.supabaseAdmin
                .from('stores')
                .select('id, name, created_at');
                
            if (error) throw error;
            
            // Procesar datos para el gráfico
            const stats = {
                total: stores.length,
                active: stores.length, // Asumimos que todas las tiendas están activas
                inactive: 0, // No hay estado inactivo
                byMonth: groupByMonth(stores, 'created_at')
            };
            
            return stats;
            
        } catch (error) {
            console.error('Error al cargar estadísticas de tiendas:', error);
            throw error;
        }
    }
    
    // Obtener estadísticas de clientes (administradores con tienda asignada)
    async function fetchClientsStats() {
        try {
            // Obtener los perfiles de administradores que tienen tienda asignada
            const { data: admins, error } = await window.supabaseAdmin
                .from('profiles')
                .select('id, created_at, store_id')
                .not('store_id', 'is', null)
                .eq('role', 'admin');
                
            if (error) throw error;
            
            // Procesar datos para el gráfico
            const stats = {
                total: admins.length,
                active: admins.length, // Todos los administradores con tienda se consideran activos
                inactive: 0,
                byMonth: groupByMonth(admins, 'created_at')
            };
            
            console.log(`Estadísticas de compradores (administradores):`, stats);
            return stats;
            
        } catch (error) {
            console.error('Error al cargar estadísticas de clientes:', error);
            throw error;
        }
    }
    
    // Agrupar datos por mes
    function groupByMonth(items, dateField) {
        const months = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        
        // Inicializar contadores para cada mes
        const monthlyData = months.map(month => ({
            month,
            count: 0
        }));
        
        // Contar ítems por mes
        items.forEach(item => {
            if (!item[dateField]) return;
            
            const date = new Date(item[dateField]);
            const monthIndex = date.getMonth();
            
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyData[monthIndex].count++;
            }
        });
        
        return monthlyData;
    }
    
    // Renderizar gráficos
    function renderCharts(storesData, clientsData) {
        if (!reportsContainer) return;
        
        // Limpiar contenedor
        reportsContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Tarjeta de resumen de tiendas -->
                <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-white mb-4">
                        <i class="fas fa-store mr-2"></i> Resumen de Tiendas
                    </h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-blue-400">${storesData.total}</div>
                            <div class="text-sm text-gray-300">Total</div>
                        </div>
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-green-400">${storesData.active}</div>
                            <div class="text-sm text-gray-300">Activas</div>
                        </div>
                    </div>
                    <div class="h-64">
                        <canvas id="storesChart"></canvas>
                    </div>
                </div>
                
                <!-- Tarjeta de resumen de clientes -->
                <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <h3 class="text-lg font-semibold text-white mb-4">
                        <i class="fas fa-users mr-2"></i> Resumen de Clientes
                    </h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-blue-400">${clientsData.total}</div>
                            <div class="text-sm text-gray-300">Total</div>
                        </div>
                        <div class="bg-gray-700 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-green-400">${clientsData.active}</div>
                            <div class="text-sm text-gray-300">Activos</div>
                        </div>
                    </div>
                    <div class="h-64">
                        <canvas id="clientsChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Gráfico comparativo -->
            <div class="bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 class="text-lg font-semibold text-white mb-4">
                    <i class="fas fa-chart-line mr-2"></i> Crecimiento Anual
                </h3>
                <div class="h-80">
                    <canvas id="growthChart"></canvas>
                </div>
            </div>
        `;
        
        // Inicializar gráficos con Chart.js
        initCharts(storesData, clientsData);
    }
    
    // Inicializar gráficos con Chart.js
    function initCharts(storesData, clientsData) {
        // Verificar si Chart está disponible
        if (typeof Chart === 'undefined') {
            console.error('Chart.js no está cargado');
            return;
        }
        
        // Gráfico de tiendas por mes
        const storesCtx = document.getElementById('storesChart').getContext('2d');
        new Chart(storesCtx, {
            type: 'bar',
            data: {
                labels: storesData.byMonth.map(item => item.month),
                datasets: [{
                    label: 'Tiendas por Mes',
                    data: storesData.byMonth.map(item => item.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9CA3AF',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9CA3AF'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Gráfico de clientes por mes
        const clientsCtx = document.getElementById('clientsChart').getContext('2d');
        new Chart(clientsCtx, {
            type: 'line',
            data: {
                labels: clientsData.byMonth.map(item => item.month),
                datasets: [{
                    label: 'Clientes por Mes',
                    data: clientsData.byMonth.map(item => item.count),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9CA3AF',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9CA3AF'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Gráfico comparativo de crecimiento
        const growthCtx = document.getElementById('growthChart').getContext('2d');
        new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: storesData.byMonth.map(item => item.month),
                datasets: [
                    {
                        label: 'Tiendas',
                        data: storesData.byMonth.map(item => item.count),
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Clientes',
                        data: clientsData.byMonth.map(item => item.count),
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#9CA3AF',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9CA3AF',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9CA3AF'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Mostrar/ocultar indicador de carga
    function showLoading(show) {
        if (!reportsLoading || !reportsContainer) return;
        
        if (show) {
            reportsLoading.classList.remove('hidden');
            reportsContainer.classList.add('hidden');
        } else {
            reportsLoading.classList.add('hidden');
            reportsContainer.classList.remove('hidden');
        }
    }
    
    // Mostrar notificación
    function showNotification(message, type = 'info') {
        // Verificar si ya existe una notificación
        let notification = document.querySelector('.custom-notification');
        
        // Si no existe, crearla
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'custom-notification fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white z-50 transition-all duration-300 transform translate-x-full';
            document.body.appendChild(notification);
        }
        
        // Establecer el mensaje y el estilo según el tipo
        notification.textContent = message;
        notification.className = `custom-notification fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white z-50 transition-all duration-300 transform ${
            type === 'error' ? 'bg-red-600' : 
            type === 'success' ? 'bg-green-600' : 
            'bg-blue-600'
        }`;
        
        // Mostrar la notificación
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
        }, 3000);
    }
    
    // Inicializar el modal de reportes cuando el DOM esté listo
    initReportsModal();
    
    // Hacer las funciones accesibles globalmente si es necesario
    window.showReportsLoading = showLoading;
    window.showReportsNotification = showNotification;
});
