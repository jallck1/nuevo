document.addEventListener('DOMContentLoaded', function() {
    // Función para actualizar el avatar del usuario
    function updateUserAvatar() {
        // Obtener el nombre del usuario (en un caso real, esto vendría de la sesión)
        const userName = 'Usuario'; // Aquí deberías obtener el nombre del usuario logueado
        const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';
        
        // Actualizar todos los avatares en la página
        document.querySelectorAll('[data-initials]').forEach(button => {
            const initialsSpan = button.querySelector('#user-initials');
            const avatarImg = button.querySelector('#user-avatar');
            
            if (initialsSpan) {
                initialsSpan.textContent = userInitial;
                button.setAttribute('data-initials', userInitial);
            }
            
            // Si hay una imagen de perfil, la mostramos
            // En un caso real, verificarías si el usuario tiene una imagen de perfil
            const userHasImage = false; // Cambiar a true si el usuario tiene imagen
            
            if (userHasImage && avatarImg) {
                avatarImg.classList.remove('hidden');
                if (initialsSpan) initialsSpan.classList.add('hidden');
                // Aquí iría la URL de la imagen de perfil del usuario
                // avatarImg.src = user.profileImageUrl;
            } else {
                if (avatarImg) avatarImg.classList.add('hidden');
                if (initialsSpan) initialsSpan.classList.remove('hidden');
            }
        });
    }
    
    // Llamar a la función al cargar la página
    updateUserAvatar();
    
    // También podrías llamar a esta función cuando el usuario actualice su perfil
    
    // Manejar el clic en el botón de cerrar sesión
    document.querySelectorAll('#sign-out-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // Aquí iría la lógica para cerrar sesión
            console.log('Cerrar sesión');
            // Redirigir al login
            // window.location.href = 'login.html';
        });
    });
    
    // Manejar el menú desplegable del usuario
    document.querySelectorAll('#user-menu-button').forEach(button => {
        const menu = button.nextElementSibling;
        
        button.addEventListener('click', function() {
            const isExpanded = button.getAttribute('aria-expanded') === 'true' || false;
            button.setAttribute('aria-expanded', !isExpanded);
            menu.classList.toggle('hidden');
        });
        
        // Cerrar el menú al hacer clic fuera
        document.addEventListener('click', function(event) {
            if (!button.contains(event.target) && !menu.contains(event.target)) {
                button.setAttribute('aria-expanded', 'false');
                menu.classList.add('hidden');
            }
        });
    });
});
