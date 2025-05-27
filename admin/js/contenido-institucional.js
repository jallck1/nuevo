// Estado global
let storeId = null;
let supabase = null;
let tinymceEditors = {};
let currentImages = []; // Almacena las imágenes actuales
const MAX_IMAGES = 5; // Máximo de imágenes permitidas

// Mapeo de claves para estandarizar entre frontend y backend
const CONTENT_KEYS = {
    'quienes_somos': 'aboutUs',
    'politica_datos': 'dataPolicy',
    'terminos_condiciones': 'termsConditions',
    'contacto': 'contactInfo'
};

// Mapeo inverso para obtener la clave del DOM a partir de la clave de la base de datos
const DOM_KEYS = Object.entries(CONTENT_KEYS).reduce((acc, [domKey, dbKey]) => {
    acc[dbKey] = domKey;
    return acc;
}, {});

// Inicializar Supabase
function initSupabase() {
    if (window.supabase) {
        const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';
        
        // Crear el cliente con opciones similares al comprador
        return window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
    }
    console.error('Error: Supabase no está disponible');
    return null;
}

// Cargar contenido de una sección específica
async function loadSectionContent(sectionKey, elementId) {
    try {
        console.log(`Cargando contenido para la sección: ${sectionKey}`);
        
        // Inicializar Supabase si es necesario
        if (!supabase) {
            supabase = initSupabase();
            if (!supabase) {
                throw new Error('No se pudo inicializar Supabase');
            }
        }

        // 1. Verificar sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
            console.log('No hay sesión activa, redirigiendo a login...');
            window.location.href = 'login.html';
            return;
        }

        console.log('✅ Usuario autenticado:', session.user.email);

        // 2. Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('No se pudo obtener la información de la tienda');
        }

        // Usar el store_id del perfil del usuario
        storeId = profile.store_id;
        console.log('📄 Cargando contenido institucional para la tienda ID:', storeId);

        // 3. Obtener la clave de la base de datos usando el mapeo
        const dbKey = CONTENT_KEYS[sectionKey] || sectionKey;
        
        // 4. Construir la consulta
        let query = supabase
            .from('institutional_content')
            .select('*')
            .eq('content_key', dbKey);
            
        // 5. Filtrar por store_id si está disponible
        if (storeId) {
            query = query.eq('store_id', storeId);
        } else {
            // Si no hay store_id, buscar contenido global
            query = query.is('store_id', null);
        }
        
        console.log(`Buscando contenido para ${dbKey} (${sectionKey})...`);
        const { data: content, error } = await query.maybeSingle();

        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Elemento con ID ${elementId} no encontrado`);
            return;
        }
        
        console.log(`Resultado de la consulta para ${sectionKey} (${dbKey}):`, { content, error });

        if (error) {
            console.error(`Error al cargar ${sectionKey}:`, error);
            element.innerHTML = `
                <div class="alert alert-warning">
                    Error al cargar el contenido: ${error.message}
                </div>`;
            return;
        }

        if (!content) {
            console.log(`No se encontró contenido para ${sectionKey} (${dbKey})`);
            element.innerHTML = `
                <div class="alert alert-info">
                    No hay contenido disponible para esta sección. <a href="#" class="alert-link" data-bs-toggle="modal" data-bs-target="#edit${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/-/g, '')}Modal">¿Desea crearlo?</a>
                </div>`;
            element.dataset.contentId = '';
            return;
        }

        // Si llegamos aquí, tenemos contenido
        const contentValue = content.content_value || '';
        element.innerHTML = contentValue || '<p>No hay contenido disponible</p>';
        element.dataset.contentId = content.id;
        
        // Cargar imágenes si es la sección de Quiénes Somos
        if (sectionKey === 'quienes_somos' && content.image_urls && content.image_urls.length > 0) {
            currentImages = content.image_urls.map(url => ({ url }));
            // Retrasar ligeramente para asegurar que el DOM esté listo
            setTimeout(() => {
                renderImages('image-upload-container', currentImages);
            }, 100);
        }
        
        console.log(`Contenido establecido para ${sectionKey} (${dbKey}) (ID: ${content.id})`);
        
    } catch (error) {
        console.error(`❌ Error al cargar la sección ${sectionKey}:`, error);
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    ${error.message || 'Error al cargar el contenido. Por favor, intente nuevamente.'}
                </div>`;
        }
    }
}

