// Módulo del carrito de compras
window.cartModule = (function() {
  // Constantes
  const CART_STORAGE_KEY = 'credicontrol_cart';
  
  // Estado
  let userProfile = null;
  let supabase = null;
  
  // 1. Inicialización del módulo
  async function init() {
    try {
      // Cargar Supabase (si es necesario para otras funcionalidades)
      try {
        await loadSupabase();
      } catch (error) {
        console.warn('No se pudo cargar Supabase, pero el carrito funcionará en modo local');
      }
      
      // Configurar eventos
      setupEventListeners();
      
      // Actualizar interfaz del carrito
      updateCartDisplay();
      
      // Actualizar crédito solo si el usuario está autenticado
      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userProfile = await getUserProfile(user.id);
            updateCreditDisplay();
          }
        }
      } catch (error) {
        console.warn('No se pudo cargar la información del usuario, pero el carrito funcionará en modo local');
      }
      
    } catch (error) {
      console.error('Error al inicializar el carrito:', error);
      // No mostrar error al usuario para no interrumpir la experiencia
    }
  }
  
  // 2. Cargar Supabase
  async function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        console.log('✅ Supabase ya está cargado');
        supabase = window.supabase.createClient(
          'https://ywmspibcnhfmqmnutpyg.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU'
        );
        return resolve(supabase);
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        console.log('✅ Supabase cargado');
        supabase = window.supabase.createClient(
          'https://ywmspibcnhfmqmnutpyg.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU'
        );
        resolve(supabase);
      };
      script.onerror = (error) => {
        console.error('❌ Error al cargar Supabase');
        reject(error);
      };
      document.head.appendChild(script);
    });
  }
  
  // 3. Obtener perfil del usuario
  async function getUserProfile(userId) {
    console.log('👤 Obteniendo perfil del usuario...');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error al obtener perfil:', error);
      throw new Error('No se pudo cargar el perfil del usuario');
    }
    
    return profile;
  }

  // 4. Verificar crédito disponible
  function checkCredit(profile, cartTotal) {
    const availableCredit = (parseFloat(profile.credit_assigned) || 0) - (parseFloat(profile.credit_used) || 0);
    console.log(`💰 Crédito disponible: $${availableCredit.toFixed(2)} | Total carrito: $${cartTotal.toFixed(2)}`);
    
    if (availableCredit < cartTotal) {
      throw new Error(`❌ Crédito insuficiente. Necesitas $${(cartTotal - availableCredit).toFixed(2)} adicionales`);
    }
    
    console.log('✅ Crédito suficiente');
    return availableCredit;
  }

  // 5. Crear una orden
  async function createOrder(cart, storeId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error de autenticación:', userError);
      throw new Error('Usuario no autenticado');
    }
    
    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    console.log('📝 Creando orden...');
    
    try {
      // Verificar el perfil del usuario primero
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile) {
        console.error('Error al obtener perfil:', profileError);
        throw new Error('No se pudo verificar el perfil del usuario');
      }
      
      // 1. Primero creamos la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          store_id: storeId,
          total_amount: total,
          status: 'Pendiente',
          order_date: new Date().toISOString()
        })
        .select('*')
        .single();
      
      if (orderError) {
        console.error('Error detallado al crear orden:', orderError);
        throw new Error(`Error al crear orden: ${orderError.message}`);
      }
      
      // 2. Luego creamos los items de la orden
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
        subtotal: parseFloat(item.price) * parseInt(item.quantity)
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        console.error('Error al crear items de la orden:', itemsError);
        throw new Error(`Error al crear items de la orden: ${itemsError.message}`);
      }
      
      console.log('✅ Orden creada:', order.id);
      console.log('✅ Items de orden creados');
      return { order, total };
      
    } catch (error) {
      console.error('Error en createOrder:', error);
      throw error;
    }
  }

  // 6. Actualizar crédito del usuario
  async function updateCredit(amount) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error de autenticación:', userError);
      throw new Error('Usuario no autenticado');
    }
    
    console.log('🔄 Actualizando crédito...', { userId: user.id, amount });
    
    try {
      // Obtener el crédito actual
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('credit_used')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentCreditUsed = parseFloat(currentProfile?.credit_used) || 0;
      const newCreditUsed = currentCreditUsed + parseFloat(amount);
      
      console.log('Actualizando crédito:', { currentCreditUsed, newCreditUsed });
      
      // Actualizar el crédito usado
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          credit_used: newCreditUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      console.log('✅ Crédito actualizado correctamente');
      
      // Actualizar perfil local
      userProfile.credit_used = newCreditUsed;
      updateCreditDisplay();
      
      return updatedProfile;
      
    } catch (error) {
      console.error('Error al actualizar crédito:', error);
      throw new Error(`Error al actualizar crédito: ${error.message}`);
    }
  }

  // 7. Obtener el carrito del localStorage
  function getCart() {
    try {
      const cartData = localStorage.getItem(CART_STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error al obtener el carrito:', error);
      return [];
    }
  }
  
  // 8. Guardar el carrito en localStorage
  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      updateCartDisplay();
      return true;
    } catch (error) {
      console.error('Error al guardar el carrito:', error);
      return false;
    }
  }
  
  // 9. Actualizar la visualización del carrito
  function updateCartDisplay() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartContent = document.getElementById('cart-content');
    const cartSubtotalElement = document.getElementById('cart-subtotal');
    const cartTaxesElement = document.getElementById('cart-taxes');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElements = document.querySelectorAll('[id*="cart-count"]');
    const cartDiscountsElement = document.getElementById('cart-discounts');
    
    // Actualizar contador de items
    const itemCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
    console.log('Actualizando contador del carrito. Total de items:', itemCount);
    
    // Actualizar todos los elementos con id que contenga 'cart-count'
    document.querySelectorAll('[id*="cart-count"]').forEach(el => {
      if (el) {
        el.textContent = itemCount;
        // Solo ocultar si no hay items, pero asegurarse de que se muestre cuando hay items
        if (itemCount > 0) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
        console.log('Contador actualizado en elemento:', el);
      }
    });
    
    if (cart.length === 0) {
      // Mostrar mensaje de carrito vacío
      if (emptyCartMessage) emptyCartMessage.classList.remove('hidden');
      if (cartContent) cartContent.classList.add('hidden');
      return;
    }
    
    // Calcular la cantidad total de productos
    const totalItems = cart.reduce((total, item) => total + parseInt(item.quantity), 0);
    
    // Calcular el subtotal (precio final con IVA, sin descuentos)
    const subtotal = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    
    // Calcular el subtotal sin IVA (precio base)
    const subtotalWithoutVAT = cart.reduce((sum, item) => {
      const price = parseFloat(item.price) / 1.19; // Convertir a precio sin IVA
      return sum + (price * parseInt(item.quantity));
    }, 0);
    
    // Calcular el IVA total (19% del subtotal sin IVA)
    const totalTax = subtotalWithoutVAT * 0.19;
    
    // Si hay un tax_amount definido en el ítem, usarlo
    const totalTaxFromItems = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.tax_amount || 0) * parseInt(item.quantity));
    }, 0);
    
    // Usar el mayor valor entre el IVA calculado y el IVA de los ítems
    const totalTaxFinal = Math.max(totalTax, totalTaxFromItems);
    
    // Calcular el total de descuentos (ya incluyen IVA)
    const totalDiscount = cart.reduce((sum, item) => {
      const discount = parseFloat(item.discount_amount) || 0;
      return sum + (discount * parseInt(item.quantity));
    }, 0);
    
    // Calcular el total usando el precio base (sin descuentos)
    const total = cart.reduce((sum, item) => {
      // Usar el precio base (sin descuentos) que ya incluye IVA
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    
    // Actualizar totales
    if (cartSubtotalElement) {
      cartSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
      // Actualizar el contador de productos en el resumen
      const productText = totalItems === 1 ? 'producto' : 'productos';
      cartSubtotalElement.previousElementSibling.textContent = `Subtotal (${totalItems} ${productText})`;
    }
    
    // Mostrar IVA (19% del subtotal sin IVA)
    if (cartTaxesElement) {
      cartTaxesElement.textContent = `$${totalTaxFinal.toFixed(2)}`;
    }
    
    // Mostrar descuentos
    if (cartDiscountsElement) {
      if (totalDiscount > 0) {
        cartDiscountsElement.innerHTML = `-$${totalDiscount.toFixed(2)}`;
        cartDiscountsElement.parentElement.classList.remove('hidden');
      } else {
        cartDiscountsElement.parentElement.classList.add('hidden');
      }
    }
    
    // Mostrar total (precio base con IVA, sin descuentos)
    if (cartTotalElement) {
      cartTotalElement.textContent = `$${subtotal.toFixed(2)}`;
    }
    
    // Si hay descuentos, mostrar el total con descuento en otro lugar
    if (totalDiscount > 0) {
      const totalWithDiscount = (subtotal - totalDiscount).toFixed(2);
      // Puedes agregar aquí un elemento para mostrar el total con descuento si es necesario
      console.log('Total con descuento:', totalWithDiscount);
    }
    
    // Mostrar items del carrito
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = cart.map(item => {
        // Usar el precio base (con IVA) para mostrar en el carrito
        const price = parseFloat(item.price) || 0;
        const tax = parseFloat(item.tax) || 0;
        const discount = parseFloat(item.discount) || 0;
        const discountAmount = parseFloat(item.discount_amount) || 0;
        const finalPrice = price * item.quantity; // Mostrar precio sin descuentos
        const hasDiscount = discount > 0;
        
        return `
        <div class="cart-item border-b border-gray-200 py-4" data-product-id="${item.id}">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-20 w-20">
              <img src="${item.image_url || 'https://via.placeholder.com/80'}" 
                   alt="${item.name}" 
                   class="h-full w-full object-cover rounded">
            </div>
            <div class="ml-4 flex-1">
              <div class="flex justify-between">
                <div>
                  <h3 class="text-base font-medium text-gray-900">${item.name}</h3>
                  <p class="text-sm text-gray-500">${item.store_name || 'Tienda'}</p>
                </div>
                <div class="text-right">
                  <p class="text-base font-medium text-gray-900">$${price.toFixed(2)}</p>
                  ${hasDiscount ? `
                    <p class="text-xs text-gray-500">${discount}% de descuento aplicado al finalizar</p>
                    <span class="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                      ¡Ahorras $${(discountAmount * item.quantity).toFixed(2)}!
                    </span>
                  ` : ''}
                </div>
              </div>
              
              <div class="mt-1 text-sm text-gray-600">
                <div class="flex justify-between">
                  <span>Precio unitario:</span>
                  <span>$${price.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span>IVA (19%):</span>
                  <span>$${tax.toFixed(2)}</span>
                </div>
                ${hasDiscount ? `
                <div class="flex justify-between text-green-600">
                  <span>Descuento (${discount}%):</span>
                  <span>-$${(discountAmount * item.quantity).toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="mt-2 flex items-center">
                <div class="flex items-center border rounded-md">
                  <button class="decrease-quantity text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-l" 
                          data-product-id="${item.id}">
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <span class="quantity-display w-8 text-center text-sm">${item.quantity}</span>
                  <button class="increase-quantity text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-r" 
                          data-product-id="${item.id}">
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
                <button class="remove-item ml-4 text-red-600 hover:text-red-800 text-sm" 
                        data-product-id="${item.id}">
                  <i class="fas fa-trash-alt mr-1"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
        `;
      }).join('');
    }
    
    // Mostrar contenido del carrito
    if (emptyCartMessage) emptyCartMessage.classList.add('hidden');
    if (cartContent) cartContent.classList.remove('hidden');
  }
  
  // 10. Actualizar la visualización del crédito
  function updateCreditDisplay() {
    if (!userProfile) return;
    
    const availableCredit = (parseFloat(userProfile.credit_assigned) || 0) - (parseFloat(userProfile.credit_used) || 0);
    const creditProgress = document.getElementById('credit-progress');
    const availableCreditElement = document.getElementById('available-credit');
    const creditMessage = document.getElementById('credit-message');
    const payWithCreditBtn = document.getElementById('pay-with-credit');
    const cartTotal = getCart().reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    // Actualizar crédito disponible
    if (availableCreditElement) {
      availableCreditElement.textContent = `$${availableCredit.toFixed(2)}`;
    }
    
    // Actualizar barra de progreso
    if (creditProgress) {
      const creditLimit = parseFloat(userProfile.credit_assigned) || 1; // Evitar división por cero
      const usedPercentage = ((parseFloat(userProfile.credit_used) || 0) / creditLimit) * 100;
      creditProgress.style.width = `${Math.min(100, usedPercentage)}%`;
      
      // Cambiar color según el porcentaje usado
      if (usedPercentage > 80) {
        creditProgress.className = 'bg-red-500 h-2.5 rounded-full';
      } else if (usedPercentage > 50) {
        creditProgress.className = 'bg-yellow-500 h-2.5 rounded-full';
      } else {
        creditProgress.className = 'bg-green-500 h-2.5 rounded-full';
      }
    }
    
    // Actualizar mensaje de crédito
    if (creditMessage) {
      if (availableCredit <= 0) {
        creditMessage.textContent = 'Has agotado tu cupo de crédito';
        creditMessage.className = 'mt-1 text-xs text-red-600';
      } else {
        creditMessage.textContent = `Límite: $${(userProfile.credit_assigned || 0).toFixed(2)} | Usado: $${(userProfile.credit_used || 0).toFixed(2)}`;
        creditMessage.className = 'mt-1 text-xs text-gray-600';
      }
    }
    
    // Actualizar botón de pago con crédito
    if (payWithCreditBtn) {
      const hasCredit = availableCredit >= cartTotal;
      payWithCreditBtn.disabled = !hasCredit || cartTotal === 0;
      
      if (cartTotal === 0) {
        payWithCreditBtn.title = 'El carrito está vacío';
      } else if (!hasCredit) {
        payWithCreditBtn.title = `Crédito insuficiente. Necesitas $${(cartTotal - availableCredit).toFixed(2)} adicionales`;
      } else {
        payWithCreditBtn.title = '';
      }
    }
  }
  
  // 11. Configurar manejadores de eventos
  function setupEventListeners() {
    // Botón de pago con crédito (funcional)
    const payWithCreditBtn = document.getElementById('pay-with-credit');
    if (payWithCreditBtn) {
      payWithCreditBtn.addEventListener('click', handleCreditPayment);
    }
    
    // Botón de pago en efectivo
    const payWithCashBtn = document.getElementById('pay-with-cash');
    if (payWithCashBtn) {
      payWithCashBtn.addEventListener('click', handleCashPayment);
    }
    
    // Botón de pago con Nequi (redirige a la página oficial)
    const payWithNequiBtn = document.getElementById('pay-with-nequi');
    if (payWithNequiBtn) {
      payWithNequiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.nequi.com.co/', '_blank');
      });
    }
    
    // Botón de pago con Solana ya tiene su enlace en el HTML
    
    // Delegación de eventos para los botones de cantidad y eliminar
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.decrease-quantity, .increase-quantity, .remove-item');
      if (!target) return;
      
      const productId = target.dataset.productId;
      if (!productId) return;
      
      const cart = getCart();
      const itemIndex = cart.findIndex(item => item.id === productId);
      
      if (itemIndex === -1) return;
      
      if (target.classList.contains('decrease-quantity')) {
        // Disminuir cantidad
        if (cart[itemIndex].quantity > 1) {
          cart[itemIndex].quantity--;
          saveCart(cart);
        }
      } else if (target.classList.contains('increase-quantity')) {
        // Aumentar cantidad
        cart[itemIndex].quantity++;
        saveCart(cart);
      } else if (target.classList.contains('remove-item')) {
        // Eliminar producto
        if (confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
          cart.splice(itemIndex, 1);
          saveCart(cart);
        }
      }
    });
  }
  
  // 12. Manejador de pago con crédito
  async function handleCreditPayment() {
    try {
      const cart = getCart();
      if (cart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
      }
      
      // Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showNotification('Debes iniciar sesión para continuar', 'error');
        window.location.href = 'login.html?redirect=carrito.html';
        return;
      }
      
      // Verificar que el perfil del usuario esté cargado
      if (!userProfile) {
        userProfile = await getUserProfile(user.id);
      }
      
      // Obtener el total usando la función getCartTotal que incluye IVA y descuentos
      const total = getCartTotal();
      
      // Verificar crédito
      checkCredit(userProfile, total);
      
      // Confirmar compra
      const confirmResult = await Swal.fire({
        title: 'Confirmar compra',
        html: `¿Deseas confirmar la compra por un total de <b>$${total.toFixed(2)}</b>?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        footer: '<div class="text-sm text-gray-500 mt-2">IVA incluido</div>'
      });
      
      if (!confirmResult.isConfirmed) return;
      
      // Mostrar loader
      Swal.fire({
        title: 'Procesando compra...',
        text: 'Por favor espera mientras procesamos tu pedido',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      try {
        // Obtener el store_id del primer producto del carrito
        const storeId = cart[0]?.store_id;
        
        // Verificar que el store_id sea válido
        if (!storeId) {
          throw new Error('No se pudo determinar la tienda de los productos');
        }
        
        // Verificar que todos los productos sean de la misma tienda
        const allSameStore = cart.every(item => item.store_id === storeId);
        if (!allSameStore) {
          throw new Error('No puedes comprar productos de diferentes tiendas en el mismo pedido');
        }
        
        console.log('Creando orden para la tienda:', storeId);
        const { order } = await createOrder(cart, storeId);
        
        // Actualizar crédito
        await updateCredit(total);
        
        // Limpiar carrito
        localStorage.removeItem(CART_STORAGE_KEY);
        
        // Cerrar loader
        Swal.close();
        
        // Mostrar mensaje de éxito y generar factura
        const orderNumber = order.id.substring(0, 8).toUpperCase();
        
        // Generar factura
        const generateInvoice = (order, cart) => {
          try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configuración del documento
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            
            // Logo y encabezado
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235); // Azul-600
            doc.setFont('helvetica', 'bold');
            doc.text('FACTURA', margin, 20);
            
            // Información de la empresa
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text('CrediControl', margin, 30);
            doc.text('NIT: 123456789-0', margin, 35);
            doc.text('Carrera 123 #45-67', margin, 40);
            doc.text('Bogotá, Colombia', margin, 45);
            doc.text('Tel: (601) 123 4567', margin, 50);
            
            // Información del cliente
            doc.setFont('helvetica', 'bold');
            doc.text('Cliente:', margin, 70);
            doc.setFont('helvetica', 'normal');
            doc.text(userProfile.full_name || 'Cliente', margin + 20, 70);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Documento:', margin, 75);
            doc.setFont('helvetica', 'normal');
            doc.text(userProfile.document_number || 'N/A', margin + 30, 75);
            
            // Información de la factura
            doc.setFont('helvetica', 'bold');
            doc.text('Factura #', pageWidth - margin - 60, 30);
            doc.setFont('helvetica', 'normal');
            doc.text(order.id.substring(0, 8).toUpperCase(), pageWidth - margin - 10, 30, { align: 'right' });
            
            doc.setFont('helvetica', 'bold');
            doc.text('Fecha:', pageWidth - margin - 40, 35);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date().toLocaleDateString('es-CO'), pageWidth - margin - 10, 35, { align: 'right' });
            
            // Tabla de productos
            const headers = [['Descripción', 'Cant.', 'V. Unitario', 'IVA (19%)', 'Total']];
            
            // Calcular valores por producto
            const itemsWithTotals = cart.map(item => {
              const price = parseFloat(item.price); // Precio ya incluye IVA
              const quantity = parseInt(item.quantity);
              const taxRate = 0.19; // 19% de IVA
              
              // Calcular el precio sin IVA
              const priceWithoutVAT = price / (1 + taxRate);
              
              // Calcular el monto del IVA
              const taxAmount = price - priceWithoutVAT;
              
              // Calcular totales
              const subtotal = priceWithoutVAT * quantity;
              const tax = taxAmount * quantity;
              const total = price * quantity; // Total con IVA incluido
              
              return {
                ...item,
                price: priceWithoutVAT, // Mostrar precio sin IVA
                quantity,
                subtotal,
                tax,
                total
              };
            });
            
            // Generar filas de la tabla
            const data = itemsWithTotals.map(item => [
              item.name,
              item.quantity,
              `$${item.price.toFixed(2)}`,
              `$${item.tax.toFixed(2)}`,
              `$${item.total.toFixed(2)}`
            ]);
            
            // Calcular totales generales
            const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0);
            const totalTax = itemsWithTotals.reduce((sum, item) => sum + item.tax, 0);
            const total = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
            
            // Agregar fila de subtotal
            data.push([
              { content: 'SUBTOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' }},
              '',
              { content: `$${subtotal.toFixed(2)}`, styles: { fontStyle: 'bold' }}
            ]);
            
            // Agregar fila de IVA
            data.push([
              { content: 'TOTAL IVA (19%)', colSpan: 3, styles: { halign: 'right' }},
              { content: `$${totalTax.toFixed(2)}` },
              { content: '' }
            ]);
            
            // Agregar fila de total
            data.push([
              { content: 'TOTAL A PAGAR', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [37, 99, 235] }},
              { content: `$${total.toFixed(2)}`, colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [37, 99, 235] }}
            ]);
            
            // Generar la tabla
            doc.autoTable({
              startY: 90,
              head: headers,
              body: data,
              margin: { left: margin, right: margin },
              headStyles: { 
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold'
              },
              alternateRowStyles: { fillColor: [245, 247, 250] },
              styles: { fontSize: 9 },
              columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 15, halign: 'center' },
                2: { cellWidth: 25, halign: 'right' },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' }
              }
            });
            
            // Pie de página
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('¡Gracias por su compra!', margin, doc.internal.pageSize.height - 20);
            doc.text('Factura generada automáticamente por CrediControl', margin, doc.internal.pageSize.height - 15);
            
            // Retornar el documento generado
            return doc;
          } catch (error) {
            console.error('Error al generar la factura:', error);
            return null;
          }
        };
        
        // Generar la factura
        const invoice = generateInvoice(order, cart);
        
        // Mostrar mensaje de éxito con opción de ver factura
        const result = await Swal.fire({
          title: '¡Compra exitosa!',
          html: `Tu pedido #${orderNumber} ha sido procesado correctamente.<br><br>¿Deseas ver la factura ahora?`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Ver factura',
          cancelButtonText: 'Ver pedido',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d',
          allowOutsideClick: false,
          footer: '<div class="text-sm text-gray-500">También puedes descargar la factura más tarde desde la sección de pedidos</div>'
        });
        
        if (result.isConfirmed && invoice) {
          // Mostrar la factura en una nueva pestaña
          const pdfBlob = invoice.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
          
          // Opcional: Descargar automáticamente después de mostrar
          setTimeout(() => {
            invoice.save(`factura-${order.id.substring(0, 8)}.pdf`);
          }, 1000);
        }
        
        // Redirigir a la página del pedido
        window.location.href = `pedidos.html?id=${order.id}`;
        
      } catch (error) {
        console.error('Error al procesar la compra:', error);
        Swal.fire({
          title: 'Error',
          text: error.message || 'Ocurrió un error al procesar el pago',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3085d6'
        });
      }
      
    } catch (error) {
      console.error('Error en el pago con crédito:', error);
      Swal.fire({
        title: 'Error',
        text: error.message || 'Ocurrió un error al procesar el pago',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3085d6'
      });
    }
  }
  
  // 13. Manejador de pago en efectivo
  async function handleCashPayment() {
    try {
      const cart = getCart();
      if (cart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
      }
      
      // Verificar autenticación
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification('Debes iniciar sesión para continuar', 'error');
        window.location.href = 'login.html?redirect=carrito.html';
        return;
      }
      
      // Obtener el total
      const total = getCartTotal();
      
      // Mostrar confirmación con SweetAlert2
      const confirmResult = await Swal.fire({
        title: 'Confirmar pago en efectivo',
        html: `¿Deseas confirmar el pedido por un total de <b>$${total.toFixed(2)}</b>?<br><br>El pago se realizará al momento de la entrega.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        footer: '<div class="text-sm text-gray-500 mt-2">IVA incluido</div>'
      });
      
      if (!confirmResult.isConfirmed) return;
      
      // Mostrar loader
      Swal.fire({
        title: 'Procesando pedido...',
        text: 'Por favor espera mientras procesamos tu pedido',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Crear orden con estado 'Pendiente de pago'
      const { order } = await createOrder(cart, cart[0].store_id);
      
      // Actualizar estado de la orden a 'Pendiente de pago'
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'Pendiente de pago',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);
      
      if (updateError) throw updateError;
      
      // Limpiar carrito
      clearCart();
      
      // Generar factura
      const generateInvoice = (order, cart) => {
        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          
          // Configuración del documento
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 15;
          
          // Logo y encabezado
          doc.setFontSize(22);
          doc.setTextColor(37, 99, 235);
          doc.setFont('helvetica', 'bold');
          doc.text('FACTURA', margin, 20);
          
          // Información de la empresa
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.text('Tienda', margin, 30);
          doc.text('NIT: 123456789-0', margin, 35);
          doc.text('Dirección de la tienda', margin, 40);
          doc.text('Ciudad, País', margin, 45);
          doc.text('Tel: (123) 456 7890', margin, 50);
          
          // Información del cliente
          doc.setFont('helvetica', 'bold');
          doc.text('Cliente:', margin, 70);
          doc.setFont('helvetica', 'normal');
          doc.text(userProfile?.full_name || 'Cliente', margin + 20, 70);
          
          doc.setFont('helvetica', 'bold');
          doc.text('Documento:', margin, 75);
          doc.setFont('helvetica', 'normal');
          doc.text(userProfile?.document_number || 'N/A', margin + 30, 75);
          
          // Información de la factura
          doc.setFont('helvetica', 'bold');
          doc.text('Factura #', pageWidth - margin - 60, 30);
          doc.setFont('helvetica', 'normal');
          doc.text(order.id.substring(0, 8).toUpperCase(), pageWidth - margin - 10, 30, { align: 'right' });
          
          doc.setFont('helvetica', 'bold');
          doc.text('Fecha:', pageWidth - margin - 40, 35);
          doc.setFont('helvetica', 'normal');
          doc.text(new Date().toLocaleDateString('es-CO'), pageWidth - margin - 10, 35, { align: 'right' });
          
          // Tabla de productos
          const headers = [['Descripción', 'Cant.', 'V. Unitario', 'IVA (19%)', 'Total']];
          
          // Calcular valores por producto
          const itemsWithTotals = cart.map(item => {
            const price = parseFloat(item.price);
            const quantity = parseInt(item.quantity);
            const taxRate = 0.19; // 19% de IVA
            const subtotal = price * quantity;
            const tax = subtotal * taxRate;
            const total = subtotal + tax;
            
            return [
              item.name,
              quantity.toString(),
              `$${price.toFixed(2)}`,
              `$${tax.toFixed(2)}`,
              `$${total.toFixed(2)}`
            ];
          });
          
          // Agregar fila de totales
          const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
          const taxTotal = subtotal * 0.19;
          const grandTotal = subtotal + taxTotal;
          
          itemsWithTotals.push([
            { content: 'SUBTOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `$${subtotal.toFixed(2)}`, styles: { fontStyle: 'bold' } }
          ]);
          
          itemsWithTotals.push([
            { content: 'IVA (19%)', colSpan: 4, styles: { halign: 'right' } },
            { content: `$${taxTotal.toFixed(2)}`, styles: {} }
          ]);
          
          itemsWithTotals.push([
            { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `$${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold' } }
          ]);
          
          // Generar tabla
          doc.autoTable({
            startY: 90,
            head: headers,
            body: itemsWithTotals,
            margin: { left: margin, right: margin },
            headStyles: { 
              fillColor: [37, 99, 235],
              textColor: 255,
              fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { 
              fontSize: 9,
              cellPadding: 3,
              overflow: 'linebreak',
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 'auto' },
              1: { cellWidth: 20, halign: 'center' },
              2: { cellWidth: 30, halign: 'right' },
              3: { cellWidth: 30, halign: 'right' },
              4: { cellWidth: 30, halign: 'right' }
            }
          });
          
          // Pie de página
          const pageCount = doc.internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(
              `Página ${i} de ${pageCount} | Factura generada el ${new Date().toLocaleString()}`,
              pageWidth / 2,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'center' }
            );
          }
          
          return doc;
        } catch (error) {
          console.error('Error al generar factura:', error);
          return null;
        }
      };
      
      // Generar y descargar factura
      const invoice = generateInvoice(order, cart);
      
      // Mostrar confirmación con opción de ver factura
      Swal.fire({
        title: '¡Pedido realizado con éxito!',
        html: `Tu pedido #${order.id} ha sido registrado.<br><br>Total: <b>$${total.toFixed(2)}</b><br><br>Deberás pagar al momento de la entrega.`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Ver factura',
        cancelButtonText: 'Cerrar',
        footer: '<div class="text-sm text-gray-500">Puedes descargar la factura más tarde desde la sección de pedidos</div>'
      }).then((result) => {
        if (result.isConfirmed && invoice) {
          // Guardar la factura para mostrarla en una nueva pestaña
          const pdfBlob = invoice.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
        }
        // Redirigir a la página de pedidos en cualquier caso
        window.location.href = 'pedidos.html';
      });
      
    } catch (error) {
      console.error('Error en el pago en efectivo:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al procesar el pedido: ' + (error.message || 'Error desconocido'),
        icon: 'error'
      });
    }
  }
  
  // 14. Manejador de pago con Nequi (redirige a la página oficial)
  function handleNequiPayment() {
    // Redirigir directamente a la página de Nequi
    window.open('https://www.nequi.com.co/', '_blank');
    
    // Mostrar mensaje informativo
    Swal.fire({
      title: 'Redirigiendo a Nequi',
      text: 'Serás redirigido a la aplicación de Nequi para completar tu pago.',
      icon: 'info',
      confirmButtonText: 'Entendido'
    });
  }
  
  // 14. Mostrar notificación
  function showNotification(message, type = 'info') {
    const toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    
    return toast.fire({
      icon: type,
      title: message
    });
  }
  
  // 15. Agregar producto al carrito
  function addToCart(product) {
    return new Promise((resolve, reject) => {
      try {
        if (!product || !product.id) {
          throw new Error('Producto inválido');
        }
        
        // Validar que el producto tenga store_id
        if (!product.store_id) {
          console.error('El producto no tiene store_id:', product);
          throw new Error('No se pudo determinar la tienda del producto');
        }
        
        const cart = getCart();
        
        // Verificar si ya hay productos de otra tienda en el carrito
        if (cart.length > 0) {
          const firstItemStoreId = cart[0].store_id;
          if (product.store_id !== firstItemStoreId) {
            throw new Error('No puedes mezclar productos de diferentes tiendas en el mismo carrito');
          }
        }
        
        // El precio ya incluye IVA (viene del catálogo)
        const price = parseFloat(product.price) || 0; // Precio con IVA incluido
        const taxRate = 0.19; // 19% de IVA
        
        // Calcular el precio sin IVA (para referencia)
        const priceWithoutVAT = price / (1 + taxRate);
        
        // Calcular el monto del IVA
        const tax = price - priceWithoutVAT;
        
        // Manejar descuentos (se aplican sobre el precio con IVA)
        const discount = product.discount ? parseFloat(product.discount) : 0;
        const discountAmount = price * (discount / 100);
        
        // Precio final con descuento (ya incluye IVA)
        const finalPrice = price - discountAmount;
        
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
          // Si el producto ya está en el carrito, actualizar cantidad
          existingItem.quantity += product.quantity || 1;
        } else {
          // Si es un producto nuevo, agregarlo al carrito con toda la información de precios
          cart.push({
            id: product.id,
            name: product.name,
            price: price, // Precio base sin IVA
            tax: tax, // Monto del IVA
            discount: discount, // Porcentaje de descuento
            discount_amount: discountAmount, // Monto del descuento
            final_price: finalPrice, // Precio final con IVA y descuento
            image_url: product.image_url || '',
            quantity: product.quantity || 1,
            store_id: product.store_id,
            store_name: product.store_name || 'Tienda',
            reference: product.reference || '',
            created_at: new Date().toISOString()
          });
        }
        
        saveCart(cart);
        updateCartDisplay(); // Actualizar la visualización del carrito
        
        console.log('Producto agregado al carrito:', { 
          productId: product.id, 
          storeId: product.store_id,
          price: price,
          tax: tax,
          discount: discount,
          finalPrice: finalPrice,
          cart: cart.map(item => ({ 
            id: item.id, 
            name: item.name,
            price: item.price,
            finalPrice: item.final_price,
            quantity: item.quantity 
          }))
        });
        
        showNotification('Producto agregado al carrito', 'success');
        resolve(cart);
        
      } catch (error) {
        console.error('Error al agregar al carrito:', error);
        showNotification(error.message || 'Error al agregar al carrito', 'error');
        reject(error);
      }
    });
  }
  
  // 16. Limpiar carrito
  function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartDisplay();
    updateCreditDisplay();
  }
  
  // 17. Obtener total del carrito (incluye IVA y descuentos)
  function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => {
      // Usar final_price si está disponible, de lo contrario usar el precio base (que ya incluye IVA)
      let finalPrice;
      
      if (item.final_price !== undefined) {
        // Usar el precio final directamente de la base de datos
        finalPrice = parseFloat(item.final_price);
      } else {
        // Si no hay precio final, usar el precio base (que ya incluye IVA)
        finalPrice = parseFloat(item.price);
      }
      
      // Asegurarse de que el precio no sea negativo
      finalPrice = Math.max(0, finalPrice);
      
      return sum + (finalPrice * parseInt(item.quantity));
    }, 0);
  }
  
  // 18. Obtener cantidad de ítems en el carrito
  function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
  }
  
  // 19. Verificar si el carrito está vacío
  function isCartEmpty() {
    return getCart().length === 0;
  }
  
  // 20. Obtener el perfil del usuario actual
  function getCurrentUserProfile() {
    return userProfile;
  }
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // API pública del módulo
  return {
    init,
    addToCart,
    getCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
    isCartEmpty,
    getCurrentUserProfile,
    updateCreditDisplay
  };
})();