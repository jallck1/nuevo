from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
import httpx
import json
import re
import datetime
from contexto import (
    EMPRESA, PRODUCTOS, PROCESO_COMPRA, METODOS_PAGO, 
    SINONIMOS, PREGUNTAS_FRECUENTES, PATRONES_INTENCION,
    obtener_informacion_producto, obtener_respuesta_pregunta
)

# Configuración del sistema
SYSTEM_PROMPT = f"""
Eres un asistente virtual experto en créditos y productos financieros para {EMPRESA['nombre']}. 
Tu objetivo es ayudar a los usuarios a entender los productos, realizar compras y resolver dudas.

Información importante sobre {EMPRESA['nombre']}:
- {EMPRESA['descripcion']}
- {EMPRESA['eslogan']}

Siempre sé amable, profesional y proporciona información clara y concisa.
Si no estás seguro de algo, indícalo y ofrece contactar con un asesor.
"""

def detectar_intencion(mensaje, patrones):
    """Detecta la intención del usuario basado en patrones."""
    mensaje = mensaje.lower()
    for intencion, palabras_clave in patrones.items():
        for palabra in palabras_clave:
            if palabra in mensaje:
                return intencion
    return None

def obtener_respuesta_compra(mensaje):
    """Genera una respuesta para intenciones de compra."""
    # Buscar productos mencionados
    for producto_key, producto in PRODUCTOS.items():
        if any(palabra in mensaje for palabra in [producto_key.split('_')[-1], producto['nombre'].lower()]):
            return (
                f"¡Perfecto! Veo que estás interesado en nuestro {producto['nombre']}. "
                f"{producto['descripcion']} "
                f"Puedo ayudarte con la solicitud. ¿Te gustaría que te cuente más sobre los requisitos?"
            )
    
    # Si no se menciona un producto específico
    productos_disponibles = "\n- " + "\n- ".join([p['nombre'] for p in PRODUCTOS.values()])
    return (
        "¡Hola! Veo que estás interesado en nuestros productos de crédito. "
        f"Estos son los productos que ofrecemos:{productos_disponibles}\n\n"
        "¿Sobre cuál te gustaría más información?"
    )

def calcular_similitud(texto1, texto2):
    """
    Calcula la similitud entre dos textos usando el coeficiente de Jaccard.
    Devuelve un valor entre 0 (ninguna similitud) y 1 (idénticos).
    """
    if not texto1 or not texto2:
        return 0.0
        
    # Convertir a minúsculas y dividir en palabras
    palabras1 = set(texto1.lower().split())
    palabras2 = set(texto2.lower().split())
    
    # Calcular la intersección y la unión
    interseccion = len(palabras1.intersection(palabras2))
    union = len(palabras1.union(palabras2))
    
    # Evitar división por cero
    if union == 0:
        return 0.0
        
    return interseccion / union