// Guardar cambios en una sección
async function saveSectionContent(sectionKey, contentId, contentValue, images = []) {
    try {
        // Inicializar Supabase si es necesario
        if (!supabase) {
            supabase = initSupabase();
            if (!supabase) {
                throw new Error('No se pudo inicializar Supabase');
            }
        }

        // 1. Verificar sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
            console.log('No hay sesión activa, redirigiendo a login...');
            window.location.href = 'login.html';
            return { success: false, error: 'No autenticado' };
        }

        // 2. Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('No se pudo obtener la información de la tienda');
        }

        // Usar el store_id del perfil del usuario
        storeId = profile.store_id;
        console.log('💾 Guardando contenido para la tienda ID:', storeId);

        // 3. Obtener la clave de la base de datos usando el mapeo
        const dbKey = CONTENT_KEYS[sectionKey] || sectionKey;

        // 4. Preparar los datos del contenido
        const contentData = {
            content_key: dbKey,
            content_value: contentValue,
            updated_at: new Date().toISOString(),
            image_urls: Array.isArray(images) && images.length > 0 ? images : []  // Usar solo image_urls hasta actualizar la base de datos
        };

        // 5. Incluir store_id si está disponible
        if (storeId) {
            contentData.store_id = storeId;
        } else {
            // Si no hay store_id, establecerlo como nulo para contenido global
            contentData.store_id = null;
        }


        let result;
        
        if (contentId) {
            // Actualizar contenido existente
            console.log(`Actualizando contenido existente (ID: ${contentId})`);
            const { data, error } = await supabase
                .from('institutional_content')
                .update(contentData)
                .eq('id', contentId)
                .select()
                .single();

            if (error) {
                console.error('Error al actualizar el contenido:', error);
                throw error;
            }
            
            console.log('Contenido actualizado exitosamente');
            return { success: true, data, isNew: false };
        } else {
            // Crear nuevo contenido
            console.log('Creando nuevo contenido');
            const { data, error } = await supabase
                .from('institutional_content')
                .insert([{
                    ...contentData,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error('Error al crear nuevo contenido:', error);
                throw error;
            }
            
            console.log('Nuevo contenido creado exitosamente');
            return { success: true, data, isNew: true };
        }
    } catch (error) {
        console.error('❌ Error al guardar el contenido:', error);
        return { 
            success: false, 
            error: {
                message: error.message || 'Error desconocido al guardar el contenido',
                details: error
            } 
        };
    }
}
function setupFormHandlers() {
    // Mapeo de secciones a sus respectivos IDs (solo las 4 secciones editables)
    const SECTIONS = [
        {
            key: 'quienes_somos',
            contentId: 'quienes-somos-content',
            modalId: 'editQuienesSomosModal',
            editorId: 'quienes-somos-editor',
            formId: 'editQuienesSomosForm'
        },
        {
            key: 'politica_datos',
            contentId: 'politica-datos-content',
            modalId: 'editPoliticaDatosModal',
            editorId: 'politica-datos-editor',
            formId: 'editPoliticaDatosForm'
        },
        {
            key: 'terminos_condiciones',
            contentId: 'terminos-condiciones-content',
            modalId: 'editTerminosModal',
            editorId: 'terminos-condiciones-editor',
            formId: 'editTerminosForm'
        },
        {
            key: 'contacto',
            contentId: 'contacto-content',
            modalId: 'editContactoModal',
            editorId: 'contacto-editor',
            formId: 'editContactoForm'
        }
    ];

    // Configurar manejadores para cada sección
    SECTIONS.forEach(section => {
        // Configurar clic en el botón de editar
        const editButton = document.querySelector(`[data-bs-target="#${section.modalId}"]`);
        if (editButton) {
            editButton.addEventListener('click', function() {
                const contentElement = document.getElementById(section.contentId);
                if (contentElement) {
                    const contentId = contentElement.dataset.contentId || '';
                    const content = contentElement.innerHTML.trim();
                    
                    // Cargar el contenido en el editor correspondiente
                    const editor = tinymce.get(section.editorId);
                    if (editor) {
                        editor.setContent(content);
                    }
                    
                    // Almacenar la información en el formulario
                    const form = document.getElementById(section.formId);
                    if (form) {
                        form.dataset.sectionKey = section.key;
                        form.dataset.contentId = contentId;
                    }
                }
            });
        }
        
        // Configurar envío del formulario
        const form = document.getElementById(section.formId);
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const sectionKey = this.dataset.sectionKey;
                const contentId = this.dataset.contentId || '';
                const editor = tinymce.get(section.editorId);
                const content = editor ? editor.getContent() : '';
                const submitButton = this.querySelector('button[type="submit"]');
                
                if (submitButton) {
                    submitButton.disabled = true;
                    const spinner = submitButton.querySelector('.spinner-border');
                    if (spinner) spinner.classList.remove('d-none');
                }
                
                try {
                    // Obtener las imágenes actuales (asegurarse de que sea un array)
                    const imagenes = Array.isArray(currentImages) ? currentImages : [];
                    console.log('📤 Guardando con imágenes:', imagenes);
                    
                    // Guardar el contenido con las imágenes
                    const result = await saveSectionContent(sectionKey, contentId, content, imagenes);
                    
                    if (result.success) {
                        // Actualizar la vista
                        const contentElement = document.getElementById(section.contentId);
                        if (contentElement) {
                            contentElement.innerHTML = content || '<p>No hay contenido disponible</p>';
                            contentElement.dataset.contentId = result.data?.id || contentId;
                        }
                        
                        // Cerrar el modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById(section.modalId));
                        if (modal) modal.hide();
                        
                        // Mostrar notificación de éxito
                        showToast('¡Éxito!', 'Los cambios se han guardado correctamente.', 'success');
                    } else {
                        throw new Error(result.error?.message || 'Error al guardar los cambios');
                    }
                } catch (error) {
                    console.error('Error al guardar los cambios:', error);
                    showToast('Error', error.message || 'No se pudieron guardar los cambios', 'danger');
                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        const spinner = submitButton.querySelector('.spinner-border');
                        if (spinner) spinner.classList.add('d-none');
                    }
                }
            });
        }
        
        // Configurar el evento para cargar el contenido actual al abrir el modal
        const modalElement = document.getElementById(section.modalId);
        if (modalElement) {
            modalElement.addEventListener('show.bs.modal', async () => {
                try {
                    const contentElement = document.getElementById(section.contentId);
                    if (!contentElement) {
                        console.error(`No se encontró el elemento de contenido para ${section.key}`);
                        return;
                    }
                    
                    // Obtener el ID del contenido si existe
                    const contentId = contentElement.dataset.contentId;
                    let content = '';
                    
                    // Si hay un ID de contenido, intentar cargar el contenido directamente de la base de datos
                    if (contentId) {
                        const { data, error } = await supabase
                            .from('institutional_content')
                            .select('content_value')
                            .eq('id', contentId)
                            .single();
                            
                        if (!error && data) {
                            content = data.content_value || '';
                            console.log(`Contenido cargado desde la base de datos para ${section.key}`);
                        } else {
                            console.warn(`No se pudo cargar el contenido para ${section.key} desde la base de datos:`, error);
                            // Si no se puede cargar de la base de datos, usar el contenido del DOM
                            content = contentElement.innerHTML || '';
                        }
                    } else {
                        // Si no hay ID de contenido, usar el contenido del DOM
                        content = contentElement.innerHTML || '';
                        console.log(`Usando contenido del DOM para ${section.key}`);
                    }
                    
                    // Cargar el contenido en el editor
                    const editor = tinymce.get(section.editorId);
                    if (editor) {
                        try {
                            // Limpiar el contenido de mensajes de error o advertencias
                            if (content.includes('alert-') || content.includes('No hay contenido')) {
                                content = '';
                            } else {
                                // Limpiar cualquier otro mensaje del sistema
                                const temp = document.createElement('div');
                                temp.innerHTML = content;
                                const alerts = temp.querySelectorAll('.alert, .text-muted');
                                alerts.forEach(alert => alert.remove());
                                content = temp.innerHTML;
                            }
                            
                            console.log(`Contenido a cargar en el editor (${section.key}):`, content);
                            editor.setContent(content);
                            
                            // Cargar las imágenes si existen
                            if (data && data.image_urls) {
                                currentImages = Array.isArray(data.image_urls) ? data.image_urls : [];
                                console.log('🖼️ Imágenes cargadas:', currentImages);
                                renderImages('image-upload-container', currentImages);
                            }
                        } catch (error) {
                            console.error(`Error al cargar el contenido en el editor (${section.key}):`, error);
                        }
                    }
                } catch (error) {
                    console.error(`Error al cargar el contenido para ${section.key}:`, error);
                }
            });
        }
    });
}

