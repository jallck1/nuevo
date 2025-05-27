const fs = require('fs');
const path = require('path');

// Directorio donde están los archivos HTML
const htmlDir = path.join(__dirname, 'buyer');

// Archivos HTML a actualizar
const htmlFiles = [
    'dashboard.html',
    'catalogo_fix.html',
    'carrito.html',
    'pedidos.html',
    'pqrs.html',
    'perfil.html',
    'pagos.html'
];

// Función para actualizar un archivo HTML
function updateHtmlFile(filename) {
    const filePath = path.join(htmlDir, filename);
    
    try {
        // Leer el contenido del archivo
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Patrón para encontrar el menú de navegación principal
        const navPattern = /(<nav\s+class="hidden md:flex items-center space-x-4">[\s\S]*?<\/nav>)/;
        const match = content.match(navPattern);
        
        if (match) {
            let navContent = match[1];
            
            // Verificar si ya existe el enlace de pagos
            if (!navContent.includes('href="pagos.html"')) {
                // Insertar el enlace de pagos antes del botón de IACHAT
                const updatedNav = navContent.replace(
                    /<button[^>]*iachat[\s\S]*?<\/button>/i, 
                    (match) => {
                        return `
            <a href="pagos.html" class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">Mis Pagos</a>
            ${match}`.trim();
                    }
                );
                
                // Actualizar el contenido
                content = content.replace(navPattern, updatedNav);
                
                // Actualizar el menú móvil
                const mobileMenuPattern = /(<div id="mobile-menu"[\s\S]*?<div class="px-2 pt-2 pb-3 space-y-1">[\s\S]*?)(<a href="[^"]*" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">[^<]*<\/a>\s*<button)/i;
                content = content.replace(
                    mobileMenuPattern,
                    (match, p1, p2) => {
                        return `${p1}
          <a href="pagos.html" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">Mis Pagos</a>
          ${p2}`;
                    }
                );
                
                // Guardar los cambios
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Actualizado: ${filename}`);
            } else {
                console.log(`ℹ️  Ya actualizado: ${filename}`);
            }
        } else {
            console.log(`⚠️  No se encontró el menú de navegación en: ${filename}`);
        }
    } catch (error) {
        console.error(`❌ Error al procesar ${filename}:`, error.message);
    }
}

// Actualizar todos los archivos HTML
console.log('Iniciando actualización de encabezados...');
htmlFiles.forEach(updateHtmlFile);
console.log('Proceso completado.');
