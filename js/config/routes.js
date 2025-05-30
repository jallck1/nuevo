// Rutas de la aplicación
export const ROUTES = {
  // Públicas
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_USERS: '/admin/users',
  ADMIN_SUPPLIERS: '/admin/suppliers',
  ADMIN_PQRS: '/admin/pqrs',
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_INSTITUTIONAL: '/admin/institutional',
  
  // Comprador
  BUYER_DASHBOARD: '/buyer/dashboard',
  BUYER_CATALOG: '/buyer/catalogo_fix',
  BUYER_ORDERS: '/buyer/orders',
  BUYER_PAYMENTS: '/buyer/payments',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_PQRS: '/buyer/pqrs',
  BUYER_CART: '/buyer/carrito',
  BUYER_CONTACT: '/buyer/contacto',
  BUYER_RETURNS: '/buyer/devoluciones',
  BUYER_MY_RETURNS: '/buyer/mis-devoluciones',
  BUYER_PAYMENTS: '/buyer/pagos',
  BUYER_ORDERS: '/buyer/pedidos',
  BUYER_PROFILE: '/buyer/perfil',
  BUYER_DATA_POLICY: '/buyer/politica-datos',
  BUYER_ABOUT: '/buyer/quienes-somos',
  BUYER_TERMS: '/buyer/terminos-condiciones',
  BUYER_AI_CHAT: '/buyer/aichat'
};

// Rutas de administrador
export const ADMIN_ROUTES = [
  ROUTES.ADMIN_DASHBOARD,
  ROUTES.ADMIN_ORDERS,
  ROUTES.ADMIN_PRODUCTS,
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_SUPPLIERS,
  ROUTES.ADMIN_PQRS,
  ROUTES.ADMIN_AUDIT,
  ROUTES.ADMIN_INSTITUTIONAL
];

// Rutas de comprador
export const BUYER_ROUTES = [
  ROUTES.BUYER_DASHBOARD,
  ROUTES.BUYER_CATALOG,
  ROUTES.BUYER_ORDERS,
  ROUTES.BUYER_PAYMENTS,
  ROUTES.BUYER_PROFILE,
  ROUTES.BUYER_PQRS,
  ROUTES.BUYER_CART,
  ROUTES.BUYER_CONTACT,
  ROUTES.BUYER_RETURNS,
  ROUTES.BUYER_MY_RETURNS,
  ROUTES.BUYER_DATA_POLICY,
  ROUTES.BUYER_ABOUT,
  ROUTES.BUYER_TERMS,
  ROUTES.BUYER_AI_CHAT
];

// Rutas públicas
export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.ABOUT,
  ROUTES.CONTACT,
  ROUTES.PRIVACY,
  ROUTES.TERMS
];

// Verifica si la ruta es pública
export function isPublicRoute(path) {
  const cleanPath = path.split('?')[0].split('#')[0];
  return PUBLIC_ROUTES.some(route => route === cleanPath);
}

// Verifica si la ruta es de administrador
export function isAdminRoute(path) {
  const cleanPath = path.split('?')[0].split('#')[0];
  return ADMIN_ROUTES.some(route => route === cleanPath);
}

// Verifica si la ruta es de comprador
export function isBuyerRoute(path) {
  const cleanPath = path.split('?')[0].split('#')[0];
  return BUYER_ROUTES.some(route => route === cleanPath);
}

// Verifica si la ruta existe
export function routeExists(path) {
  const cleanPath = path.split('?')[0].split('#')[0];
  return Object.values(ROUTES).includes(cleanPath);
}

// Obtener la ruta por defecto según el rol
export function getDefaultRoute(role) {
  if (!role) {
    console.log('No se proporcionó un rol, redirigiendo a HOME');
    return ROUTES.HOME;
  }
  
  const roleLower = role.toLowerCase();
  console.log(`Obteniendo ruta por defecto para rol: ${roleLower}`);
  
  switch(roleLower) {
    case 'admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'buyer':
      // Verificar si hay una redirección pendiente
      const redirectTo = sessionStorage.getItem('redirectAfterLogin');
      if (redirectTo) {
        console.log(`Redirigiendo a ruta guardada: ${redirectTo}`);
        sessionStorage.removeItem('redirectAfterLogin');
        return redirectTo;
      }
      console.log('Redirigiendo a dashboard de comprador');
      return ROUTES.BUYER_DASHBOARD;
    default:
      console.log(`Rol no reconocido: ${roleLower}, redirigiendo a HOME`);
      return ROUTES.HOME;
  }
}
