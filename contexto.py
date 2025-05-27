# Contexto y conocimiento del dominio para el asistente de CrediControl

# Información de la empresa
EMPRESA = {
    "nombre": "CrediControl",
    "descripcion": "Especialistas en crédito de libranza con más de 20 años de experiencia en el mercado.",
    "eslogan": "Tu aliado financiero de confianza"
}

# Productos y servicios
PRODUCTOS = {
    "credito_libre_inversion": {
        "nombre": "Crédito de Libre Inversión",
        "descripcion": "Disponible para pensionados y empleados de empresas públicas y privadas.",
        "monto_minimo": 500000,
        "monto_maximo": 150000000,
        "plazo_minimo": 12,
        "plazo_maximo": 84,
        "tasa_interes": "1.2% MV",
        "requisitos": [
            "Documento de identidad",
            "Desprendible de pago o certificado laboral",
            "Certificado de ingresos",
            "Código de la entidad donde trabaja"
        ],
        "sin_estudio": "Aprobación en 24 horas sin estudio de crédito para montos bajos",
        "sin_codeudor": "No se requiere codeudor para montos menores a 30 SMMLV"
    },
    "credito_educativo": {
        "nombre": "Crédito Educativo",
        "descripcion": "Financiación para estudios de pregrado, posgrado y educación continua.",
        "monto_minimo": 1000000,
        "monto_maximo": 100000000,
        "plazo_maximo": 120,
        "tasa_interes": "0.9% MV"
    },
    "credito_vivienda": {
        "nombre": "Crédito de Vivienda",
        "descripcion": "Financiación para compra de vivienda nueva o usada.",
        "monto_minimo": 50000000,
        "plazo_maximo": 240,
        "tasa_interes": "0.8% MV"
    },
    "nevera_haceb": {
        "nombre": "Nevera Haceb 395L",
        "descripcion": "Nevera de dos puertas con capacidad de 395 litros, tecnología No Frost y eficiencia energética A++.",
        "precio": 2499000,
        "categoria": "Electrodomésticos",
        "marca": "Haceb",
        "stock": 15
    },
    "lavadora_mabe": {
        "nombre": "Lavadora Mabe 18kg",
        "descripcion": "Lavadora de carga frontal con capacidad para 18kg, 12 ciclos de lavado y sistema de ahorro de agua.",
        "precio": 1850000,
        "categoria": "Electrodomésticos",
        "marca": "Mabe",
        "stock": 10
    },
    "tv_samsung": {
        "nombre": "Televisor Samsung 55\" 4K",
        "descripcion": "Smart TV 55 pulgadas con resolución 4K, HDR10+ y sistema operativo Tizen.",
        "precio": 2199000,
        "categoria": "Tecnología",
        "marca": "Samsung",
        "stock": 8
    },
    "iphone_14": {
        "nombre": "iPhone 14 128GB",
        "descripcion": "Último modelo de iPhone con pantalla Super Retina XDR, cámara de 12MP y chip A15 Bionic.",
        "precio": 3999000,
        "categoria": "Tecnología",
        "marca": "Apple",
        "stock": 5
    },
    "laptop_hp": {
        "nombre": "Laptop HP Pavilion 15\"",
        "descripcion": "Laptop de 15.6 pulgadas, procesador Intel Core i7, 16GB RAM, 512GB SSD, tarjeta gráfica dedicada.",
        "precio": 3899000,
        "categoria": "Tecnología",
        "marca": "HP",
        "stock": 7
    },
    "juego_sala": {
        "nombre": "Juego de sala 5 puestos",
        "descripcion": "Juego de sala moderno en tela antimanchas, incluye sofá de 3 puestos, 2 individuales y mesa de centro.",
        "precio": 4500000,
        "categoria": "Hogar",
        "marca": "Home Collection",
        "stock": 3
    }
}

# Proceso de compra
PROCESO_COMPRA = [
    "1. Cotización: Solicita una cotización sin compromiso",
    "2. Aprobación: Proceso rápido de aprobación",
    "3. Desembolso: Recibe tu dinero en pocas horas",
    "4. Pago: Realiza tus pagos mensuales cómodamente"
]