def analizar_intencion_usuario(mensaje):
    """
    Analiza la intención del usuario basado en su mensaje.
    Devuelve un diccionario con la intención detectada y confianza.
    """
    if not mensaje or not isinstance(mensaje, str):
        return {
            "intencion": "no_entendido",
            "confianza": 0.0,
            "mensaje_original": ""
        }
    
    mensaje = mensaje.lower().strip()
    
    # Patrones de intención con ejemplos de frases típicas
    intenciones = {
        "saludo": {
            "ejemplos": [
                "hola", "buenos días", "buenas tardes", "buenas noches", 
                "qué tal", "cómo estás", "hola buenos días", "hola, ¿cómo estás?"
            ],
            "umbral": 0.6
        },
        "despedida": {
            "ejemplos": [
                "adiós", "hasta luego", "hasta pronto", "nos vemos", 
                "chao", "chau", "hasta la próxima", "me voy"
            ],
            "umbral": 0.6
        },
        "compra": {
            "ejemplos": [
                "quiero comprar", "me interesa", "deseo adquirir", "quiero contratar",
                "necesito un crédito", "solicitar préstamo", "quiero solicitar", "me gustaría tener",
                "cómo obtengo", "cómo solicito", "quiero un crédito", "necesito financiación"
            ],
            "umbral": 0.5
        },
        "requisitos": {
            "ejemplos": [
                "qué necesito", "cuáles son los requisitos", "qué documentos piden",
                "qué papeles necesito", "qué debo llevar", "qué necesito para solicitar",
                "requisitos para el crédito", "documentación necesaria"
            ],
            "umbral": 0.5
        },
        "tasa_interes": {
            "ejemplos": [
                "cuál es la tasa", "qué tasa de interés manejan", "cuánto es el interés",
                "cuánto cuesta el crédito", "cuál es el costo", "qué porcentaje de interés",
                "cuánto es la tasa", "interés del préstamo"
            ],
            "umbral": 0.5
        },
        "plazos": {
            "ejemplos": [
                "a cuánto tiempo", "cuáles son los plazos", "en cuánto tiempo lo pago",
                "cuánto tiempo tengo para pagar", "a cuántos meses", "cuántas cuotas",
                "plazo máximo", "tiempo para pagar"
            ],
            "umbral": 0.5
        },
        "contacto": {
            "ejemplos": [
                "quiero hablar con un asesor", "dónde están ubicados", "cuál es la dirección",
                "número de teléfono", "cómo los contacto", "dónde están sus oficinas",
                "quiero que me llamen", "atención al cliente"
            ],
            "umbral": 0.5
        },
        "consulta_deuda": {
            "ejemplos": [
                "cuál es mi deuda", "cuánto debo", "cuánto es mi deuda", "cuánto tengo que pagar",
                "cuál es mi saldo pendiente", "cuánto debo pagar", "cuál es mi deuda actual",
                "tengo alguna deuda", "tengo deuda pendiente", "cuánto debo de pagar",
                "cuánto es lo que debo", "cuál es mi saldo deudor"
            ],
            "umbral": 0.7
        }
    }
    
    # Productos disponibles
    productos = {
        "libre inversión": ["libre inversión", "libre inversion", "libreinversion", "inversión libre", "crédito"],
        "vivienda": ["vivienda", "casa", "apartamento", "inmueble", "hipoteca"],
        "vehículo": ["vehículo", "carro", "automóvil", "moto", "vehiculo", "automovil"],
        "educación": ["educación", "educacion", "universidad", "estudios", "colegiatura"],
        "electrodomésticos": ["electrodoméstico", "nevera", "lavadora", "estufa", "televisor", "tv", "equipo de sonido"],
        "tecnología": ["celular", "computador", "laptop", "tablet", "smartphone", "tecnología"]
    }
    
    # Convertir mensaje a minúsculas para búsqueda sin distinción de mayúsculas
    mensaje_min = mensaje.lower().strip()
    
    # Verificar si el mensaje contiene algún producto o palabras clave relacionadas
    producto_detectado = None
    
    # Palabras clave generales para detectar consultas de productos
    palabras_clave_productos = [
        'producto', 'productos', 'artículo', 'artículos', 'mercancía', 'mercancia',
        'qué tienen', 'que tienen', 'qué venden', 'que venden', 'qué hay', 'que hay',
        'muéstrame', 'muestrame', 'ver', 'mostrar', 'tienen', 'disponible', 'disponibles',
        'tienes', 'tienen', 'ofrecen', 'venden', 'tienen a la venta', 'qué ofrecen', 'que ofrecen',
        'qué tienen', 'que tienen', 'qué hay disponible', 'que hay disponible', 'qué tienen disponible',
        'que tienen disponible', 'qué productos ofrecen', 'que productos ofrecen'
    ]
    
    # Primero verificamos si hay palabras clave generales de productos
    tiene_palabras_clave = any(re.search(r'\b' + re.escape(palabra) + r'\b', mensaje_min) for palabra in palabras_clave_productos)
    
    # Luego verificamos productos específicos
    if not producto_detectado:
        for producto, sinonimos in productos.items():
            for sinonimo in sinonimos:
                if re.search(r'\b' + re.escape(sinonimo) + r'\b', mensaje_min):
                    producto_detectado = producto
                    break
            if producto_detectado:
                break
    
    # Si no se detectó un producto específico pero hay palabras clave generales
    if not producto_detectado and tiene_palabras_clave:
        producto_detectado = 'producto'
    
    # Detección de intención de compra por palabras clave específicas
    if not producto_detectado and any(re.search(r'\b' + re.escape(palabra) + r'\b', mensaje_min) for palabra in ['comprar', 'adquirir', 'ordenar', 'pedir']):
        producto_detectado = 'producto'
    
    # Verificar si el mensaje es muy corto o parece una pregunta sobre productos
    if not producto_detectado and len(mensaje_min.split()) <= 5 and any(palabra in mensaje_min for palabra in ['que', 'qué', 'tienen', 'hay', 'tienes']):
        producto_detectado = 'producto'
    
    # Si se detectó un producto, retornamos la intención de productos
    if producto_detectado:
        return {
            "intencion": "productos",
            "confianza": 0.9,
            "mensaje_original": mensaje,
            "producto": producto_detectado
        }
        
    # Detección de consulta de deuda por palabras clave exactas
    if any(re.search(r'\b' + re.escape(palabra) + r'\b', mensaje_min) for palabra in ['deuda', 'debo', 'deber', 'pagar', 'pago', 'pendiente']):
        return {
            "intencion": "consulta_deuda",
            "confianza": 0.9,
            "mensaje_original": mensaje
        }
    
    # Calcular similitud para cada intención
    puntuaciones = {}
    for intencion, datos in intenciones.items():
        max_similitud = 0
        for ejemplo in datos["ejemplos"]:
            similitud = calcular_similitud(mensaje, ejemplo)
            if similitud > max_similitud:
                max_similitud = similitud
        
        # Solo considerar si supera el umbral
        if max_similitud >= datos["umbral"]:
            puntuaciones[intencion] = max_similitud
    
    # Determinar la intención con mayor puntuación
    if puntuaciones:
        mejor_intencion = max(puntuaciones, key=puntuaciones.get)
        confianza = puntuaciones[mejor_intencion]
        
        # Si se detectó un producto, priorizar la intención de compra
        if producto_detectado and mejor_intencion != "compra":
            mejor_intencion = "compra"
            confianza = max(confianza, 0.8)  # Aumentar confianza si hay producto
        
        resultado = {
            "intencion": mejor_intencion,
            "confianza": min(confianza, 1.0),  # Asegurar que no pase de 1.0
            "mensaje_original": mensaje
        }
        
        if producto_detectado:
            resultado["producto"] = producto_detectado
            
        return resultado
    
    # Si se detectó un producto pero no otra intención clara
    if producto_detectado:
        return {
            "intencion": "compra",
            "confianza": 0.7,
            "producto": producto_detectado,
            "mensaje_original": mensaje
        }
    
    # Si no se detecta ninguna intención clara
    return {
        "intencion": "no_entendido",
        "confianza": 0.0,
        "mensaje_original": mensaje
    }

