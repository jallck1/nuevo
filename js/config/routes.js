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
  BUYER_CATALOG: '/buyer/catalogo_fix.html',  // Actualizado a la ruta corregida
  BUYER_ORDERS: '/buyer/orders',
  BUYER_PAYMENTS: '/buyer/payments',
  BUYER_PROFILE: '/buyer/profile',
  BUYER_PQRS: '/buyer/pqrs'
};

// Verifica si la ruta es pública
export function isPublicRoute(path) {
  const publicRoutes = [
    ROUTES.HOME,
    ROUTES.LOGIN,
    ROUTES.REGISTER,
    ROUTES.FORGOT_PASSWORD,
    ROUTES.ABOUT,
    ROUTES.CONTACT,
    ROUTES.PRIVACY,
    ROUTES.TERMS
  ];
  return publicRoutes.includes(path);
}

// Verifica si la ruta es de administrador
export function isAdminRoute(path) {
  return path.startsWith('/admin');
}

// Verifica si la ruta es de comprador
export function isBuyerRoute(path) {
  return path.startsWith('/buyer');
}

// Obtener la ruta por defecto según el rol
export function getDefaultRoute(role) {
  console.log(`Obteniendo ruta por defecto para el rol: ${role}`);
  switch (role) {
    case 'admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'buyer':
      // Redirigir directamente al catálogo de productos después del login
      console.log('Redirigiendo comprador al catálogo de productos');
      return ROUTES.BUYER_CATALOG;
    default:
      return ROUTES.HOME;
  }
}