# Métodos de pago
METODOS_PAGO = [
    "PSE (Pagos Seguros en Línea)",
    "Transferencia bancaria",
    "Pago en efectivo en nuestros puntos autorizados",
    "Débito automático de tu cuenta de ahorros o corriente"
]

# Sinónimos y variaciones de términos comunes
SINONIMOS = {
    "comprar": ["adquirir", "solicitar", "contratar", "tomar", "quiero", "necesito", "deseo", "me interesa"],
    "crédito": ["préstamo", "financiación", "crédito", "dinero", "empréstito"],
    "pagar": ["cancelar", "abonar", "liquidar", "pagar", "realizar pago", "efectuar pago"],
    "cuota": ["pago", "cuota", "letra", "mensualidad", "abono"],
    "tasa": ["interés", "tasa", "porcentaje", "intereses", "tasa de interés"],
    "plazo": ["tiempo", "duración", "plazo", "período", "meses", "años"],
    "información": ["saber", "conocer", "información", "detalles", "informarme"],
    "solicitud": ["aplicar", "solicitar", "pedir", "iniciar trámite", "empezar proceso"]
}

# Patrones de intención
PATRONES_INTENCION = {
    "saludo": ["hola", "buenos días", "buenas tardes", "buenas noches", "saludos"],
    "despedida": ["adiós", "hasta luego", "chao", "nos vemos", "hasta pronto"],
    "compra": ["comprar", "adquirir", "solicitar", "contratar", "quiero", "necesito", "deseo"],
    "pago": ["pagar", "realizar pago", "efectuar pago", "abonar", "liquidar"],
    "requisitos": ["requisitos", "documentos necesarios", "qué necesito", "requiere"],
    "tasa_interes": ["tasa de interés", "interés", "tasa", "cuánto es el interés"],
    "plazos": ["plazos", "tiempo", "cuánto tiempo", "duración", "meses", "años"],
    "contacto": ["contacto", "hablar con alguien", "asesor", "atención al cliente"]
}

# Preguntas frecuentes
PREGUNTAS_FRECUENTES = [
    {
        "pregunta": "¿Cómo solicito un crédito?",
        "respuesta": "Puedes solicitar tu crédito en línea a través de nuestra página web o visitando una de nuestras oficinas."
    },
    {
        "pregunta": "¿Qué documentos necesito?",
        "respuesta": "Solo necesitas tu documento de identidad, desprendible de pago o certificado laboral, certificado de ingresos y el código de tu entidad."
    },
    {
        "pregunta": "¿Cuánto tiempo tarda la aprobación?",
        "respuesta": "La aprobación puede tardar desde 24 horas hasta 72 horas hábiles, dependiendo del monto solicitado."
    },
    {
        "pregunta": "¿Puedo pagar antes de tiempo?",
        "respuesta": "Sí, puedes realizar pagos anticipados sin ningún tipo de penalización."
    }
]

def obtener_informacion_producto(producto_buscado):
    """Busca información detallada de un producto por su nombre o sinónimos."""
    producto_buscado = producto_buscado.lower()
    
    # Mapeo de términos comunes a los nombres de productos
    mapeo_productos = {
        'libre': 'credito_libre_inversion',
        'libreinversion': 'credito_libre_inversion',
        'educacion': 'credito_educativo',
        'estudios': 'credito_educativo',
        'universidad': 'credito_educativo',
        'casa': 'credito_vivienda',
        'vivienda': 'credito_vivienda',
        'vivienda': 'credito_vivienda'
    }
    
    # Buscar coincidencia directa
    if producto_buscado in PRODUCTOS:
        return PRODUCTOS[producto_buscado]
        
    # Buscar en el mapeo de términos
    if producto_buscado in mapeo_productos:
        return PRODUCTOS[mapeo_productos[producto_buscado]]
    
    # Búsqueda parcial en nombres de productos
    for key, producto in PRODUCTOS.items():
        if producto_buscado in producto['nombre'].lower():
            return producto
    
    return None

def obtener_respuesta_pregunta(pregunta):
    """Busca una respuesta para la pregunta del usuario."""
    pregunta = pregunta.lower()
    
    for item in PREGUNTAS_FRECUENTES:
        if any(palabra in pregunta for palabra in item['pregunta'].lower().split()):
            return item['respuesta']
    
    return None