// Mostrar notificación toast
function showToast(title, message, type = 'info', autohide = true) {
    const toastContainer = document.getElementById('toastContainer') || document.body;
    
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast align-items-center text-white bg-' + (type === 'error' ? 'danger' : type) + ' border-0';
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const toastOptions = {
        autohide: autohide
    };
    
    // Solo establecer delay si autohide es true
    if (autohide) {
        toastOptions.delay = 5000;
    }
    
    const bsToast = new bootstrap.Toast(toast, toastOptions);
    bsToast.show();
    
    // Eliminar el toast del DOM después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
    
    return toast;
}

// Función para renderizar las imágenes en el contenedor
function renderImages(containerId, images) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Limpiar el contenedor
    container.innerHTML = '';

    // Agregar las imágenes existentes
    images.forEach((image, index) => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 mb-4';
        
        // Crear el elemento de la tarjeta
        const card = document.createElement('div');
        card.className = 'card h-100';
        
        // Contenido de la tarjeta
        card.innerHTML = `
            <div class="image-preview position-relative">
                <img src="${image.url}" alt="Imagen ${index + 1}" class="card-img-top" style="height: 180px; object-fit: cover;">
                ${index === 0 ? '<span class="badge bg-success position-absolute top-0 start-0 m-2">Principal</span>' : ''}
                <div class="image-actions position-absolute bottom-0 end-0 m-2">
                    <button type="button" class="btn btn-sm btn-danger me-1" onclick="deleteImage(${index}, '${image.url}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="setAsMainImage(${index})" title="Establecer como principal">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
            </div>
            <div class="card-body p-3">
                <div class="form-group mb-0">
                    <label for="descripcion-${index}" class="small text-muted mb-1">Descripción:</label>
                    <input type="text" 
                           class="form-control form-control-sm imagen-descripcion" 
                           id="descripcion-${index}" 
                           data-index="${index}"
                           value="${image.descripcion || `Administrador ${index + 1}`}"
                           placeholder="Ej: Nombre y cargo">
                </div>
            </div>
        `;
        
        // Agregar evento para guardar la descripción
        const inputDescripcion = card.querySelector(`#descripcion-${index}`);
        if (inputDescripcion) {
            inputDescripcion.addEventListener('change', function() {
                const idx = parseInt(this.dataset.index);
                if (!isNaN(idx) && idx >= 0 && idx < currentImages.length) {
                    currentImages[idx].descripcion = this.value.trim();
                    console.log('Descripción actualizada:', currentImages[idx]);
                }
            });
        }
        
        col.appendChild(card);
        container.appendChild(col);
    });

    // Agregar botón para subir más imágenes si no se ha alcanzado el máximo
    if (images.length < MAX_IMAGES) {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4';
        col.innerHTML = `
            <div class="image-upload-card" style="cursor: pointer;" onclick="document.getElementById('image-upload').click()">
                <div class="card h-100">
                    <div class="card-body text-center d-flex flex-column justify-content-center align-items-center" style="min-height: 150px;">
                        <i class="fas fa-plus-circle fa-3x text-muted mb-2"></i>
                        <span class="text-muted">Agregar imagen</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    }
}

// Función para subir una imagen a Supabase Storage
async function uploadImage(file) {
    if (!supabase) {
        console.error('Supabase no está inicializado');
        return null;
    }

    try {
        // Asegurarse de que el storeId esté definido
        if (!storeId) {
            console.error('storeId no está definido');
            return null;
        }

        // Generar un nombre de archivo único
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${storeId}/${fileName}`;
        const bucketName = 'institutional-images';

        console.log('Subiendo imagen a:', { bucketName, filePath });

        // Subir el archivo a Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error al subir la imagen:', error);
            return null;
        }

        // Obtener la URL pública de la imagen
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        console.log('Imagen subida correctamente:', publicUrl);

        // Devolver un objeto con la URL y una descripción predeterminada
        return {
            url: publicUrl,
            descripcion: `Administrador ${currentImages.length + 1}`
        };
    } catch (error) {
        console.error('Error en uploadImage:', error);
        return null;
    }
}

