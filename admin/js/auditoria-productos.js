// Configuración de auditoría para productos
const ProductAudit = {
    // Función para registrar cambios en productos
    async logProductChange(action, productId, changes = {}) {
        try {
            // Obtener la sesión actual
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                console.error('Error de autenticación:', sessionError);
                return null;
            }

            // Obtener el perfil del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, store_id')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                console.error('Error al obtener el perfil:', profileError);
                return null;
            }

            // Crear el registro de auditoría
            const auditData = {
                action,
                target_entity: 'products',
                target_id: productId,
                store_id: profile.store_id,
                user_id: session.user.id,
                details: changes,
                ip_address: await this.getClientIP()
            };

            // Insertar en la tabla de auditoría
            const { data, error } = await supabase
                .from('audit_logs')
                .insert([auditData])
                .select();

            if (error) {
                console.error('Error al registrar auditoría:', error);
                return null;
            }

            return data[0];
        } catch (error) {
            console.error('Error en logProductChange:', error);
            return null;
        }
    },

    // Función auxiliar para obtener la IP del cliente
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            console.error('Error al obtener la IP:', error);
            return 'unknown';
        }
    },

    // Función para formatear los detalles de auditoría en la interfaz
    formatAuditDetails(details) {
        if (!details) return '';
        
        // Si hay cambios específicos
        if (details.changes) {
            let html = '<div class="space-y-4">';
            
            // Mostrar campos actualizados
            if (details.updated_fields && details.updated_fields.length > 0) {
                html += '<div class="mb-4">';
                html += '<span class="font-medium">Campos actualizados:</span> ';
                html += `<span class="text-sm text-gray-600">${details.updated_fields.join(', ')}</span>`;
                html += '</div>';
            }
            
            // Mostrar cambios
            html += '<div class="space-y-3">';
            for (const [field, values] of Object.entries(details.changes)) {
                html += `
                    <div class="border-l-4 border-blue-200 pl-3 py-1">
                        <div class="font-medium text-gray-800">${this.formatFieldName(field)}</div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="bg-green-50 p-2 rounded">
                                <div class="text-xs text-green-600 font-medium">Valor anterior:</div>
                                <div class="text-green-800">${this.formatValue(values.from)}</div>
                            </div>
                            <div class="bg-blue-50 p-2 rounded">
                                <div class="text-xs text-blue-600 font-medium">Nuevo valor:</div>
                                <div class="text-blue-800">${this.formatValue(values.to)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            html += '</div></div>';
            return html;
        }
        
        // Si no hay cambios específicos, mostrar el JSON formateado
        return `<pre class="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-60">${JSON.stringify(details, null, 2)}</pre>`;
    },

    // Función para formatear nombres de campos
    formatFieldName(field) {
        const fieldNames = {
            'name': 'Nombre',
            'description': 'Descripción',
            'price': 'Precio',
            'stock': 'Inventario',
            'category': 'Categoría',
            'status': 'Estado',
            'image_url': 'Imagen',
            'sku': 'SKU',
            'barcode': 'Código de barras',
            'weight': 'Peso',
            'dimensions': 'Dimensiones'
        };
        return fieldNames[field] || field;
    },

    // Función para formatear valores
    formatValue(value) {
        if (value === null || value === undefined) return '<span class="text-gray-400">No definido</span>';
        if (value === '') return '<span class="text-gray-400">Vacío</span>';
        if (typeof value === 'boolean') return value ? 'Sí' : 'No';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return value;
    }
};

// Hacer disponible globalmente
window.ProductAudit = ProductAudit;