def obtener_respuesta(intencion_data, mensaje_original, contexto_adicional=None):
    """
    Genera una respuesta basada en la intención detectada y el contexto del usuario.
    
    Args:
        intencion_data (dict): Diccionario con la intención detectada y metadatos.
        mensaje_original (str): Mensaje original del usuario.
        contexto_adicional (dict, optional): Información adicional del usuario como saldo y créditos.
        
    Returns:
        str: Respuesta generada.
    """
    if not isinstance(intencion_data, dict) or 'intencion' not in intencion_data:
        return "Disculpa, he tenido un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?"
    
    intencion = intencion_data.get('intencion')
    confianza = intencion_data.get('confianza', 0.0)
    
    # Obtener información del contexto
    saldo_disponible = contexto_adicional.get('saldo_disponible', 0) if contexto_adicional else 0
    credito_usado = contexto_adicional.get('credito_usado', 0) if contexto_adicional else 0
    credito_asignado = contexto_adicional.get('credito_asignado', 0) if contexto_adicional else 0
    
    # Si la confianza es muy baja, intentar con preguntas frecuentes primero
    if confianza < 0.5:
        respuesta_faq = obtener_respuesta_pregunta(mensaje_original)
        if respuesta_faq:
            return respuesta_faq
    
    # Manejar consultas sobre saldo, crédito y deuda
    mensaje_min = mensaje_original.lower()
    
    # Consulta sobre saldo disponible
    if any(palabra in mensaje_min for palabra in ['saldo', 'crédito', 'credito', 'disponible', 'tengo']) and 'deuda' not in mensaje_min:
        if saldo_disponible > 0:
            return (
                f"Actualmente tienes un saldo disponible de ${saldo_disponible:,.2f} de un total de ${credito_asignado:,.2f} asignados. "
                f"Has utilizado ${credito_usado:,.2f} de tu crédito.\n\n"
                "¿Te gustaría realizar una compra con tu crédito disponible?"
            )
        else:
            return (
                "Actualmente no tienes crédito disponible. "
                "¿Te gustaría información sobre cómo obtener un crédito con nosotros?"
            )
    
    # Consulta sobre deuda
    elif any(palabra in mensaje_min for palabra in ['deuda', 'debo', 'deber', 'deuda', 'pagar', 'pago', 'pendiente']):
        if credito_usado > 0:
            return (
                f"Actualmente tienes un saldo pendiente de pago por ${credito_usado:,.2f}. "
                f"Tu límite de crédito es de ${credito_asignado:,.2f} y tu saldo disponible es de ${saldo_disponible:,.2f}.\n\n"
                "¿Te gustaría realizar un pago o necesitas información sobre cómo pagar?"
            )
        else:
            return (
                "¡Buenas noticias! Actualmente no tienes deudas pendientes. "
                f"Tu límite de crédito es de ${credito_asignado:,.2f} y está completamente disponible.\n\n"
                "¿Te gustaría realizar una compra con tu crédito?"
            )
    
    # Consulta sobre productos y ofertas - Este bloque ya no es necesario ya que ahora manejamos la intención 'productos' en el bloque principal
    
    # Consulta sobre cómo comprar
    elif 'cómo compro' in mensaje_min or 'cómo hago una compra' in mensaje_min or 'realizar compra' in mensaje_min:
        return (
            "Para realizar una compra con tu crédito, sigue estos sencillos pasos:\n\n"
            "1. Explora nuestro catálogo de productos\n"
            "2. Selecciona los productos que deseas comprar\n"
            "3. Ve a tu carrito de compras\n"
            "4. Selecciona 'Pagar con mi crédito'\n"
            "5. Confirma tu compra\n\n"
            f"Actualmente tienes un saldo disponible de ${saldo_disponible:,.2f} para realizar tus compras. "
            "¿Te gustaría ver nuestro catálogo de productos?"
        )
    
    # Manejar según la intención detectada
    if intencion == "productos":
        # Construir la respuesta con los productos del catálogo
        respuesta = [
            "🛍️ **Productos Disponibles** 🛒\n\n"
            f"Con tu crédito disponible de **${saldo_disponible:,.2f}**, puedes adquirir cualquiera de estos productos:\n"
        ]
        
        # Separar productos de crédito y productos físicos
        productos_credito = {}
        productos_fisicos = {}
        
        for key, producto in PRODUCTOS.items():
            if 'precio' in producto:  # Es un producto físico
                categoria = producto.get('categoria', 'Otros')
                if categoria not in productos_fisicos:
                    productos_fisicos[categoria] = []
                productos_fisicos[categoria].append(producto)
            else:  # Es un producto de crédito
                productos_credito[key] = producto
        
        # Mostrar productos físicos por categoría
        if productos_fisicos:
            respuesta.append("\n🛒 **Productos Físicos**")
            for categoria, productos in productos_fisicos.items():
                respuesta.append(f"\n🔹 **{categoria.upper()}**")
                for producto in productos:
                    precio = f"${producto['precio']:,.0f}" if 'precio' in producto else "Precio a consultar"
                    respuesta.append(
                        f"• **{producto['nombre']}** - {precio}\n"
                        f"  {producto['descripcion']}\n"
                        f"  📦 Stock disponible: {producto.get('stock', 0)} unidades"
                    )
        
        # Mostrar productos de crédito
        if productos_credito:
            respuesta.append("\n💳 **Productos de Crédito**")
            for key, producto in productos_credito.items():
                monto_min = f"${producto.get('monto_minimo', 0):,.0f}" if 'monto_minimo' in producto else "Consultar"
                monto_max = f"hasta ${producto.get('monto_maximo', 0):,.0f}" if 'monto_maximo' in producto else ""
                
                descripcion = f"• **{producto['nombre']}**: {producto['descripcion']}"
                if monto_min or monto_max:
                    descripcion += f"\n  💰 Monto: {monto_min} {monto_max}"
                if 'tasa_interes' in producto:
                    descripcion += f"\n  📊 Tasa de interés: {producto['tasa_interes']}"
                if 'plazo_maximo' in producto:
                    descripcion += f"\n  ⏱️ Plazo máximo: {producto['plazo_maximo']} meses"
                
                respuesta.append(descripcion)
        
        # Agregar opciones adicionales
        respuesta.extend([
            "\n💡 **Opciones disponibles:**",
            "• Ver más detalles de un producto específico",
            "• Filtrar por categoría",
            "• Buscar un producto",
            "• Realizar una compra",
            "• Ver requisitos de crédito",
            "\n¿En qué más puedo ayudarte hoy?"
        ])
        
        return '\n'.join(respuesta)
        
    elif intencion == "consulta_deuda":
        if credito_usado > 0:
            # Calcular próximos pagos si es necesario
            proximo_pago = min(credito_usado * 0.1, 50000)  # Ejemplo: 10% o 50,000 lo que sea menor
            fecha_vencimiento = (datetime.datetime.now() + datetime.timedelta(days=30)).strftime("%d/%m/%Y")
            
            return (
                f"🔍 **Resumen de tu deuda**\n\n"
                f"• **Saldo pendiente:** ${credito_usado:,.2f}\n"
                f"• **Límite de crédito:** ${credito_asignado:,.2f}\n"
                f"• **Saldo disponible:** ${saldo_disponible:,.2f}\n"
                f"• **Próximo pago mínimo:** ${proximo_pago:,.2f}\n"
                f"• **Fecha de vencimiento:** {fecha_vencimiento}\n\n"
                "¿Te gustaría realizar un pago o necesitas más información sobre tu deuda?"
            )
        else:
            return (
                "¡Buenas noticias! Actualmente no tienes deudas pendientes.\n\n"
                f"Tu límite de crédito es de ${credito_asignado:,.2f} y está completamente disponible.\n\n"
                "¿Te gustaría realizar una compra con tu crédito o necesitas información sobre nuestros productos?"
            )
            
    elif intencion == "saludo":
        if saldo_disponible > 0:
            return (
                f"¡Hola! Bienvenido de nuevo a CrediControl. "
                f"Veo que tienes un saldo disponible de ${saldo_disponible:,.2f}. "
                "¿En qué puedo ayudarte hoy?\n\n"
                "Puedo ayudarte con:\n"
                "• Consultar tu saldo y crédito disponible\n"
                "• Realizar compras con tu crédito\n"
                "• Información sobre tus transacciones\n"
                "• Consultar tu deuda y pagos pendientes\n"
                "• Solicitar un aumento de crédito\n\n"
                "¿Qué te gustaría hacer?"
            )
        else:
            return (
                "¡Hola! Bienvenido a CrediControl. "
                "Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?\n\n"
                "Puedo ayudarte con:\n"
                "• Información sobre créditos\n"
                "• Requisitos para solicitar un crédito\n"
                "• Tasas de interés y plazos\n"
                "• Proceso de solicitud\n\n"
                "¿Por dónde te gustaría empezar?"
            )
    
    elif intencion == "despedida":
        return (
            "¡Ha sido un placer ayudarte! Si tienes más preguntas, no dudes en volver a preguntar. "
            "¡Que tengas un excelente día! 😊"
        )
    
    elif intencion == "compra" or intencion == "solicitar_credito" or intencion == "productos":
        # Si hay un producto específico mencionado, mostrar información detallada
        producto_especifico = intencion_data.get('producto')
        
        if producto_especifico:
            # Buscar el producto en nuestro catálogo
            for prod_key, prod_info in PRODUCTOS.items():
                if producto_especifico in prod_info['nombre'].lower():
                    return (
                        f"¡Excelente elección! El {prod_info['nombre']} tiene las siguientes características:\n\n"
                        f"• Tasa de interés: {prod_info.get('tasa_interes', 'desde 1.5% mensual')}\n"
                        f"• Plazo: {prod_info.get('plazo', 'hasta 60 meses')}\n"
                        f"• Monto mínimo: ${prod_info.get('monto_minimo', 1000000):,.0f}\n"
                        f"• Monto máximo: ${prod_info.get('monto_maximo', 50000000):,.0f}\n\n"
                        f"Con tu crédito disponible de ${saldo_disponible:,.2f}, puedes solicitar este producto. "
                        f"¿Te gustaría que inicie el proceso de solicitud del {prod_info['nombre']}?"
                    )
        
        # Si no se mencionó un producto específico, mostrar el catálogo
        return (
            "¡Perfecto! Tenemos varias opciones de productos que puedes adquirir con tu crédito:\n\n"
            "1. Electrodomésticos: Neveras, lavadoras, estufas, etc.\n"
            "2. Tecnología: Celulares, computadores, tablets, etc.\n"
            "3. Muebles: Para el hogar y la oficina.\n"
            "4. Línea blanca: Cocinas, neveras, lavadoras, etc.\n\n"
            f"Actualmente tienes un saldo disponible de ${saldo_disponible:,.2f}. "
            "¿Te gustaría que te muestre más detalles de alguna de estas categorías?"
        )
    
    elif intencion == "requisitos":
        # Si el mensaje menciona un producto específico, mostrar esos requisitos
        for producto_key, producto in PRODUCTOS.items():
            if any(palabra in mensaje_original.lower() for palabra in [producto_key, producto['nombre'].lower()]):
                requisitos = '\n- '.join(producto.get('requisitos', PRODUCTOS['credito_libre_inversion']['requisitos']))
                return (
                    f"Para solicitar un {producto['nombre'].lower()}, necesitarás los siguientes documentos:\n\n"
                    f"- {requisitos}\n\n"
                    f"¿Te gustaría que te ayude con el proceso de solicitud del {producto['nombre'].lower()}?"
                )
        
        # Si no se menciona un producto específico, mostrar los requisitos generales
        requisitos = '\n- '.join(PRODUCTOS['credito_libre_inversion']['requisitos'])
        return (
            "Para solicitar un crédito, generalmente necesitarás los siguientes documentos:\n\n"
            f"- {requisitos}\n\n"
            "Estos requisitos pueden variar según el tipo de crédito. "
            "¿Te gustaría saber los requisitos para un tipo de crédito en particular?"
        )
    
    elif intencion == "tasa_interes":
        tasas = []
        for producto in PRODUCTOS.values():
            if 'tasa_interes' in producto:
                tasas.append(f"{producto['nombre']}: {producto['tasa_interes']}")
        
        if tasas:
            tasas_str = "\n- " + "\n- ".join(tasas)
            return (
                "Estas son nuestras tasas de interés actuales:"
                f"{tasas_str}\n\n"
                "¿Te gustaría más información sobre alguna de estas opciones?"
            )
        else:
            return "Actualmente no tengo información sobre tasas de interés. ¿Te gustaría que te conecte con un asesor?"
    
    elif intencion == "plazos":
        plazos = []
        for producto in PRODUCTOS.values():
            if 'plazo_maximo' in producto:
                plazos.append(f"{producto['nombre']}: hasta {producto['plazo_maximo']} meses")
        
        if plazos:
            plazos_str = "\n- " + "\n- ".join(plazos)
            return (
                "Estos son los plazos máximos para nuestros productos:"
                f"{plazos_str}\n\n"
                "¿Te gustaría más información sobre algún producto en particular?"
            )
        else:
            return "Los plazos pueden variar según el producto. ¿Te gustaría que te ayude a encontrar el crédito que mejor se adapte a ti?"
    
    elif intencion == "contacto" or intencion == "hablar_con_asesor":
        return (
            "¡Claro! Puedes contactarnos de las siguientes formas:\n\n"
            "📞 Línea de atención al cliente: 01 8000 123 456\n"
            "📧 Correo electrónico: servicioalcliente@creditocontrol.com\n"
            "🏢 Oficinas: Encuentra tu oficina más cercana en nuestra página web\n\n"
            "Nuestro horario de atención es de lunes a viernes de 8:00 am a 6:00 pm y sábados de 9:00 am a 1:00 pm.\n\n"
            "¿Hay algo más en lo que pueda ayudarte?"
        )
    
    elif intencion == "agradecimiento":
        return (
            "¡De nada! Estoy aquí para ayudarte. "
            "¿Hay algo más en lo que pueda asistirte hoy? 😊"
        )
    
    elif intencion == "pregunta":
        # Intentar responder basado en preguntas frecuentes
        respuesta_faq = obtener_respuesta_pregunta(mensaje_original)
        if respuesta_faq:
            return respuesta_faq
            
        return (
            "Gracias por tu pregunta. Para poder ayudarte mejor, ¿podrías ser un poco más específico? "
            "Por ejemplo, podrías preguntar sobre:\n"
            "• Requisitos para un crédito\n"
            "• Tasas de interés actuales\n"
            "• Cómo solicitar un crédito"
        )
    
    # Si no se detectó una intención clara, buscar en preguntas frecuentes
    respuesta_faq = obtener_respuesta_pregunta(mensaje_original)
    if respuesta_faq:
        return respuesta_faq
    
    # Respuesta por defecto si no se encuentra una coincidencia
    return (
        "Disculpa, no estoy seguro de haber entendido tu consulta. "
        "¿Podrías reformularla o ser más específico?\n\n"
        "Por ejemplo, puedes preguntar sobre:\n"
        "• Requisitos para un crédito\n"
        "• Tasas de interés\n"
        "• Plazos de pago\n"
        "• Cómo solicitar un crédito"
    )

