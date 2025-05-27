// Roles de usuario
export const ROLES = {
  ADMIN: 'admin',
  BUYER: 'buyer'
};

// Estados de órdenes
export const ORDER_STATUS = {
  PENDING: 'pendiente',
  PROCESSING: 'procesando',
  COMPLETED: 'completada',
  CANCELLED: 'cancelada'
};

// Estados de pagos
export const PAYMENT_STATUS = {
  PENDING: 'pendiente',
  COMPLETED: 'completado',
  FAILED: 'fallido',
  REFUNDED: 'reembolsado'
};

// Métodos de pago
export const PAYMENT_METHODS = {
  CASH: 'efectivo',
  BANK_TRANSFER: 'transferencia_bancaria',
  CREDIT_CARD: 'tarjeta_credito',
  PSE: 'pse',
  NEQUI: 'nequi',
  DAVIPLATA: 'daviplata'
};

// Estados de PQRS
export const PQRS_STATUS = {
  OPEN: 'abierto',
  IN_PROGRESS: 'en_progreso',
  RESOLVED: 'resuelto',
  CLOSED: 'cerrado'
};

// Tipos de PQRS
export const PQRS_TYPES = {
  PETITION: 'peticion',
  COMPLAINT: 'queja',
  CLAIM: 'reclamo',
  SUGGESTION: 'sugerencia'
};

// Límites de la aplicación
export const LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PRODUCT_IMAGES: 5,
  MAX_CATEGORIES: 50,
  MAX_PRODUCTS: 1000
};

// Configuración de notificaciones
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Tiempo de expiración de la sesión (en segundos)
export const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 días

// Moneda por defecto
export const DEFAULT_CURRENCY = 'COP';

// Formato de fechas
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD [de] MMMM [de] YYYY',
  DATETIME: 'DD/MM/YYYY HH:mm',
  TIME: 'HH:mm'
};
