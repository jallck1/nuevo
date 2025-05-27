import { ROUTES } from '../config/routes.js';
import { AuthService } from '../services/auth.service.js';
import { getDefaultRoute } from '../config/routes.js';

// Smooth scroll function
function smoothScroll(target) {
  const element = document.querySelector(target);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

export async function renderHome() {
  const app = document.getElementById('app');
  
  // Check if user is authenticated
  const isAuthenticated = await AuthService.isAuthenticated();
  
  // Redirect to dashboard if authenticated
  if (isAuthenticated) {
    const user = await AuthService.getCurrentUser();
    const defaultRoute = getDefaultRoute(user.role);
    window.navigateTo(defaultRoute);
    return;
  }

  // Render home page
  app.innerHTML = `
    <style>
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
      .hero-pattern {
        background-image: linear-gradient(rgba(37, 99, 235, 0.9), rgba(29, 78, 216, 0.9)), 
                          url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
      }
      .card-hover {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .card-hover:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      }
      .btn-primary {
        transition: all 0.3s ease;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
      .btn-outline-white {
        transition: all 0.3s ease;
      }
      .btn-outline-white:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
    </style>
    <div class="min-h-screen flex flex-col">
      <!-- Navbar -->
      <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-20">
            <div class="flex items-center">
              <span class="text-2xl font-bold text-blue-600">CréditoFácil</span>
            </div>
            <div class="hidden md:flex items-center space-x-6">
              <a href="${ROUTES.HOME}" data-route class="text-gray-700 hover:text-blue-600 transition-colors">Inicio</a>
              <a href="#features" class="text-gray-700 hover:text-blue-600 transition-colors">Características</a>
              <a href="#how-it-works" class="text-gray-700 hover:text-blue-600 transition-colors">¿Cómo funciona?</a>
              <a href="#testimonials" class="text-gray-700 hover:text-blue-600 transition-colors">Testimonios</a>
              <a href="#contact" class="text-gray-700 hover:text-blue-600 transition-colors">Contacto</a>
              <div class="h-6 w-px bg-gray-200"></div>
              <a href="${ROUTES.LOGIN}" data-route class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md font-medium">
                Iniciar sesión
              </a>
              <a href="${ROUTES.REGISTER}" data-route class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors">
                Registrarse
              </a>
            </div>
            <!-- Mobile menu button -->
            <div class="md:hidden flex items-center">
              <button type="button" class="text-gray-500 hover:text-gray-600 focus:outline-none" id="mobile-menu-button">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <!-- Mobile menu -->
        <div class="md:hidden hidden bg-white py-2 px-4" id="mobile-menu">
          <div class="flex flex-col space-y-3 py-2">
            <a href="${ROUTES.HOME}" data-route class="text-gray-700 hover:text-blue-600 transition-colors py-2">Inicio</a>
            <a href="#features" class="text-gray-700 hover:text-blue-600 transition-colors py-2">Características</a>
            <a href="#how-it-works" class="text-gray-700 hover:text-blue-600 transition-colors py-2">¿Cómo funciona?</a>
            <a href="#testimonials" class="text-gray-700 hover:text-blue-600 transition-colors py-2">Testimonios</a>
            <a href="#contact" class="text-gray-700 hover:text-blue-600 transition-colors py-2">Contacto</a>
            <div class="pt-2 mt-2 border-t border-gray-100">
              <a href="${ROUTES.LOGIN}" data-route class="block text-center py-2 text-blue-600 font-medium">
                Iniciar sesión
              </a>
              <a href="${ROUTES.REGISTER}" data-route class="block mt-2 text-center py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                Registrarse
              </a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <div class="hero-pattern min-h-screen flex items-center justify-center text-white relative overflow-hidden">
        <div class="absolute inset-0 bg-black opacity-20"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10 text-center">
          <div class="animate-fadeInUp">
            <span class="inline-block bg-white bg-opacity-20 text-white text-sm font-semibold px-4 py-1 rounded-full mb-6">
              ¡Nueva plataforma disponible!
            </span>
            <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Control total sobre tus <span class="text-yellow-300">créditos</span>
            </h1>
            <p class="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              Simplificamos la gestión de préstamos con una plataforma segura, rápida y fácil de usar para tu negocio.
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-5">
              <a href="${ROUTES.REGISTER}" data-route 
                 class="btn-primary px-8 py-4 bg-white text-blue-700 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                Comenzar gratis
                <i class="fas fa-arrow-right ml-2"></i>
              </a>
              <a href="#features" 
                 class="btn-outline-white px-8 py-4 border-2 border-white text-white rounded-xl font-semibold text-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300 transform hover:-translate-y-1">
                Ver características
                <i class="fas fa-chevron-down ml-2"></i>
              </a>
            </div>
            <div class="mt-12 flex items-center justify-center space-x-8">
              <div class="flex items-center">
                <div class="flex -space-x-2">
                  <img class="h-10 w-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/44.jpg" alt="Client 1">
                  <img class="h-10 w-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/32.jpg" alt="Client 2">
                  <img class="h-10 w-10 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/68.jpg" alt="Client 3">
                </div>
                <div class="ml-4 text-left">
                  <div class="flex items-center">
                    <div class="flex text-yellow-300">
                      <i class="fas fa-star"></i>
                      <i class="fas fa-star"></i>
                      <i class="fas fa-star"></i>
                      <i class="fas fa-star"></i>
                      <i class="fas fa-star"></i>
                    </div>
                    <span class="ml-2 text-white font-medium">5.0</span>
                  </div>
                  <p class="text-sm text-blue-100">+10,000 clientes satisfechos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2">
          <a href="#features" class="text-white animate-bounce">
            <i class="fas fa-chevron-down text-2xl"></i>
          </a>
        </div>
      </div>

      <!-- Features Section -->
      <div id="features" class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">Características principales</h2>
            <p class="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
              Todo lo que necesitas para gestionar tus créditos de manera eficiente
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-xl shadow-sm card-hover">
              <div class="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                <i class="fas fa-shield-alt text-2xl text-blue-600"></i>
              </div>
              <h3 class="text-xl font-bold mb-3">Seguridad garantizada</h3>
              <p class="text-gray-600">Tus datos están protegidos con encriptación de nivel bancario.</p>
            </div>
            <div class="bg-white p-8 rounded-xl shadow-sm card-hover">
              <div class="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                <i class="fas fa-bolt text-2xl text-blue-600"></i>
              </div>
              <h3 class="text-xl font-bold mb-3">Rápido y sencillo</h3>
              <p class="text-gray-600">Gestiona préstamos en minutos con nuestra interfaz intuitiva.</p>
            </div>
            <div class="bg-white p-8 rounded-xl shadow-sm card-hover">
              <div class="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-6">
                <i class="fas fa-headset text-2xl text-blue-600"></i>
              </div>
              <h3 class="text-xl font-bold mb-3">Soporte 24/7</h3>
              <p class="text-gray-600">Nuestro equipo está disponible para ayudarte en cualquier momento.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Section -->
      <div id="contact" class="bg-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">Contáctanos</h2>
            <p class="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              ¿Tienes alguna pregunta? Estamos aquí para ayudarte. Completa el formulario y nos pondremos en contacto contigo lo antes posible.
            </p>
          </div>
          
          <div class="mt-10">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <!-- Contact Information -->
              <div class="space-y-8">
                <div>
                  <h3 class="text-lg font-medium text-gray-900">Ubicación</h3>
                  <p class="mt-2 text-gray-600">Av. Principal 1234, Ciudad, País</p>
                </div>
                
                <div>
                  <h3 class="text-lg font-medium text-gray-900">Teléfono</h3>
                  <p class="mt-2 text-gray-600">+1 234 567 890</p>
                  <p class="text-sm text-gray-500">Lun-Vie: 9:00 - 18:00</p>
                </div>
                
                <div>
                  <h3 class="text-lg font-medium text-gray-900">Correo Electrónico</h3>
                  <p class="mt-2 text-gray-600">soporte@creditofacil.com</p>
                  <p class="text-sm text-gray-500">Respuesta en menos de 24 horas</p>
                </div>
                
                <div class="pt-4
                border-t border-gray-200">
                  <h3 class="text-lg font-medium text-gray-900">Síguenos</h3>
                  <div class="flex space-x-6 mt-4">
                    <a href="#" class="text-gray-400 hover:text-blue-600">
                      <span class="sr-only">Facebook</span>
                      <i class="fab fa-facebook-f text-xl"></i>
                    </a>
                    <a href="#" class="text-gray-400 hover:text-blue-400">
                      <span class="sr-only">Twitter</span>
                      <i class="fab fa-twitter text-xl"></i>
                    </a>
                    <a href="#" class="text-gray-400 hover:text-pink-500">
                      <span class="sr-only">Instagram</span>
                      <i class="fab fa-instagram text-xl"></i>
                    </a>
                    <a href="#" class="text-gray-400 hover:text-blue-700">
                      <span class="sr-only">LinkedIn</span>
                      <i class="fab fa-linkedin-in text-xl"></i>
                    </a>
                  </div>
                </div>
              </div>
              
              <!-- Contact Form -->
              <div class="bg-gray-50 p-8 rounded-lg shadow-sm">
                <form class="space-y-6">
                  <div>
                    <label for="full-name" class="block text-sm font-medium text-gray-700">Nombre completo</label>
                    <div class="mt-1">
                      <input type="text" name="full-name" id="full-name" autocomplete="name" class="py-3 px-4 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Tu nombre">
                    </div>
                  </div>
                  
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">Correo electrónico</label>
                    <div class="mt-1">
                      <input id="email" name="email" type="email" autocomplete="email" class="py-3 px-4 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="tucorreo@ejemplo.com">
                    </div>
                  </div>
                  
                  <div>
                    <label for="subject" class="block text-sm font-medium text-gray-700">Asunto</label>
                    <div class="mt-1">
                      <input type="text" name="subject" id="subject" class="py-3 px-4 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="¿Cómo podemos ayudarte?">
                    </div>
                  </div>
                  
                  <div>
                    <label for="message" class="block text-sm font-medium text-gray-700">Mensaje</label>
                    <div class="mt-1">
                      <textarea id="message" name="message" rows="4" class="py-3 px-4 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Escribe tu mensaje aquí..."></textarea>
                    </div>
                  </div>
                  
                  <div>
                    <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      Enviar mensaje
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="bg-blue-600 text-white py-16">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl font-bold mb-6">¿Listo para comenzar?</h2>
          <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Únete a miles de negocios que ya están simplificando su gestión de créditos con nuestra plataforma.
          </p>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <a href="${ROUTES.REGISTER}" data-route 
               class="px-8 py-4 bg-white text-blue-700 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
              Crear cuenta gratis
            </a>
            <a href="#contact" 
               class="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold text-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300">
              Hablar con ventas
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-gray-900 text-white pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <!-- Company Info -->
            <div class="space-y-4">
              <h3 class="text-xl font-bold">CréditoFácil</h3>
              <p class="text-gray-400">
                La mejor solución para la gestión de créditos de tu negocio. Simple, segura y eficiente.
              </p>
            </div>
            
            <!-- Quick Links -->
            <div>
              <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Enlaces Rápidos</h4>
              <ul class="space-y-2">
                <li><a href="${ROUTES.HOME}" data-route class="text-gray-400 hover:text-white transition-colors">Inicio</a></li>
                <li><a href="#features" class="text-gray-400 hover:text-white transition-colors">Características</a></li>
                <li><a href="#how-it-works" class="text-gray-400 hover:text-white transition-colors">¿Cómo funciona?</a></li>
                <li><a href="#testimonials" class="text-gray-400 hover:text-white transition-colors">Testimonios</a></li>
                <li><a href="#contact" class="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>
            
            <!-- Resources -->
            <div>
              <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Recursos</h4>
              <ul class="space-y-2">
                <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Centro de ayuda</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Tutoriales</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Preguntas frecuentes</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white transition-colors">API para desarrolladores</a></li>
              </ul>
            </div>
            
            <!-- Newsletter -->
            <div>
              <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Boletín informativo</h4>
              <p class="text-gray-400 mb-4">Suscríbete para recibir las últimas noticias y actualizaciones.</p>
              <form class="space-y-3">
                <div>
                  <label for="email-newsletter" class="sr-only">Tu correo electrónico</label>
                  <input type="email" id="email-newsletter" class="py-2 px-3 w-full rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tu correo electrónico">
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Suscribirse
                </button>
              </form>
            </div>
          </div>
          
          <div class="mt-12 pt-8 border-t border-gray-800">
            <p class="text-center text-gray-400 text-sm">
              &copy; ${new Date().getFullYear()} CréditoFácil. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  `;

  // Add event listeners for mobile menu
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const navLinks = document.querySelectorAll('a[href^="#"]');

  // Mobile menu toggle
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
      mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('hidden');
      
      // Toggle menu icon
      const icon = mobileMenuButton.querySelector('svg');
      if (isExpanded) {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
      } else {
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
      }
    });
  }

  // Smooth scroll for anchor links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          // Close mobile menu if open
          if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            const icon = mobileMenuButton.querySelector('svg');
            if (icon) {
              icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
            }
          }
        }
      }
    });
  });
}
