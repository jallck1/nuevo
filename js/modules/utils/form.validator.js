// Utilidades para validación de formularios
export class FormValidator {
    // Validar campos requeridos
    static validateRequired(value, fieldName) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return `El campo ${fieldName} es requerido`;
        }
        return '';
    }

    // Validar email
    static validateEmail(email) {
        if (!email) return 'El correo electrónico es requerido';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'El formato del correo electrónico no es válido';
        }
        return '';
    }

    // Validar contraseña
    static validatePassword(password) {
        if (!password) return 'La contraseña es requerida';
        if (password.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres';
        }
        return '';
    }

    // Validar número
    static validateNumber(value, fieldName, min = null, max = null) {
        if (value === undefined || value === null || value === '') {
            return `El campo ${fieldName} es requerido`;
        }
        
        const num = Number(value);
        if (isNaN(num)) {
            return `El campo ${fieldName} debe ser un número válido`;
        }
        
        if (min !== null && num < min) {
            return `El valor mínimo para ${fieldName} es ${min}`;
        }
        
        if (max !== null && num > max) {
            return `El valor máximo para ${fieldName} es ${max}`;
        }
        
        return '';
    }

    // Validar fecha
    static validateDate(dateString, fieldName) {
        if (!dateString) return `El campo ${fieldName} es requerido`;
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return `El campo ${fieldName} debe ser una fecha válida`;
        }
        
        return '';
    }

    // Validar que dos campos coincidan (ej. contraseñas)
    static validateMatch(value1, value2, fieldName1, fieldName2) {
        if (value1 !== value2) {
            return `Los campos ${fieldName1} y ${fieldName2} no coinciden`;
        }
        return '';
    }

    // Validar longitud de texto
    static validateLength(value, fieldName, minLength, maxLength = null) {
        if (!value && minLength > 0) {
            return `El campo ${fieldName} es requerido`;
        }
        
        if (value.length < minLength) {
            return `El campo ${fieldName} debe tener al menos ${minLength} caracteres`;
        }
        
        if (maxLength !== null && value.length > maxLength) {
            return `El campo ${fieldName} no debe exceder los ${maxLength} caracteres`;
        }
        
        return '';
    }

    // Validar URL
    static validateUrl(url, fieldName) {
        if (!url) return ''; // Opcional
        
        try {
            new URL(url);
            return '';
        } catch (e) {
            return `El campo ${fieldName} debe ser una URL válida`;
        }
    }

    // Validar selección de opción
    static validateSelect(value, fieldName) {
        if (!value) {
            return `Por favor seleccione una opción para ${fieldName}`;
        }
        return '';
    }

    // Validar archivo
    static validateFile(file, fieldName, options = {}) {
        if (!file && options.required) {
            return `El archivo para ${fieldName} es requerido`;
        }
        
        if (!file) return ''; // Si no es requerido y no hay archivo, es válido
        
        // Validar tipo de archivo
        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
            const types = options.allowedTypes.join(', ');
            return `El archivo debe ser de tipo: ${types}`;
        }
        
        // Validar tamaño máximo (en bytes)
        if (options.maxSize && file.size > options.maxSize) {
            const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
            return `El archivo no debe superar los ${maxSizeMB}MB`;
        }
        
        return '';
    }

    // Validar formulario completo
    static validateForm(formData, validationRules) {
        const errors = {};
        let isValid = true;
        
        for (const [field, rules] of Object.entries(validationRules)) {
            const value = formData[field];
            
            for (const rule of rules) {
                let error = '';
                
                switch (rule.type) {
                    case 'required':
                        error = this.validateRequired(value, rule.name || field);
                        break;
                    case 'email':
                        error = this.validateEmail(value);
                        break;
                    case 'password':
                        error = this.validatePassword(value);
                        break;
                    case 'number':
                        error = this.validateNumber(
                            value, 
                            rule.name || field, 
                            rule.min, 
                            rule.max
                        );
                        break;
                    case 'date':
                        error = this.validateDate(value, rule.name || field);
                        break;
                    case 'match':
                        error = this.validateMatch(
                            value, 
                            formData[rule.fieldToMatch], 
                            rule.name || field, 
                            rule.fieldToMatchName || rule.fieldToMatch
                        );
                        break;
                    case 'length':
                        error = this.validateLength(
                            value, 
                            rule.name || field, 
                            rule.min, 
                            rule.max
                        );
                        break;
                    case 'url':
                        error = this.validateUrl(value, rule.name || field);
                        break;
                    case 'select':
                        error = this.validateSelect(value, rule.name || field);
                        break;
                    case 'file':
                        error = this.validateFile(value, rule.name || field, rule.options);
                        break;
                    case 'custom':
                        error = rule.validate(value, formData);
                        break;
                }
                
                if (error) {
                    errors[field] = error;
                    isValid = false;
                    break;
                }
            }
        }
        
        return {
            isValid,
            errors
        };
    }
}
