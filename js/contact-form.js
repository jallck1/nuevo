document.addEventListener('DOMContentLoaded', function() {
    // Inicializar EmailJS con la clave pública
    emailjs.init('GyV_SS7mpLEpPc0Sm');
    
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener los datos del formulario
            const formData = new FormData(contactForm);
            const formObject = Object.fromEntries(formData.entries());
            
            // Mostrar mensaje de carga
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';
            
            try {
                // Enviar el correo usando EmailJS
                await emailjs.send(
                    'service_f0yzzvb', // Service ID proporcionado
                    'template_puhb1fq', // Template ID proporcionado
                    {
                        to_email: 'camiloramirez0106@gmail.com',
                        from_name: formObject['full-name'],
                        from_email: formObject.email,
                        subject: formObject.subject,
                        message: formObject.message,
                        reply_to: formObject.email
                    }
                );
                
                // Mostrar mensaje de éxito
                showNotification('¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.', 'success');
                contactForm.reset();
            } catch (error) {
                console.error('Error al enviar el mensaje:', error);
                showNotification('Error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.', 'error');
            } finally {
                // Restaurar el botón
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    // Crear la notificación
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `p-4 rounded-lg shadow-lg text-white ${bgColor} animate-fade-in mb-3`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
            <span>${message}</span>
            <button class="ml-auto text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Agregar la notificación al contenedor
    container.appendChild(notification);
    
    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => {
            if (notification.parentNode === container) {
                container.removeChild(notification);
            }
        }, 500);
    }, 5000);
}
