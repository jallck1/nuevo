// Estado global
let storeId = null;
let supabase = null;

// Función para inicializar Supabase
function initSupabase() {
    if (window.supabase) {
        const supabaseUrl = 'https://ywmspibcnhfmqmnutpyg.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU';
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        return true;
    }
    return false;
}

// Intentar inicializar Supabase al cargar el script
const supabaseReady = initSupabase();

// Estilos CSS para el carrusel de círculos
function agregarEstilosCarrusel() {
    const styleId = 'estilos-carrusel-circulos';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .circles-carousel {
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem 0;
        }
        .circles-container {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .circle-item {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid #fff;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
            position: relative;
        }
        .circle-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        }
        .circle-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .circle-item.active {
            border-color: #3b82f6;
            transform: scale(1.1);
        }
        .preview-container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .preview-container img {
            width: 100%;
            height: auto;
            display: block;
        }
        .circles-nav {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .circles-nav button {
            background: #e5e7eb;
            border: none;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            padding: 0;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .circles-nav button.active {
            background: #3b82f6;
            transform: scale(1.3);
        }
        @media (max-width: 768px) {
            .circle-item {
                width: 80px;
                height: 80px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Función para inicializar el carrusel de círculos
function inicializarCarruselCirculos(element, imageData) {
    if (!element || !imageData || imageData.length === 0) return;
    
    // Limpiar el contenido existente
    element.innerHTML = '';
    
    // Crear contenedor principal
    const carruselContainer = document.createElement('div');
    carruselContainer.className = 'circles-carousel';
    carruselContainer.style.position = 'relative';
    carruselContainer.style.width = '100%';
    carruselContainer.style.display = 'flex';
    carruselContainer.style.justifyContent = 'center';
    carruselContainer.style.alignItems = 'center';
    carruselContainer.style.flexDirection = 'column';
    
    // Crear contenedor de imágenes
    const imagesContainer = document.createElement('div');
    imagesContainer.style.display = 'flex';
    imagesContainer.style.justifyContent = 'center';
    imagesContainer.style.alignItems = 'center';
    imagesContainer.style.width = '100%';
    imagesContainer.style.position = 'relative';
    imagesContainer.style.minHeight = '350px'; // Aumentado para dar espacio al texto
    
    // Contenedor para el texto descriptivo
    const descripcionContainer = document.createElement('div');
    descripcionContainer.className = 'carousel-description';
    descripcionContainer.style.textAlign = 'center';
    descripcionContainer.style.margin = '20px 0';
    descripcionContainer.style.minHeight = '50px';
    descripcionContainer.style.width = '100%';
    descripcionContainer.style.fontSize = '1.1rem';
    descripcionContainer.style.color = '#333';
    
    // Crear elementos de imagen y puntos
    const circlesContainer = document.createElement('div');
    circlesContainer.style.display = 'flex';
    circlesContainer.style.justifyContent = 'center';
    circlesContainer.style.marginTop = '20px';
    circlesContainer.style.gap = '10px';
    
    let currentIndex = 0;
    
    // Función para actualizar la vista activa
    function actualizarVistaActiva(index) {
        // Actualizar imágenes
        const images = imagesContainer.querySelectorAll('.carousel-image-wrapper');
        images.forEach((wrapper, i) => {
            wrapper.style.opacity = i === index ? '1' : '0';
            wrapper.style.transform = i === index ? 'scale(1.1)' : 'scale(0.9)';
            wrapper.style.zIndex = i === index ? '1' : '0';
            wrapper.style.visibility = i === index ? 'visible' : 'hidden';
        });
        
        // Actualizar puntos
        const dots = circlesContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.style.backgroundColor = i === index ? '#007bff' : '#ccc';
        });
        
        // Actualizar texto descriptivo
        const currentItem = imageData[index];
        const descripcion = currentItem?.descripcion || currentItem?.title || '';
        descripcionContainer.innerHTML = descripcion ? 
            `<div style="padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px; max-width: 80%; margin: 0 auto;">
                <p style="margin: 0; font-weight: 500;">${descripcion}</p>
            </div>` : '';
    }
    
    // Crear imágenes
    console.log('🎨 Inicializando carrusel con datos:', imageData);
    imageData.forEach((item, index) => {
        console.log(`🖼️ Procesando imagen ${index} en carrusel:`, item);
        const imgUrl = typeof item === 'string' ? item : (item.url || '');
        console.log(`   URL de la imagen ${index}:`, imgUrl);
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'carousel-image-wrapper';
        imgWrapper.style.position = 'absolute';
        imgWrapper.style.display = 'flex';
        imgWrapper.style.flexDirection = 'column';
        imgWrapper.style.alignItems = 'center';
        imgWrapper.style.transition = 'all 0.5s ease-in-out';
        imgWrapper.style.opacity = '0';
        imgWrapper.style.transform = 'scale(0.9)';
        imgWrapper.style.width = '100%';
        imgWrapper.style.maxWidth = '250px';
        
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = `Imagen ${index + 1}`;
        img.className = 'carousel-image';
        img.style.width = '200px';
        img.style.height = '200px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.border = '3px solid #fff';
        img.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        img.style.cursor = 'pointer';
        img.style.display = 'block'; // Asegurar que la imagen se muestre
        img.onerror = function() {
            console.error('❌ Error al cargar la imagen:', imgUrl);
            this.style.display = 'none';
        };
        img.onload = function() {
            console.log('✅ Imagen cargada correctamente:', imgUrl);
        };
        
        // Al hacer clic en la imagen, ir a esa imagen
        img.addEventListener('click', () => {
            currentIndex = index;
            actualizarVistaActiva(currentIndex);
        });
        
        imgWrapper.appendChild(img);
        imagesContainer.appendChild(imgWrapper);
        
        // Crear puntos de navegación
        const dot = document.createElement('div');
        dot.className = 'carousel-dot';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = index === 0 ? '#007bff' : '#ccc';
        dot.style.cursor = 'pointer';
        dot.style.transition = 'background-color 0.3s';
        
        dot.addEventListener('click', () => {
            currentIndex = index;
            actualizarVistaActiva(currentIndex);
        });
        
        circlesContainer.appendChild(dot);
    });
    
    // Botones de navegación
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '❮';
    prevButton.style.position = 'absolute';
    prevButton.style.left = '20px';
    prevButton.style.top = '50%';
    prevButton.style.transform = 'translateY(-50%)';
    prevButton.style.background = 'rgba(0,0,0,0.5)';
    prevButton.style.color = 'white';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '50%';
    prevButton.style.width = '40px';
    prevButton.style.height = '40px';
    prevButton.style.cursor = 'pointer';
    prevButton.style.fontSize = '20px';
    prevButton.style.display = 'flex';
    prevButton.style.justifyContent = 'center';
    prevButton.style.alignItems = 'center';
    prevButton.style.zIndex = '2';
    
    const nextButton = prevButton.cloneNode(true);
    nextButton.innerHTML = '❯';
    nextButton.style.left = '';
    nextButton.style.right = '20px';
    
    // Event listeners para los botones
    prevButton.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + imageData.length) % imageData.length;
        actualizarVistaActiva(currentIndex);
    });
    
    nextButton.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % imageData.length;
        actualizarVistaActiva(currentIndex);
    });
    
    // Auto-rotación
    function autoRotate() {
        currentIndex = (currentIndex + 1) % imageData.length;
        actualizarVistaActiva(currentIndex);
    }
    
    // Rotar cada 5 segundos
    let rotateInterval = setInterval(autoRotate, 5000);
    
    // Pausar al hacer hover
    carruselContainer.addEventListener('mouseenter', () => {
        clearInterval(rotateInterval);
    });
    
    carruselContainer.addEventListener('mouseleave', () => {
        clearInterval(rotateInterval);
        rotateInterval = setInterval(autoRotate, 5000);
    });
    
    // Agregar elementos al DOM
    carruselContainer.appendChild(imagesContainer);
    carruselContainer.appendChild(prevButton);
    carruselContainer.appendChild(nextButton);
    carruselContainer.appendChild(descripcionContainer);
    carruselContainer.appendChild(circlesContainer);
    element.appendChild(carruselContainer);
    
    // Mostrar la primera imagen
    actualizarVistaActiva(0);
}

