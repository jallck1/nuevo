// Servicio para manejar el almacenamiento local y de sesión
export class StorageService {
    constructor(prefix = 'app_') {
        this.prefix = prefix;
    }

    // ==================== LOCAL STORAGE ====================


    // Guardar en localStorage
    setLocal(key, value) {
        try {
            const storageKey = this.prefix + key;
            const data = JSON.stringify(value);
            localStorage.setItem(storageKey, data);
            return true;
        } catch (error) {
            console.error('Error al guardar en localStorage:', error);
            return false;
        }
    }

    // Obtener de localStorage
    getLocal(key, defaultValue = null) {
        try {
            const storageKey = this.prefix + key;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error al obtener de localStorage:', error);
            return defaultValue;
        }
    }

    // Eliminar de localStorage
    removeLocal(key) {
        try {
            const storageKey = this.prefix + key;
            localStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('Error al eliminar de localStorage:', error);
            return false;
        }
    }

    // Limpiar todo el localStorage (solo las claves con el prefijo)
    clearLocal() {
        try {
            const keysToRemove = [];
            
            // Identificar las claves con el prefijo
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // Eliminar las claves
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Error al limpiar localStorage:', error);
            return false;
        }
    }

    // ==================== SESSION STORAGE ====================


    // Guardar en sessionStorage
    setSession(key, value) {
        try {
            const storageKey = this.prefix + key;
            const data = JSON.stringify(value);
            sessionStorage.setItem(storageKey, data);
            return true;
        } catch (error) {
            console.error('Error al guardar en sessionStorage:', error);
            return false;
        }
    }

    // Obtener de sessionStorage
    getSession(key, defaultValue = null) {
        try {
            const storageKey = this.prefix + key;
            const data = sessionStorage.getItem(storageKey);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error al obtener de sessionStorage:', error);
            return defaultValue;
        }
    }


    // Eliminar de sessionStorage
    removeSession(key) {
        try {
            const storageKey = this.prefix + key;
            sessionStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('Error al eliminar de sessionStorage:', error);
            return false;
        }
    }

    // Limpiar todo el sessionStorage (solo las claves con el prefijo)
    clearSession() {
        try {
            const keysToRemove = [];
            
            // Identificar las claves con el prefijo
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // Eliminar las claves
            keysToRemove.forEach(key => {
                sessionStorage.removeItem(key);
            });
            
            return true;
        } catch (error) {
            console.error('Error al limpiar sessionStorage:', error);
            return false;
        }
    }

    // ==================== MÉTODOS ADICIONALES ====================


    // Verificar si el almacenamiento está disponible
    static isStorageAvailable(type = 'localStorage') {
        try {
            const storage = window[type];
            const testKey = '__test__';
            
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Obtener el tamaño del almacenamiento utilizado (en KB)
    static getStorageSize(type = 'localStorage') {
        try {
            let total = 0;
            const storage = window[type];
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                const value = storage.getItem(key);
                total += key.length + value.length;
            }
            
            // Convertir a KB
            return (total / 1024).toFixed(2);
        } catch (error) {
            console.error(`Error al obtener el tamaño de ${type}:`, error);
            return 0;
        }
    }

    // Sincronizar datos con el servidor (ejemplo básico)
    async syncWithServer(apiClient, endpoint, key, options = {}) {
        const {
            storageType = 'local',
            maxAge = 24 * 60 * 60 * 1000, // 24 horas por defecto
            forceRefresh = false
        } = options;

        const storageKey = `sync_${key}`;
        const lastSync = this.getLocal(storageKey);
        const now = Date.now();

        // Si los datos están en caché y no están vencidos, y no se fuerza la actualización
        if (!forceRefresh && lastSync && (now - lastSync.timestamp < maxAge)) {
            const cachedData = this[`get${storageType.charAt(0).toUpperCase() + storageType.slice(1)}`](key);
            if (cachedData) {
                return { data: cachedData, fromCache: true };
            }
        }

        try {
            // Obtener datos del servidor
            const response = await apiClient.get(endpoint);
            
            // Guardar en el almacenamiento local
            this[`set${storageType.charAt(0).toUpperCase() + storageType.slice(1)}`](key, response.data);
            
            // Actualizar la marca de tiempo de sincronización
            this.setLocal(storageKey, { timestamp: now });
            
            return { data: response.data, fromCache: false };
        } catch (error) {
            console.error('Error al sincronizar con el servidor:', error);
            
            // Si hay un error, devolver los datos en caché si existen
            const cachedData = this[`get${storageType.charAt(0).toUpperCase() + storageType.slice(1)}`](key);
            if (cachedData) {
                return { data: cachedData, fromCache: true, error };
            }
            
            throw error;
        }
    }
}
