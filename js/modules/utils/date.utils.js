// Utilidades para manejo de fechas
export class DateUtils {
    // Formatear fecha a un string legible
    static formatDate(date, format = 'es-ES', options = {}) {
        if (!date) return '';
        
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            ...options
        };
        
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // Verificar si la fecha es válida
        if (isNaN(dateObj.getTime())) {
            return 'Fecha inválida';
        }
        
        return new Intl.DateTimeFormat(format, defaultOptions).format(dateObj);
    }
    
    // Obtener diferencia entre dos fechas
    static getDateDiff(startDate, endDate = new Date(), unit = 'days') {
        const start = startDate instanceof Date ? startDate : new Date(startDate);
        const end = endDate instanceof Date ? endDate : new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return null;
        }
        
        const diffInMs = end - start;
        
        switch (unit.toLowerCase()) {
            case 'milliseconds':
                return diffInMs;
            case 'seconds':
                return Math.floor(diffInMs / 1000);
            case 'minutes':
                return Math.floor(diffInMs / (1000 * 60));
            case 'hours':
                return Math.floor(diffInMs / (1000 * 60 * 60));
            case 'days':
                return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
            case 'months':
                return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            case 'years':
                return end.getFullYear() - start.getFullYear();
            default:
                return diffInMs;
        }
    }
    
    // Sumar tiempo a una fecha
    static addToDate(date, amount, unit = 'days') {
        const dateObj = date instanceof Date ? new Date(date) : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return null;
        }
        
        const result = new Date(dateObj);
        
        switch (unit.toLowerCase()) {
            case 'milliseconds':
                result.setMilliseconds(result.getMilliseconds() + amount);
                break;
            case 'seconds':
                result.setSeconds(result.getSeconds() + amount);
                break;
            case 'minutes':
                result.setMinutes(result.getMinutes() + amount);
                break;
            case 'hours':
                result.setHours(result.getHours() + amount);
                break;
            case 'days':
                result.setDate(result.getDate() + amount);
                break;
            case 'months':
                result.setMonth(result.getMonth() + amount);
                break;
            case 'years':
                result.setFullYear(result.getFullYear() + amount);
                break;
        }
        
        return result;
    }
    
    // Verificar si una fecha está entre dos fechas
    static isDateBetween(date, startDate, endDate, inclusive = true) {
        const d = date instanceof Date ? date : new Date(date);
        const start = startDate instanceof Date ? startDate : new Date(startDate);
        const end = endDate instanceof Date ? endDate : new Date(endDate);
        
        if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
            return false;
        }
        
        if (inclusive) {
            return d >= start && d <= end;
        } else {
            return d > start && d < end;
        }
    }
    
    // Formatear duración (ej: "2 horas y 30 minutos")
    static formatDuration(ms, locale = 'es-ES') {
        if (ms < 0) ms = -ms;
        
        const time = {
            day: Math.floor(ms / 86400000),
            hour: Math.floor(ms / 3600000) % 24,
            minute: Math.floor(ms / 60000) % 60,
            second: Math.floor(ms / 1000) % 60,
            millisecond: Math.floor(ms) % 1000
        };
        
        const parts = [];
        
        if (time.day > 0) {
            parts.push(`${time.day} ${time.day === 1 ? 'día' : 'días'}`);
        }
        
        if (time.hour > 0) {
            parts.push(`${time.hour} ${time.hour === 1 ? 'hora' : 'horas'}`);
        }
        
        if (time.minute > 0) {
            parts.push(`${time.minute} ${time.minute === 1 ? 'minuto' : 'minutos'}`);
        }
        
        if (time.second > 0 && parts.length < 2) {
            parts.push(`${time.second} ${time.second === 1 ? 'segundo' : 'segundos'}`);
        }
        
        if (parts.length === 0) {
            return 'menos de un segundo';
        }
        
        if (parts.length === 1) {
            return parts[0];
        }
        
        const last = parts.pop();
        return `${parts.join(', ')} y ${last}`;
    }
    
    // Obtener el primer día del mes
    static getFirstDayOfMonth(date) {
        const d = date instanceof Date ? new Date(date) : new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    
    // Obtener el último día del mes
    static getLastDayOfMonth(date) {
        const d = date instanceof Date ? new Date(date) : new Date(date);
        return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
    
    // Verificar si un año es bisiesto
    static isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
    
    // Obtener el número de días en un mes
    static getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }
    
    // Formatear fecha en formato relativo (ej: "hace 2 días")
    static formatRelative(date, locale = 'es-ES') {
        const d = date instanceof Date ? date : new Date(date);
        const now = new Date();
        
        if (isNaN(d.getTime())) {
            return 'Fecha inválida';
        }
        
        const diffInMs = now - d;
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        
        if (diffInSeconds < 5) return 'ahora mismo';
        if (diffInSeconds < 60) return `hace ${diffInSeconds} segundos`;
        if (diffInMinutes === 1) return 'hace un minuto';
        if (diffInMinutes < 60) return `hace ${diffInMinutes} minutos`;
        if (diffInHours === 1) return 'hace una hora';
        if (diffInHours < 24) return `hace ${diffInHours} horas`;
        if (diffInDays === 1) return 'ayer';
        if (diffInDays < 7) return `hace ${diffInDays} días`;
        
        // Si es más de una semana, mostrar la fecha completa
        return this.formatDate(d, locale);
    }
    
    // Convertir fecha a formato ISO 8601 (YYYY-MM-DD)
    static toISODate(date) {
        const d = date instanceof Date ? date : new Date(date);
        
        if (isNaN(d.getTime())) {
            return '';
        }
        
        return d.toISOString().split('T')[0];
    }
    
    // Convertir fecha a formato de base de datos (YYYY-MM-DD HH:MM:SS)
    static toDatabaseFormat(date) {
        const d = date instanceof Date ? date : new Date(date);
        
        if (isNaN(d.getTime())) {
            return null;
        }
        
        const pad = num => (num < 10 ? `0${num}` : num);
        
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
}