// Función para eliminar una imagen
async function deleteImage(index, imageUrl) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) return;

    try {
        // Extraer el nombre del archivo de la URL
        const fileName = imageUrl.split('/').pop();
        const filePath = `quienes-somos/${fileName}`;

        // Eliminar el archivo del almacenamiento
        const { error } = await supabase.storage
            .from('institutional-images')
            .remove([filePath]);

        if (error) throw error;

        // Eliminar la imagen del array
        currentImages.splice(index, 1);
        renderImages('image-upload-container', currentImages);
        
        showToast('Éxito', 'Imagen eliminada correctamente', 'success');
    } catch (error) {
        console.error('Error al eliminar la imagen:', error);
        showToast('Error', 'No se pudo eliminar la imagen', 'danger');
    }
}

// Función para establecer una imagen como principal
function setAsMainImage(index) {
    if (index < 0 || index >= currentImages.length) return;
    
    // Crear una copia profunda del array para evitar problemas de referencia
    const updatedImages = [...currentImages];
    
    // Obtener la imagen que se va a mover al principio
    const [movedImage] = updatedImages.splice(index, 1);
    
    // Insertar la imagen al principio del array
    updatedImages.unshift(movedImage);
    
    // Actualizar el array de imágenes
    currentImages = updatedImages;
    
    // Volver a renderizar las imágenes
    renderImages('image-upload-container', currentImages);
    
    console.log('Imagen principal actualizada:', currentImages[0]);
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Crear contenedor para toasts si no existe
        if (!document.getElementById('toastContainer')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '1100';
            document.body.appendChild(toastContainer);
        }

        // Inicializar Supabase
        supabase = initSupabase();
        if (!supabase) {
            throw new Error('No se pudo inicializar Supabase');
        }

        // Verificar sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        // Cargar el contenido de las 4 secciones principales usando las claves de CONTENT_KEYS
        const sectionsToLoad = [
            { key: 'quienes_somos', elementId: 'quienes-somos-content' },
            { key: 'politica_datos', elementId: 'politica-datos-content' },
            { key: 'terminos_condiciones', elementId: 'terminos-condiciones-content' },
            { key: 'contacto', elementId: 'contacto-content' }
        ];

        // Cargar el contenido de cada sección
        sectionsToLoad.forEach(section => {
            // Usar la clave mapeada para la base de datos
            const dbKey = CONTENT_KEYS[section.key] || section.key;
            loadSectionContent(dbKey, section.elementId);
        });

        // Configurar manejador de carga de imágenes
        const imageUpload = document.getElementById('image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                let loadingToast = null;
                
                // Validar cantidad de imágenes
                if (currentImages.length + files.length > MAX_IMAGES) {
                    showToast('Error', `Solo puedes subir hasta ${MAX_IMAGES} imágenes`, 'danger');
                    return;
                }
                
                try {
                    // Mostrar indicador de carga
                    loadingToast = showToast('Cargando', 'Subiendo imágenes...', 'info', false);
                    
                    // Subir cada imagen
                    const uploadPromises = files.map(file => uploadImage(file));
                    const uploadedUrls = await Promise.all(uploadPromises);
                    
                    // Filtrar URLs nulas (errores en la subida)
                    const validImages = uploadedUrls.filter(img => img !== null);
                    
                    if (validImages.length > 0) {
                        // Agregar las nuevas imágenes al array
                        currentImages = [...currentImages, ...validImages];
                        
                        // Actualizar la vista
                        renderImages('image-upload-container', currentImages);
                        
                        showToast('Éxito', 'Imágenes subidas correctamente', 'success');
                    } else {
                        showToast('Error', 'No se pudo subir ninguna imagen', 'danger');
                    }
                } catch (error) {
                    console.error('Error al subir imágenes:', error);
                    showToast('Error', 'Ocurrió un error al subir las imágenes', 'danger');
                } finally {
                    // Cerrar el toast de carga si existe
                    if (loadingToast) {
                        const bsToast = bootstrap.Toast.getInstance(loadingToast);
                        if (bsToast) {
                            bsToast.hide();
                            // Esperar a que la animación termine antes de eliminar
                            setTimeout(() => {
                                loadingToast.remove();
                            }, 300);
                        }
                    }
                    // Limpiar el input de archivo
                    if (e && e.target) {
                        e.target.value = '';
                    }
                }
            });
        }

        // Configurar manejadores de eventos
        setupFormHandlers();

        let tinymceInitialized = false;

        // Configurar el editor TinyMCE (solo una vez)
        if (typeof tinymce !== 'undefined' && !tinymceInitialized) {
            tinymce.init({
                selector: '.html-editor',
                height: 400,
                menubar: false,
                plugins: [
                    'advlist autolink lists link image charmap',
                    'searchreplace visualblocks code fullscreen',
                    'insertdatetime media table code help wordcount autoresize'
                ],
                toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                setup: function(editor) {
                    editor.on('init', function() {
                        // Asegurarse de que el editor esté visible al abrir el modal
                        const modal = editor.getElement().closest('.modal');
                        if (modal) {
                            modal.addEventListener('shown.bs.modal', function() {
                                editor.focus();
                            });
                        }
                    });
                },
                // Deshabilitar mensajes de consola
                branding: false,
                statusbar: false,
                // Configuración de la barra de herramientas
                toolbar_mode: 'scrolling',
                // Configuración de la caché
                cache_suffix: '?v=1.0.0',
                // Deshabilitar la carga de scripts externos
                external_plugins: {}
            });
            tinymceInitialized = true;
        }

        // Mostrar notificación de carga exitosa
        showToast('Sistema listo', 'El contenido institucional se ha cargado correctamente', 'success');
    } catch (error) {
        console.error('Error al inicializar la página:', error);
        showToast('Error', 'Error al cargar la página. Por favor, recargue e intente nuevamente.', 'danger');
    }
});