app = Flask(__name__, static_folder='buyer')
CORS(app)  # Habilitar CORS para todas las rutas

# Configuración para OpenRouter
openai.api_key = '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'
openai.api_base = 'https://openrouter.ai/api/v1'

# Configurar el cliente HTTP personalizado
http_client = httpx.Client(
    headers={
        'Authorization': f'Bearer {openai.api_key}',
        'HTTP-Referer': 'http://localhost:5000',  # URL de tu aplicación
        'X-Title': 'CrediControl Chat',  # Nombre de tu aplicación
    }
)

# Ruta para servir el frontend
@app.route('/')
def serve():
    return send_from_directory('buyer', 'aichat.html')

# Ruta para manejar las peticiones del chat
@app.route('/api/chat', methods=['POST'])
def chat():
    print("\n=== NUEVA SOLICITUD RECIBIDA ===")
    print(f"Hora: {datetime.datetime.now()}")
    
    try:
        data = request.json
        print("\nDatos recibidos:", json.dumps(data, indent=2))  # Depuración detallada
        
        if not data or 'messages' not in data:
            error_msg = 'No se proporcionaron mensajes en la solicitud'
            print(f"Error: {error_msg}")
            return jsonify({'error': error_msg}), 400

        # Obtener mensajes de la conversación
        user_messages = data.get('messages', [])
        print(f"\nTotal de mensajes en la conversación: {len(user_messages)}")
        
        if not user_messages:
            print("No hay mensajes en la conversación, devolviendo saludo inicial")
            return jsonify({
                'response': '¡Hola! Soy tu asistente de CrediControl. ¿En qué puedo ayudarte hoy?',
                'intencion': 'saludo',
                'confianza': 1.0
            })
        
        # Obtener el último mensaje del usuario
        last_user_message = next((msg['content'] for msg in reversed(user_messages) if msg['role'] == 'user'), '')
        print(f"\nÚltimo mensaje del usuario: '{last_user_message}'")
        
        # Obtener información del usuario si está disponible
        user_info = data.get('user', {})
        credit_available = user_info.get('credit_available', 0)
        credit_used = user_info.get('credit_used', 0)
        credit_assigned = user_info.get('credit_assigned', 0)
        
        # Si el mensaje está vacío o solo contiene espacios en blanco
        if not last_user_message or not last_user_message.strip():
            error_msg = 'Mensaje vacío o solo espacios en blanco'
            print(f"Error: {error_msg}")
            return jsonify({
                'response': 'No he podido entender tu mensaje. ¿Podrías reformularlo, por favor?',
                'intencion': 'no_entendido',
                'confianza': 0.0
            })
        
        # Analizar la intención del usuario
        try:
            print("\n=== ANALIZANDO INTENCIÓN ===")
            print(f"Mensaje a analizar: '{last_user_message}'")
            
            intencion = analizar_intencion_usuario(last_user_message)
            print(f"Intención detectada: {json.dumps(intencion, indent=2, ensure_ascii=False)}")
            
            # Contexto adicional para la generación de respuestas
            contexto_adicional = {
                'saldo_disponible': credit_available,
                'credito_usado': credit_used,
                'credito_asignado': credit_assigned
            }
            
            # Obtener respuesta basada en la intención
            print("\n=== GENERANDO RESPUESTA ===")
            respuesta = obtener_respuesta(intencion, last_user_message, contexto_adicional)
            
            # Mostrar la respuesta generada (solo los primeros 200 caracteres para no saturar la consola)
            respuesta_truncada = (respuesta[:200] + '...') if len(respuesta) > 200 else respuesta
            print(f"Respuesta generada: {respuesta_truncada}")
            
            # Depuración: Mostrar información sobre la respuesta
            print("\n=== INFORMACIÓN DE DEPURACIÓN ===")
            print(f"Tipo de respuesta: {type(respuesta)}")
            print(f"Contenido de respuesta: {respuesta[:500]}" if respuesta else "Respuesta vacía")
            print(f"Tipo de intención: {type(intencion)}")
            print(f"Contenido de intención: {intencion}")
            
            # Verificar si la respuesta es un diccionario (podría ser un error)
            if isinstance(respuesta, dict):
                print("¡ADVERTENCIA! La respuesta es un diccionario en lugar de un string")
                respuesta_texto = respuesta.get('response', str(respuesta))
            else:
                respuesta_texto = str(respuesta)
            
            # Determinar si la respuesta es de productos basada en el contenido
            palabras_clave_productos = [
                'producto', 'productos', 'disponibles', 'catálogo', 'catalogo',
                'electrodomésticos', 'tecnología', 'hogar', 'muebles', 'nevera',
                'lavadora', 'televisor', 'celular', 'computador', 'tablet',
                'oferta', 'ofertas', 'compra', 'comprar', 'adquirir', 'precio'
            ]
            
            es_respuesta_productos = any(palabra in respuesta_texto.lower() for palabra in palabras_clave_productos)
            
            print(f"¿Es respuesta de productos? {es_respuesta_productos}")
            print(f"Intención detectada: {intencion.get('intencion', 'no_entendido')}")
            
            # Preparar la respuesta final
            if es_respuesta_productos:
                respuesta_final = {
                    'response': respuesta_texto,
                    'intencion': 'productos',
                    'confianza': 0.9
                }
            else:
                respuesta_final = {
                    'response': respuesta_texto,
                    'intencion': intencion.get('intencion', 'no_entendido'),
                    'confianza': float(intencion.get('confianza', 0.0))
                }
                
            print(f"Respuesta final preparada: {json.dumps({k: v for k, v in respuesta_final.items() if k != 'response'}, indent=2)}")
            
            print("\n=== RESPUESTA FINAL ===")
            print(f"Enviando respuesta al cliente: {json.dumps({k: v for k, v in respuesta_final.items() if k != 'response'}, indent=2)}")
            print(f"Longitud de la respuesta: {len(respuesta)} caracteres")
            
            return jsonify(respuesta_final)
            
        except Exception as e:
            print(f"Error al generar la respuesta: {str(e)}")
            
            # Si hay un error, intentar con una respuesta genérica
            respuesta_faq = obtener_respuesta_pregunta(last_user_message)
            if respuesta_faq:
                return jsonify({
                    'response': respuesta_faq,
                    'intencion': 'pregunta_frecuente',
                    'confianza': 0.8
                })
            
            # Si no hay respuesta de preguntas frecuentes, devolver un mensaje de error genérico
            return jsonify({
                'response': (
                    'Lo siento, he tenido un problema al procesar tu solicitud. '
                    '¿Podrías intentar reformular tu pregunta o pregunta algo más específico?'
                ),
                'error': str(e)
            }), 500
            
    except Exception as e:
        error_msg = f"Error en el chat: {str(e)}"
        print(error_msg)  # Depuración
        return jsonify({
            'response': (
                '¡Vaya! He tenido un problema al procesar tu solicitud. '
                'Por favor, inténtalo de nuevo en un momento. Si el problema persiste, '
                'no dudes en contactar con nuestro equipo de soporte.'
            ),
            'error': error_msg
        }), 500

# Ruta para servir archivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('buyer', path)

# Ruta para servir archivos JS
@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('buyer/js', path)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
