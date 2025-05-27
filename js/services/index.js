// Importar configuración de Supabase
import { supabase } from '../config.js';

// Importar servicios de autenticación
import { AuthService } from '../modules/auth/auth.service.js';

// Importar servicios de API
import { OrdersService } from '../modules/api/orders.service.js';
import { ProductsService } from '../modules/api/products.service.js';
import { CategoriesService } from '../modules/api/categories.service.js';
import { StoresService } from '../modules/api/stores.service.js';
import { CreditsService } from '../modules/api/credits.service.js';

// Importar utilidades
import { FormValidator } from '../modules/utils/form.validator.js';
import { NotificationService } from '../modules/utils/notifications.service.js';
import { StorageService } from '../modules/utils/storage.service.js';
import { DateUtils } from '../modules/utils/date.utils.js';
import { CurrencyUtils } from '../modules/utils/currency.utils.js';

// Inicializar servicios de autenticación
export const authService = new AuthService(supabase);

// Inicializar servicios de API
export const ordersService = new OrdersService(supabase);
export const productsService = new ProductsService(supabase);
export const categoriesService = new CategoriesService(supabase);
export const storesService = new StoresService(supabase);
export const creditsService = new CreditsService(supabase);

// Inicializar utilidades
export const formValidator = FormValidator;
export const notificationService = new NotificationService();
export const storageService = new StorageService('horizont_');
export const dateUtils = DateUtils;
export const currencyUtils = CurrencyUtils;

// Exportar todo como un objeto para facilitar la importación
export default {
    // Servicios de autenticación
    auth: authService,
    
    // Servicios de API
    orders: ordersService,
    products: productsService,
    categories: categoriesService,
    stores: storesService,
    credits: creditsService,
    
    // Utilidades
    formValidator,
    notifications: notificationService,
    storage: storageService,
    dates: dateUtils,
    currency: currencyUtils
};

// Inicialización global (opcional)
window.appServices = {
    auth: authService,
    orders: ordersService,
    products: productsService,
    categories: categoriesService,
    stores: storesService,
    credits: creditsService,
    notifications: notificationService,
    storage: storageService,
    dates: dateUtils,
    currency: currencyUtils
};