// Función para cargar contenido institucional
async function cargarContenidoInstitucional(contentKey, elementId) {
    try {
        // 1. Verificar que Supabase esté inicializado
        if (!supabase) {
            // Intentar inicializar nuevamente
            if (!initSupabase()) {
                throw new Error('Error: No se pudo cargar Supabase. Por favor, recarga la página.');
            }
            if (!supabase) {
                throw new Error('Error: No se pudo inicializar Supabase. Por favor, recarga la página.');
            }
        }
        
        // 2. Verificar sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        console.log('✅ Usuario autenticado:', session.user.email);

        // 3. Obtener el perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('No se pudo obtener la información de la tienda');
        }

        console.log('📄 Cargando contenido institucional para la tienda ID:', profile.store_id);

        // 4. Obtener el contenido institucional
        const { data: content, error } = await supabase
            .from('institutional_content')
            .select('*')
            .eq('store_id', profile.store_id)
            .eq('content_key', contentKey)
            .single();

        if (error) throw error;
        if (!content) throw new Error('No se encontró el contenido solicitado');

        // 5. Mostrar el contenido
        console.log('📦 Contenido recibido:', content);
        console.log('🖼️ Imágenes recibidas:', content.images);
        
        const element = document.getElementById(elementId);
        if (element) {
            // Limpiar el contenido existente
            element.innerHTML = '';
            
            // Agregar los estilos del carrusel
            agregarEstilosCarrusel();
            
            // Verificar si hay imágenes para mostrar
            console.log('📦 Contenido completo recibido:', content);
            
            // Obtener las imágenes del campo image_urls (puede ser un array o null/undefined)
            console.log('📌 Contenido recibido para procesar:', content);
            let imagenes = [];
            
            // Usar image_urls directamente
            if (Array.isArray(content.image_urls)) {
                console.log('📂 image_urls es un array:', content.image_urls);
                imagenes = content.image_urls;
            }
            // Si es un string, intentar convertirlo a array
            else if (typeof content.image_urls === 'string') {
                console.log('📜 image_urls es un string, intentando parsear:', content.image_urls);
                try {
                    imagenes = JSON.parse(content.image_urls);
                    console.log('✅ image_urls parseado exitosamente:', imagenes);
                } catch (e) {
                    console.error('❌ Error al parsear image_urls:', e);
                }
            } else {
                console.log('⚠️ No se encontró image_urls o no es un tipo válido:', content.image_urls);
            }
            
            console.log('🖼️ Datos de imágenes encontrados:', imagenes);
            
            // Procesar los datos de las imágenes
            console.log('🔄 Procesando imágenes. Total:', imagenes.length);
            const imagenesProcesadas = imagenes.map((img, index) => {
                console.log(`🖼️ Procesando imagen ${index}:`, img);
                
                // Si es un string, crear un objeto con la URL y una descripción por defecto
                if (typeof img === 'string') {
                    console.log(`  🔄 Imagen ${index} es un string, convirtiendo a objeto`);
                    return {
                        url: img,
                        descripcion: `Administrador ${index + 1}`
                    };
                }
                // Si es un objeto, asegurarse de que tenga los campos necesarios
                else if (img && typeof img === 'object') {
                    console.log(`  🔍 Imagen ${index} es un objeto:`, img);
                    const processed = {
                        url: img.url || img.image_url || '',
                        descripcion: img.descripcion || img.title || `Administrador ${index + 1}`
                    };
                    console.log(`  ✅ Imagen ${index} procesada:`, processed);
                    return processed;
                }
                console.log(`  ❌ Imagen ${index} no es un tipo válido:`, img);
                return null;
            }).filter(img => img && img.url); // Filtrar entradas inválidas
            
            console.log('🖼️ Imágenes procesadas:', imagenesProcesadas);
            
            // Si hay imágenes válidas, mostrar el carrusel
            if (imagenesProcesadas.length > 0) {
                console.log('Inicializando carrusel con', imagenesProcesadas.length, 'imágenes');
                // Inicializar el carrusel de círculos con las imágenes y sus descripciones
                inicializarCarruselCirculos(element, imagenesProcesadas);
                
                // Agregar un espaciador
                const spacer = document.createElement('div');
                spacer.style.height = '2rem';
                element.appendChild(spacer);
            } else {
                console.log('No se encontraron imágenes válidas para mostrar');
            }
            
            // Agregar el contenido HTML
            if (content.content_value) {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'institutional-content';
                contentDiv.innerHTML = content.content_value;
                element.appendChild(contentDiv);
            }
        }
    } catch (error) {
        console.error('❌ Error al cargar contenido institucional:', error);
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" xmlns="http://www3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-red-700">
                                ${error.message || 'No se pudo cargar el contenido. Por favor, intente nuevamente más tarde.'}
                            </p>
                        </div>
                    </div>
                </div>`;
        }
    }
}

// Función para formatear el contenido (si es necesario)
function formatearContenido(contenido) {
    // Aquí puedes agregar cualquier lógica de formateo adicional
    return contenido;
}
