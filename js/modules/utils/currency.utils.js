// Utilidades para manejo de monedas
export class CurrencyUtils {
    // Formatear cantidad como moneda
    static format(amount, currency = 'COP', locale = 'es-CO') {
        try {
            // Si amount no es un número, intentar convertirlo
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
            
            if (isNaN(numAmount)) {
                throw new Error('El valor proporcionado no es un número válido');
            }
            
            // Configuración por defecto para diferentes monedas
            const defaultOptions = {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            };
            
            // Ajustes específicos por moneda
            const currencyOptions = {
                'COP': {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                },
                'USD': {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                },
                'EUR': {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                },
                'MXN': {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            };
            
            // Combinar opciones
            const options = {
                ...defaultOptions,
                ...(currencyOptions[currency] || {})
            };
            
            return new Intl.NumberFormat(locale, options).format(numAmount);
        } catch (error) {
            console.error('Error al formatear moneda:', error);
            return amount.toString();
        }
    }
    
    // Convertir entre monedas (tasas de cambio fijas como ejemplo)
    static convert(amount, fromCurrency, toCurrency) {
        // Tasas de cambio de ejemplo (deberían obtenerse de una API en producción)
        const exchangeRates = {
            'USD': {
                'COP': 4000,  // 1 USD = 4000 COP
                'EUR': 0.85,  // 1 USD = 0.85 EUR
                'MXN': 20.0   // 1 USD = 20 MXN
            },
            'COP': {
                'USD': 0.00025,  // 1 COP = 0.00025 USD
                'EUR': 0.00021,  // 1 COP = 0.00021 EUR
                'MXN': 0.0050    // 1 COP = 0.0050 MXN
            },
            'EUR': {
                'USD': 1.18,    // 1 EUR = 1.18 USD
                'COP': 4761.90, // 1 EUR = 4761.90 COP
                'MXN': 23.53    // 1 EUR = 23.53 MXN
            },
            'MXN': {
                'USD': 0.050,   // 1 MXN = 0.050 USD
                'COP': 200.0,   // 1 MXN = 200 COP
                'EUR': 0.042    // 1 MXN = 0.042 EUR
            }
        };
        
        try {
            // Si las monedas son iguales, devolver el mismo valor
            if (fromCurrency === toCurrency) {
                return amount;
            }
            
            // Convertir a número
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                throw new Error('El monto proporcionado no es un número válido');
            }
            
            // Verificar si existe la tasa de cambio
            if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
                throw new Error(`No se encontró tasa de cambio para ${fromCurrency} a ${toCurrency}`);
            }
            
            // Realizar la conversión
            const rate = exchangeRates[fromCurrency][toCurrency];
            const result = numAmount * rate;
            
            // Redondear a 2 decimales
            return Math.round(result * 100) / 100;
        } catch (error) {
            console.error('Error al convertir moneda:', error);
            throw error;
        }
    }
    
    // Formatear un rango de precios
    static formatPriceRange(min, max, currency = 'COP', locale = 'es-CO') {
        try {
            const minNum = parseFloat(min);
            const maxNum = parseFloat(max);
            
            if (isNaN(minNum) || isNaN(maxNum)) {
                throw new Error('Los valores de rango no son números válidos');
            }
            
            if (minNum === maxNum) {
                return this.format(minNum, currency, locale);
            }
            
            return `${this.format(minNum, currency, locale)} - ${this.format(maxNum, currency, locale)}`;
        } catch (error) {
            console.error('Error al formatear rango de precios:', error);
            return `${min} - ${max}`;
        }
    }
    
    // Extraer el valor numérico de un string de moneda
    static extractNumber(currencyString) {
        try {
            if (!currencyString) return 0;
            
            // Eliminar símbolos de moneda, espacios y separadores de miles
            const numberString = currencyString
                .replace(/[^\d,-]/g, '')
                .replace(',', '.');
            
            const number = parseFloat(numberString);
            return isNaN(number) ? 0 : number;
        } catch (error) {
            console.error('Error al extraer número de moneda:', error);
            return 0;
        }
    }
    
    // Calcular el impuesto sobre el valor añadido (IVA)
    static calculateVAT(amount, vatRate = 0.19, currency = 'COP') {
        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) {
                throw new Error('El monto proporcionado no es un número válido');
            }
            
            const vatAmount = numAmount * vatRate;
            const totalAmount = numAmount + vatAmount;
            
            return {
                subtotal: numAmount,
                vatRate: vatRate * 100, // En porcentaje
                vatAmount: vatAmount,
                total: totalAmount,
                formatted: {
                    subtotal: this.format(numAmount, currency),
                    vatRate: `${(vatRate * 100).toFixed(2)}%`,
                    vatAmount: this.format(vatAmount, currency),
                    total: this.format(totalAmount, currency)
                }
            };
        } catch (error) {
            console.error('Error al calcular IVA:', error);
            throw error;
        }
    }
    
    // Calcular descuento
    static calculateDiscount(originalPrice, discountPercentage) {
        try {
            const price = parseFloat(originalPrice);
            const discount = parseFloat(discountPercentage);
            
            if (isNaN(price) || isNaN(discount)) {
                throw new Error('Los valores proporcionados no son números válidos');
            }
            
            if (discount < 0 || discount > 100) {
                throw new Error('El porcentaje de descuento debe estar entre 0 y 100');
            }
            
            const discountAmount = (price * discount) / 100;
            const finalPrice = price - discountAmount;
            
            return {
                originalPrice: price,
                discountPercentage: discount,
                discountAmount: discountAmount,
                finalPrice: finalPrice
            };
        } catch (error) {
            console.error('Error al calcular descuento:', error);
            throw error;
        }
    }
    
    // Formatear número con separadores de miles
    static formatNumber(number, decimals = 0, locale = 'es-CO') {
        try {
            const num = parseFloat(number);
            if (isNaN(num)) {
                throw new Error('El valor proporcionado no es un número válido');
            }
            
            return new Intl.NumberFormat(locale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        } catch (error) {
            console.error('Error al formatear número:', error);
            return number.toString();
        }
    }
    
    // Validar formato de moneda
    static isValidCurrency(amount) {
        try {
            if (typeof amount === 'number') {
                return !isNaN(amount) && isFinite(amount);
            }
            
            if (typeof amount === 'string') {
                // Acepta números con o sin separador decimal, opcionalmente con signo negativo
                return /^-?\d+(\.\d+)?$/.test(amount.trim());
            }
            
            return false;
        } catch (error) {
            console.error('Error al validar moneda:', error);
            return false;
        }
    }
    
    // Redondear a un número específico de decimales
    static roundToDecimal(value, decimals = 2) {
        try {
            const num = parseFloat(value);
            if (isNaN(num)) {
                throw new Error('El valor proporcionado no es un número válido');
            }
            
            const factor = Math.pow(10, decimals);
            return Math.round((num + Number.EPSILON) * factor) / factor;
        } catch (error) {
            console.error('Error al redondear número:', error);
            return value;
        }
    }
}
