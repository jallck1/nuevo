// Módulo para la orden ultra futurista
window.directOrderModule = (function() {
    // Exportar funciones para que sean accesibles desde el HTML
    window.addProductToOrder = addProductToOrder;
    window.increaseQuantity = increaseQuantity;
    window.decreaseQuantity = decreaseQuantity;
    window.removeItem = removeItem;
    window.calculateTotals = calculateTotals;
    window.updateOrderItemsDisplay = updateOrderItemsDisplay;
    let supabase = null;
    let storeId = null;
    let selectedClient = null;
    let orderItems = [];  // Lista de productos en el carrito
    let currentClientCredit = null;  // Crédito disponible del cliente actual

    // Variable para almacenar el descuento manual
    let manualDiscount = 0;
  
  // Función para aplicar el descuento manual
  window.applyDiscount = function() {
    const discountInput = document.getElementById('discount');
    const discountValue = parseFloat(discountInput.value) || 0;
    
    if (discountValue < 0) {
      showNotification('El descuento no puede ser negativo', 'error');
      discountInput.value = '0';
      manualDiscount = 0;
      calculateTotals();
      return;
    }
    
    if (discountValue > 100) {
      showNotification('El descuento no puede ser mayor a 100%', 'error');
      discountInput.value = '100';
      manualDiscount = 100;
      calculateTotals();
      return;
    }
    
    manualDiscount = discountValue > 0 ? discountValue : 0;
    calculateTotals();
    
    if (discountValue > 0) {
      showNotification('Descuento aplicado correctamente', 'success');
    } else {
      showNotification('Se eliminó el descuento manual', 'info');
    }
  };

  // Función para calcular los totales
  function calculateTotals() {
    // Inicializar variables
    let subtotal = 0;
    let productDiscountTotal = 0;
    let totalConIva = 0;
    let valorSinIva = 0;
    let ivaIncluido = 0;
    
    // Calcular subtotal y descuentos de productos
    orderItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      
      // Calcular descuento del producto si existe
      if (item.discountPercentage > 0) {
        const itemDiscount = (itemSubtotal * item.discountPercentage) / 100;
        productDiscountTotal += itemDiscount;
      }
    });
    
    // Si no hay productos, reiniciar todo
    if (orderItems.length === 0) {
      document.getElementById('subtotalAmount').textContent = '$0.00';
      document.getElementById('discountAmount').textContent = '$0.00';
      document.getElementById('productDiscountAmount').textContent = '$0.00';
      document.getElementById('subtotalWithDiscount').textContent = '$0.00';
      document.getElementById('taxAmount').textContent = '$0.00';
      document.getElementById('totalAmount').textContent = '$0.00';
      return;
    }
    
    // El total con IVA es el subtotal (precio original del producto)
    totalConIva = subtotal;
    
    // Calcular valor sin IVA
    valorSinIva = totalConIva / 1.19;
    ivaIncluido = totalConIva - valorSinIva;
    
    // Aplicar descuento manual si existe (sobre el total con IVA)
    let descuentoManualAplicado = 0;
    if (manualDiscount > 0) {
      descuentoManualAplicado = (totalConIva * manualDiscount) / 100;
    }
    
    // Calcular valores con descuento (solo para visualización)
    const totalDescuentos = productDiscountTotal + descuentoManualAplicado;
    const totalConDescuento = totalConIva; // Mantenemos el total fijo
    const valorSinIvaConDescuento = (totalConIva - totalDescuentos) / 1.19;
    
    // Actualizar los elementos del DOM
    document.getElementById('subtotalAmount').textContent = `$${valorSinIva.toFixed(2)}`; // Valor sin IVA original
    document.getElementById('discountAmount').textContent = `$${descuentoManualAplicado.toFixed(2)}`; // Descuento manual
    document.getElementById('productDiscountAmount').textContent = `$${productDiscountTotal.toFixed(2)}`; // Descuento producto
    document.getElementById('subtotalWithDiscount').textContent = `$${valorSinIva.toFixed(2)}`; // Mostrar el valor sin IVA original
    document.getElementById('taxAmount').textContent = `$${ivaIncluido.toFixed(2)}`; // IVA incluido en el precio original
    document.getElementById('totalAmount').textContent = `$${totalConIva.toFixed(2)}`; // Total fijo (precio original)

    // Verificar y actualizar el crédito si hay un cliente seleccionado
    if (selectedClient && currentClientCredit !== null) {
      // Actualizar el crédito restante
      const remainingCredit = currentClientCredit - total;
      document.getElementById('remainingCredit').textContent = `$${remainingCredit.toFixed(2)}`;

      // Verificar si hay crédito suficiente
      if (remainingCredit < 0) {
        showNotification('⚠️ Crédito insuficiente. Necesitas $' + (-remainingCredit).toFixed(2) + ' adicionales', 'warning');
      } else {
        showNotification('✅ Crédito suficiente', 'success');
      }
    }
  }

  // Función para actualizar el crédito disponible del cliente
  async function updateClientCredit() {
    if (!selectedClient) return;

    try {
      // Obtener el perfil completo del cliente
      const { data: client, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedClient.id)
        .single();

      if (error) throw error;

      // Calcular el crédito disponible
      const creditAssigned = parseFloat(client.credit_assigned) || 0;
      const creditUsed = parseFloat(client.credit_used) || 0;
      currentClientCredit = creditAssigned - creditUsed;

      // Mostrar el crédito disponible
      const creditElement = document.getElementById('clientCredit');
      if (creditElement) {
        creditElement.textContent = `$${currentClientCredit.toFixed(2)}`;
      }

      // Calcular el crédito restante basado en los productos en el carrito
      let subtotal = 0;
      orderItems.forEach(item => {
        subtotal += item.quantity * item.unitPrice;
      });
      const total = subtotal * 1.19; // Incluye IVA
      const remainingCredit = currentClientCredit - total;

      // Mostrar el crédito restante
      const remainingElement = document.getElementById('remainingCredit');
      if (remainingElement) {
        remainingElement.textContent = `$${remainingCredit.toFixed(2)}`;
      }

      // Registrar en consola para depuración
      console.log('Crédito del cliente:', {
        assigned: creditAssigned,
        used: creditUsed,
        available: currentClientCredit,
        cartTotal: total,
        remaining: remainingCredit
      });

    } catch (error) {
      console.error('Error al actualizar el crédito del cliente:', error);
      showNotification('Error al cargar el crédito del cliente', 'error');
    }
  }

  // Inicializar el módulo
  async function init() {
    try {
      // Exportar funciones para que sean accesibles desde el HTML
      window.addProductToOrder = addProductToOrder;
      window.decreaseQuantity = decreaseQuantity;
      window.increaseQuantity = increaseQuantity;
      window.removeItem = removeItem;

      // Obtener Supabase
      // Obtener Supabase
      supabase = window.supabase;
      if (!supabase) {
        throw new Error('Supabase no está inicializado');
      }

      // Obtener el ID de la tienda del perfil del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      storeId = profile.store_id;
      
      // Configurar el evento del botón
      document.getElementById('createUltraOrder')?.addEventListener('click', openOrderModal);

      console.log('Módulo de orden ultra futurista inicializado');
    } catch (error) {
      console.error('Error al inicializar el módulo de orden ultra futurista:', error);
    }
  }

  // Abrir modal de orden
  function openOrderModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-11/12 max-w-4xl shadow-xl border border-gray-200">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-blue-600">Crear Orden Ultra Futurista</h2>
            <button onclick="closeOrderModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Sección de Cliente -->
          <div class="mb-6">
            <div class="flex items-end space-x-2 mb-2">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select id="clientSelect" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccione un cliente...</option>
                </select>
              </div>
              <button id="viewClientCreditBtn" class="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm whitespace-nowrap">
                <i class="fas fa-wallet mr-1"></i> Ver Saldo
              </button>
            </div>
          </div>

          <!-- Sección de Productos -->
          <div class="mb-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Producto</label>
              <select id="productSelect" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione un producto...</option>
              </select>
            </div>

            <div class="flex justify-end mb-4">
              <button onclick="addProductToOrder()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <i class="fas fa-plus mr-2"></i>Agregar Producto
              </button>
            </div>

            <div id="orderItemsContainer" class="mt-4 space-y-4">
              <!-- Los productos se agregarán aquí dinámicamente -->
            </div>
          </div>

          <!-- Sección de Pago -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
            <select id="paymentMethod" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccione método de pago...</option>
              <option value="credit">Crédito</option>
              <option value="cash">Efectivo</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <!-- Totales -->
          <div class="border-t border-gray-200 pt-4 mt-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600">Subtotal</span>
              <span id="subtotalAmount" class="font-semibold">$0.00</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-gray-600">Descuento manual:</span>
                <div class="relative w-20">
                  <input type="number" id="discount" min="0" max="100" value="0" 
                         class="w-full border border-gray-300 rounded-md px-2 py-1 text-right"
                         placeholder="0">
                  <span class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
                <button onclick="applyDiscount()" 
                        class="bg-blue-500 text-white px-2 py-1 rounded-md text-sm hover:bg-blue-600">
                  Aplicar
                </button>
              </div>
              <span id="discountAmount" class="font-semibold">$0.00</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600">Descuento producto:</span>
              <span id="productDiscountAmount" class="font-semibold">$0.00</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600">Subtotal con descuento</span>
              <span id="subtotalWithDiscount" class="font-semibold">$0.00</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-600">IVA (19%)</span>
              <span id="taxAmount" class="font-semibold">$0.00</span>
            </div>
            <div class="flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span id="totalAmount" class="font-bold">$0.00</span>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="flex justify-end space-x-4 mt-6">
            <button onclick="closeOrderModal()" class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button onclick="createOrder()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Crear Orden
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Cargar clientes y productos
    loadClients();
    loadProducts();

    // Configurar evento para el botón de ver saldo
    document.getElementById('viewClientCreditBtn')?.addEventListener('click', async () => {
      const clientSelect = document.getElementById('clientSelect');
      const clientId = clientSelect.value;
      
      if (!clientId) {
        showNotification('Por favor, selecciona un cliente primero', 'warning');
        return;
      }

      try {
        // Mostrar loading
        const viewCreditBtn = document.getElementById('viewClientCreditBtn');
        const originalText = viewCreditBtn.innerHTML;
        viewCreditBtn.disabled = true;
        viewCreditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        
        // Obtener información del cliente
        const { data: client, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;
        
        // Formatear moneda
        const formatMoney = (amount) => {
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
          }).format(amount || 0);
        };
        
        // Calcular créditos
        const creditAssigned = parseFloat(client.credit_assigned || 0);
        const creditUsed = parseFloat(client.credit_used || 0);
        const availableCredit = creditAssigned - creditUsed;
        
        // Mostrar información en un SweetAlert2
        try {
          await Swal.fire({
            title: 'Información Crediticia',
            html: `
              <div class="text-left space-y-4">
                <div>
                  <p class="text-sm text-gray-500">Cliente</p>
                  <p class="font-medium">${client.name || 'Sin nombre'} - ${client.email || 'Sin email'}</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Tarjeta de crédito asignado -->
                  <div class="bg-blue-50 p-3 rounded-lg">
                    <p class="text-xs text-gray-500">Crédito Asignado</p>
                    <p class="text-lg font-bold text-blue-600">${formatMoney(creditAssigned)}</p>
                  </div>
                  
                  <!-- Tarjeta de crédito utilizado -->
                  <div class="bg-amber-50 p-3 rounded-lg">
                    <p class="text-xs text-gray-500">Crédito Utilizado</p>
                    <p class="text-lg font-bold text-amber-600">${formatMoney(creditUsed)}</p>
                  </div>
                  
                  <!-- Tarjeta de crédito disponible -->
                  <div class="bg-green-50 p-3 rounded-lg">
                    <p class="text-xs text-gray-500">Crédito Disponible</p>
                    <p class="text-lg font-bold ${availableCredit < 0 ? 'text-red-600' : 'text-green-600'}">
                      ${formatMoney(availableCredit)}
                    </p>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100">
                  <p class="text-xs text-gray-500">Estado: 
                    <span class="font-medium ${client.status === 'Activo' ? 'text-green-600' : 'text-red-600'}">
                      ${client.status || 'No especificado'}
                    </span>
                  </p>
                </div>
              </div>
            `,
            showConfirmButton: true,
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Cerrar',
            width: '600px',
            allowOutsideClick: true,
            allowEscapeKey: true,
            allowEnterKey: true,
            showCloseButton: true
          });
        } catch (error) {
          // Manejar cualquier error que pueda ocurrir al mostrar el SweetAlert
          console.error('Error mostrando el modal de crédito:', error);
        } finally {
          // Asegurarse de restaurar el botón en cualquier caso
          if (viewCreditBtn) {
            viewCreditBtn.disabled = false;
            viewCreditBtn.innerHTML = originalText;
          }
        }
        
      } catch (error) {
        console.error('Error al cargar información crediticia:', error);
        showNotification('Error al cargar la información crediticia del cliente', 'error');
        // Asegurarse de restaurar el botón en caso de error
        if (viewCreditBtn) {
          viewCreditBtn.disabled = false;
          viewCreditBtn.innerHTML = originalText;
        }
      }
    });

    // Configurar eventos
    document.getElementById('clientSelect')?.addEventListener('change', async function(e) {
        const clientId = e.target.value;
        if (clientId) {
            // Actualizar el cliente seleccionado
            selectedClient = orderItems.find(item => item.id === clientId);
            
            // Actualizar el crédito disponible
            await updateClientCredit();
            
            // Limpiar el carrito cuando cambia el cliente
            orderItems = [];
            document.getElementById('orderItemsContainer').innerHTML = '';
            calculateTotals();
        } else {
            selectedClient = null;
            currentClientCredit = null;
            calculateTotals();
        }
    });
    document.getElementById('productSelect')?.addEventListener('change', handleProductChange);
  }

  // Cargar clientes
  async function loadClients() {
    try {
        console.log('Iniciando carga de clientes...');
        
        // Verificar si tenemos supabase inicializado
        if (!supabase) {
            throw new Error('Supabase no está inicializado');
        }

        // Obtener el usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No se encontró el usuario autenticado');

        // Obtener el perfil del usuario
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')  // Cambiado para ver todos los campos
            .eq('id', user.id)
            .single();
            
        if (profileError) throw profileError;
        if (!userProfile) throw new Error('No se encontró el perfil del usuario');

        console.log('Perfil del usuario actual:', userProfile);

        // Verificar si el usuario tiene una tienda asignada
        if (!userProfile.store_id) {
            throw new Error('No tienes una tienda asignada');
        }

        // Primero obtener todos los perfiles para ver qué datos hay
        const { data: allProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('store_id', userProfile.store_id);

        if (profilesError) throw profilesError;
        console.log('Todos los perfiles en la tienda:', allProfiles);

        // Obtener los clientes de la tienda actual
        const { data: clients, error } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('store_id', userProfile.store_id)
            .eq('role', 'buyer')  // Solo usuarios con rol 'buyer'
            .order('name');

        if (error) throw error;

        console.log('Clientes obtenidos:', clients);

        const clientSelect = document.getElementById('clientSelect');
        if (!clientSelect) {
            console.error('No se encontró el select de clientes');
            throw new Error('Elemento select de clientes no encontrado');
        }

        clientSelect.innerHTML = '<option value="">Selecciona un cliente...</option>';

        if (clients && clients.length > 0) {
            console.log('Cargando clientes en el select...');
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} (${client.email})`;
                clientSelect.appendChild(option);
            });
        } else {
            console.log('No se encontraron clientes en la tienda');
            showNotification('No hay clientes registrados en esta tienda', 'info');
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        showNotification('Error al cargar los clientes: ' + error.message, 'error');
    }
}

  // Cargar productos
  async function loadProducts() {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, stock, discount_percentage')
        .eq('store_id', storeId);

      if (error) throw error;

      const productSelect = document.getElementById('productSelect');
      if (!productSelect) return;
      
      // Limpiar opciones existentes
      productSelect.innerHTML = '<option value="">Seleccione un producto</option>';
      
      if (!products || products.length === 0) {
        console.warn('No se encontraron productos');
        return;
      }

      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - $${product.price.toFixed(2)}`;
        option.setAttribute('data-price', product.price);
        option.setAttribute('data-stock', product.stock || 0);
        option.setAttribute('data-discount', product.discount_percentage || 0);
        productSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showNotification('Error al cargar productos: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  // Manejar cambio de cliente
  async function handleClientChange() {
    try {
      const select = document.getElementById('clientSelect');
      const selectedOption = select.options[select.selectedIndex];
      const clientId = selectedOption.value;
      const clientCreditElement = document.getElementById('clientCredit');
      const remainingCreditElement = document.getElementById('remainingCredit');
      const clientNameElement = document.getElementById('clientName');

      if (!clientId) {
        window.selectedClient = null;
        currentClientCredit = null;
        clientCreditElement.textContent = '$0.00';
        remainingCreditElement.textContent = '$0.00';
        if (clientNameElement) clientNameElement.textContent = 'Seleccione un cliente';
        return;
      }

      // Mostrar loading
      clientCreditElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      remainingCreditElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      if (clientNameElement) clientNameElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      // Obtener información completa del cliente
      const { data: client, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      console.log('Datos del cliente:', client); // Para depuración
      // Guardar el ID del cliente en una variable global
      window.selectedClient = client.id;
      
      // Calcular crédito disponible
      const creditAssigned = parseFloat(client.credit_assigned || 0);
      const creditUsed = parseFloat(client.credit_used || 0);
      currentClientCredit = creditAssigned - creditUsed;
      
      // Formatear valores monetarios
      const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 2
        }).format(amount);
      };
      
      // Actualizar la UI
      if (clientNameElement) clientNameElement.textContent = `${client.name || client.email}`;
      clientCreditElement.textContent = formatMoney(creditAssigned);
      
      // Calcular crédito restante (disponible - total actual del carrito)
      const cartTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const remainingCredit = currentClientCredit - cartTotal;
      remainingCreditElement.textContent = formatMoney(remainingCredit);
      
      // Resaltar si el crédito es insuficiente
      if (remainingCredit < 0) {
        remainingCreditElement.classList.add('text-red-600', 'font-bold');
      } else {
        remainingCreditElement.classList.remove('text-red-600', 'font-bold');
      }
      
      // Actualizar totales
      updateOrderTotals();
      
      // Mostrar notificación
      showNotification(
        `${client.name || 'Cliente'} seleccionado. ` +
        `Crédito asignado: ${formatMoney(creditAssigned)} | ` +
        `Utilizado: ${formatMoney(creditUsed)} | ` +
        `Disponible: ${formatMoney(currentClientCredit)}`,
        'success'
      );
      
    } catch (error) {
      console.error('Error al manejar cambio de cliente:', error);
      showNotification('Error al cargar la información del cliente: ' + (error.message || 'Error desconocido'), 'error');
      
      // Restaurar valores por defecto en caso de error
      document.getElementById('clientCredit').textContent = '$0.00';
      document.getElementById('remainingCredit').textContent = '$0.00';
      const clientNameElement = document.getElementById('clientName');
      if (clientNameElement) clientNameElement.textContent = 'Error al cargar';
    }
  }

  // Manejar cambio de producto
  function handleProductChange() {
    // Esta función ya no es necesaria ya que eliminamos los campos de cantidad y precio
    // Se mantiene para evitar errores en otros lugares del código
  }

  // Agregar producto a la orden
  async function addProductToOrder(productData = null) {
    try {
        let productId, name, unitPrice, discountPercentage, quantity = 1;
        
        if (productData) {
            // Si se proporciona un objeto de producto, usarlo directamente
            productId = productData.id;
            name = productData.name || 'Producto sin nombre';
            unitPrice = parseFloat(productData.price || '0');
            discountPercentage = parseFloat(productData.discount_percentage || '0');
            quantity = parseInt(productData.quantity || '1');
        } else {
            // Si no se proporciona un objeto, usar el selector de productos
            const productSelect = document.getElementById('productSelect');
            
            if (!productSelect) {
                throw new Error('No se encontró el selector de productos');
            }

            productId = productSelect.value;
            
            if (!productId) {
                throw new Error('Por favor, seleccione un producto');
            }
            
            // Obtener los datos del producto seleccionado
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            name = selectedOption.text;
            unitPrice = parseFloat(selectedOption.getAttribute('data-price') || '0');
            discountPercentage = parseFloat(selectedOption.getAttribute('data-discount') || '0');
            
            // Limpiar el selector de productos
            productSelect.value = '';
        }

        // Verificar si el producto ya está en el carrito
        const existingProductIndex = orderItems.findIndex(item => item.id === productId);
        
        if (existingProductIndex !== -1) {
            // Si el producto ya está en el carrito, actualizar la cantidad
            orderItems[existingProductIndex].quantity += quantity;
        } else {
            // Si no está en el carrito, agregarlo
            const product = {
                id: productId,
                name: name,
                quantity: quantity,
                unitPrice: unitPrice,
                discountPercentage: discountPercentage,
                // Mantener compatibilidad con el formato existente
                price: unitPrice,
                discount_percentage: discountPercentage
            };
            orderItems.push(product);
        }

        // Actualizar la interfaz
        const container = document.getElementById('orderItemsContainer');
        if (!container) throw new Error('No se encontró el contenedor de productos');

        // Limpiar el contenedor y recrear todos los elementos
        container.innerHTML = '';
        orderItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center p-3 border-b border-gray-200 rounded-md';
            itemElement.innerHTML = `
                <div class="flex-1">
                    <div class="flex justify-between items-center">
                        <span class="font-medium">${item.name}</span>
                        <span class="text-sm text-gray-600">$${item.unitPrice.toFixed(2)}</span>
                    </div>
                    <div class="mt-1 flex items-center">
                        <button onclick="decreaseQuantity('${item.id}')" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="mx-2">${item.quantity}</span>
                        <button onclick="increaseQuantity('${item.id}')" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-semibold">$${(item.quantity * item.unitPrice).toFixed(2)}</span>
                    <button onclick="removeItem('${item.id}')" class="ml-3 text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(itemElement);
        });

        // Limpiar el selector de productos solo si estamos agregando desde el selector
        if (!productData) {
            const productSelect = document.getElementById('productSelect');
            if (productSelect) productSelect.value = '';
        }

        // Actualizar la interfaz
        updateOrderItemsDisplay();
        
        // Actualizar los totales
        calculateTotals();
    } catch (error) {
        console.error('Error al agregar producto:', error);
        showNotification(error.message, 'error');
    }
}

// Aumentar la cantidad de un producto
function increaseQuantity(productId) {
    const item = orderItems.find(item => item.id === productId);
    if (item) {
        item.quantity += 1;
        updateOrderItemsDisplay();
        calculateTotals();
    }
}

// Disminuir la cantidad de un producto
function decreaseQuantity(productId) {
    const item = orderItems.find(item => item.id === productId);
    if (item && item.quantity > 1) {
        item.quantity -= 1;
        updateOrderItemsDisplay();
        calculateTotals();
    }
}

// Eliminar un producto del carrito
function removeItem(productId) {
    const index = orderItems.findIndex(item => item.id === productId);
    if (index !== -1) {
        orderItems.splice(index, 1);
        updateOrderItemsDisplay();
        calculateTotals();
    }
}

// Actualizar la visualización de los productos en el carrito
function updateOrderItemsDisplay() {
    const container = document.getElementById('orderItemsContainer');
    if (!container) return;

    container.innerHTML = '';
    
    if (orderItems.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay productos en el carrito</p>';
        return;
    }
    
    orderItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'flex justify-between items-center p-3 border-b border-gray-200 rounded-md';
        itemElement.innerHTML = `
            <div class="flex-1">
                <div class="flex justify-between items-center">
                    <span class="font-medium">${item.name}</span>
                    <span class="text-sm text-gray-600">$${item.unitPrice.toFixed(2)}</span>
                </div>
                <div class="mt-1 flex items-center">
                    <button onclick="decreaseQuantity('${item.id}')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="mx-2">${item.quantity}</span>
                    <button onclick="increaseQuantity('${item.id}')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <div class="text-right">
                <span class="font-semibold">$${(item.quantity * item.unitPrice).toFixed(2)}</span>
                <button onclick="removeItem('${item.id}')" class="ml-3 text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(itemElement);
    });
}

// Actualizar totales
function updateOrderTotals() {
    let subtotal = 0;
    orderItems.forEach(item => {
        subtotal += item.subtotal;
      subtotal += item.subtotal;
    });

    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    document.getElementById('subtotalAmount').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
  }

  // Función para actualizar el crédito del cliente
  async function updateClientCredit(clientId, amount) {
    try {
      if (!clientId) {
        throw new Error('ID de cliente no proporcionado');
      }
      
      console.log('Actualizando crédito para cliente:', clientId, 'Monto:', amount);
      
      // Obtener el crédito actual del cliente
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('credit_used')
        .eq('id', clientId)
        .single();
      
      if (fetchError) {
        console.error('Error al obtener perfil:', fetchError);
        throw fetchError;
      }
      
      const currentCreditUsed = parseFloat(currentProfile?.credit_used) || 0;
      const newCreditUsed = currentCreditUsed + parseFloat(amount);
      
      console.log('Crédito actual:', currentCreditUsed, 'Nuevo crédito usado:', newCreditUsed);
      
      // Actualizar el crédito usado
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          credit_used: newCreditUsed,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error al actualizar perfil:', updateError);
        throw updateError;
      }
      
      console.log('✅ Crédito actualizado correctamente');
      return updatedProfile;
      
    } catch (error) {
      console.error('Error en updateClientCredit:', error);
      throw new Error(`Error al actualizar crédito: ${error.message}`);
    }
  }

  // Crear o actualizar orden
  window.createOrder = async function(event) {
    if (event) event.preventDefault(); // Prevenir envío del formulario
    
    try {
      const clientSelect = document.getElementById('clientSelect');
      const clientId = clientSelect.value;
      
      if (!clientId) {
        showNotification('Por favor, seleccione un cliente', 'error');
        return;
      }

      if (orderItems.length === 0) {
        showNotification('Por favor, agregue al menos un producto', 'error');
        return;
      }
      
      // Verificar si estamos en modo edición
      const modal = document.querySelector('.fixed.inset-0');
      const isEditMode = modal && modal.getAttribute('data-edit-mode') === 'true';
      const orderId = modal ? modal.getAttribute('data-order-id') : null;
      
      console.log(isEditMode ? 'Actualizando orden' : 'Creando orden', 'para cliente ID:', clientId);
      
      // Obtener el total del carrito
      const total = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      // Verificar si es pago con crédito
      const isCreditPayment = document.getElementById('paymentMethod')?.value === 'credit';
      
      if (isCreditPayment) {
        console.log('Verificando crédito para cliente:', clientId);
        const { data: client, error: clientError } = await supabase
          .from('profiles')
          .select('credit_assigned, credit_used')
          .eq('id', clientId)
          .single();
        
        if (clientError) {
          console.error('Error al obtener datos del cliente:', clientError);
          throw clientError;
        }
        
        const availableCredit = (parseFloat(client.credit_assigned) || 0) - (parseFloat(client.credit_used) || 0);
        console.log('Crédito disponible:', availableCredit, 'Total de la orden:', total);
        
        if (availableCredit < total) {
          throw new Error(`El cliente no tiene suficiente crédito disponible. Crédito disponible: $${availableCredit.toFixed(2)}`);
        }
      }
      
      // Datos de la orden
      const orderData = {
        buyer_id: clientId,
        store_id: storeId,
        total_amount: total,
        status: 'Pendiente',
        order_date: new Date().toISOString()
      };
      
      let order;
      
      if (isEditMode && orderId) {
        // Actualizar orden existente
        console.log('Actualizando orden ID:', orderId);
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', orderId)
          .select()
          .single();
          
        if (updateError) throw updateError;
        order = updatedOrder;
        
        // Eliminar los items antiguos
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderId);
          
        if (deleteError) throw deleteError;
      } else {
        // Crear nueva orden
        console.log('Creando nueva orden...');
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();
          
        if (orderError) throw orderError;
        order = newOrder;
      }
      
      console.log('Orden', isEditMode ? 'actualizada' : 'creada', 'con ID:', order.id);
      
      // Crear los items de la orden
      const items = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      }));
      
      console.log('Items de la orden:', items);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items);

      if (itemsError) {
        console.error('Error al actualizar items de la orden:', itemsError);
        throw new Error(`Error al crear items de la orden: ${itemsError.message}`);
      }
      
      // Si es pago con crédito, actualizar el crédito del cliente
      if (isCreditPayment) {
        console.log('Actualizando crédito del cliente...');
        await updateClientCredit(clientId, total);
      }

      console.log('Orden completada exitosamente');
      
      // Obtener los datos del cliente para la factura
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (clientError) {
        console.error('Error al obtener datos del cliente para factura:', clientError);
        throw clientError;
      }
      
      // Obtener nombres de productos para la factura
      const productIds = items.map(item => item.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);
      
      if (productsError) {
        console.error('Error al obtener nombres de productos:', productsError);
        throw productsError;
      }
      
      // Mapear nombres de productos a los items
      const invoiceItems = items.map(item => ({
        ...item,
        name: products.find(p => p.id === item.product_id)?.name || 'Producto'
      }));
      
      // Generar factura para órdenes nuevas o editadas
      try {
        // Generar factura con un nombre único basado en la fecha/hora
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const invoiceNumber = `FAC-${order.id.substring(0, 8)}-${timestamp}`;
        
        // Crear una copia de la orden con el nuevo número de factura
        const orderWithNewInvoice = { 
          ...order, 
          invoice_number: invoiceNumber,
          order_date: new Date().toISOString() // Asegurar que la fecha sea actual
        };
        
        // Generar la factura
        await generateInvoice(orderWithNewInvoice, clientData, invoiceItems);
        
        // Actualizar la orden con el nuevo número de factura y fecha
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            invoice_number: invoiceNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
          
        if (updateError) {
          console.error('Error al actualizar la orden con el número de factura:', updateError);
          throw updateError;
        }
        
        console.log('Factura generada correctamente para la orden:', order.id);
      } catch (invoiceError) {
        console.error('Error al generar factura:', invoiceError);
        // No detenemos el flujo si hay error en la factura
        showNotification('Orden ' + (isEditMode ? 'actualizada' : 'creada') + ', pero hubo un error al generar la factura', 'warning');
      }
      
      showNotification('Orden creada exitosamente', 'success');
      closeOrderModal();
      resetOrder();
    } catch (error) {
      console.error('Error al crear la orden:', error);
      showNotification('Error al crear la orden: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  // Generar factura en PDF
  function generateInvoice(order, client, items) {
    try {
      // Usar jsPDF del ámbito global
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) {
        console.error('jsPDF no está disponible');
        throw new Error('La biblioteca jsPDF no se cargó correctamente');
      }
      const doc = new jsPDF();
      
      // Configuración del diseño
      const primaryColor = [0, 240, 255]; // Negro para texto normal
      const secondaryColor = [0, 0, 0]; // Negro para texto normal
      const headerColor = [0, 0, 0]; // Negro para encabezados
      const lightText = [0, 0, 0]; // Texto negro
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      
      // Función para agregar texto con estilo
      const addText = (text, x, y, options = {}) => {
        const { color = lightText, size = 10, align = 'left', bold = false } = options;
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, x, y, { align });
      };
      
      // Función para agregar línea divisoria
      const addDivider = (y) => {
        doc.setDrawColor(0, 0, 0); // Línea negra
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
      };
      
      // Encabezado
      let y = 20;
      addText('FACTURA DE VENTA', pageWidth / 2, y, { 
        size: 16, 
        color: headerColor,
        align: 'center',
        bold: true 
      });
      
      y += 10;
      addText(`N° ${order.id.substring(0, 8).toUpperCase()}`, pageWidth / 2, y, { 
        size: 10, 
        align: 'center',
        bold: true 
      });
      
      // Datos del negocio
      y += 15;
      addText('HORIZON SYSTEMS', margin, y, { size: 12, bold: true });
      y += 6;
      addText('NIT: 123456789-0', margin, y, { size: 10 });
      y += 5;
      addText('Dirección: Cra 1 # 2-3', margin, y, { size: 10 });
      y += 5;
      addText('Teléfono: 1234567', margin, y, { size: 10 });
      y += 5;
      addText('Email: info@horizonsystems.com', margin, y, { size: 10 });
      
      // Datos del cliente
      y += 10;
      addText('FACTURAR A:', margin, y, { size: 10, bold: true });
      y += 6;
      addText(`Cliente: ${client.name || 'Cliente'}`, margin, y, { size: 10 });
      y += 5;
      addText(`Documento: ${client.document || 'N/A'}`, margin, y, { size: 10 });
      y += 5;
      addText(`Dirección: ${client.address || 'N/A'}`, margin, y, { size: 10 });
      y += 5;
      addText(`Teléfono: ${client.phone || 'N/A'}`, margin, y, { size: 10 });
      
      // Fecha
      y += 10;
      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      addText(`Fecha: ${formattedDate}`, margin, y, { size: 10 });
      
      // Tabla de productos
      y += 15;
      addDivider(y);
      y += 5;
      
      // Encabezados de la tabla
      addText('CANT', margin, y, { size: 10, bold: true });
      addText('DESCRIPCIÓN', margin + 20, y, { size: 10, bold: true });
      addText('V. UNIT', pageWidth - 50, y, { size: 10, bold: true, align: 'right' });
      addText('TOTAL', pageWidth - margin, y, { size: 10, bold: true, align: 'right' });
      
      y += 5;
      addDivider(y);
      y += 5;
      
      // Productos
      items.forEach(item => {
        const productName = item.name || 'Producto';
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || 0;
        const total = quantity * unitPrice;
        
        // Cantidad
        addText(quantity.toString(), margin, y + 5, { size: 9 });
        
        // Descripción (con manejo de múltiples líneas)
        const nameLines = doc.splitTextToSize(productName, 60);
        doc.text(nameLines, margin + 20, y + 5);
        
        // Valor unitario
        addText(`$${unitPrice.toFixed(2)}`, pageWidth - 50, y + 5, { size: 9, align: 'right' });
        
        // Total
        addText(`$${total.toFixed(2)}`, pageWidth - margin, y + 5, { size: 9, align: 'right' });
        
        // Ajustar posición Y basado en la altura del nombre del producto
        y += Math.max(10, nameLines.length * 5);
      });
      
      // Totales
      y += 10;
      addDivider(y);
      y += 10;
      
      // Calcular total sin IVA (asumiendo que el precio unitario ya incluye IVA)
      const subtotal = items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * item.unit_price;
        return sum + itemSubtotal;
      }, 0);
      
      // Calcular valor sin IVA (base gravable)
      const valorSinIva = subtotal / 1.19;
      const iva = subtotal - valorSinIva;
      
      addText('SUBTOTAL', pageWidth - 40, y, { size: 10, align: 'right' });
      addText(`$${valorSinIva.toFixed(2)}`, pageWidth - margin, y, { size: 10, align: 'right' });
      y += 7;
      
      addText('IVA (19%)', pageWidth - 40, y, { size: 10, align: 'right' });
      addText(`$${iva.toFixed(2)}`, pageWidth - margin, y, { size: 10, align: 'right' });
      y += 10;
      
      addText('TOTAL', pageWidth - 40, y, { size: 12, bold: true, align: 'right' });
      addText(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { size: 12, bold: true, align: 'right' });
      
      // Pie de página con información de resolución DIAN
      y += 15;
      addText('RESOLUCIÓN DE FACTURACIÓN N° 18764032456012', pageWidth / 2, y, { 
        size: 8, 
        align: 'center',
        bold: true 
      });
      
      y += 4;
      addText('DEL 22 DE ENERO DE 2024', pageWidth / 2, y, { 
        size: 8, 
        align: 'center',
        bold: true 
      });
      
      y += 4;
      addText('DEL 0001 AL 1000', pageWidth / 2, y, { 
        size: 8, 
        align: 'center',
        bold: true 
      });
      
      // Guardar el PDF
      const fileName = `Factura_${order.id.substring(0, 8).toUpperCase()}.pdf`;
      doc.save(fileName);
      
      return doc;
    } catch (error) {
      console.error('Error al generar la factura:', error);
      throw new Error('Error al generar la factura: ' + error.message);
    }
  }
  
  // Cerrar modal
  window.closeOrderModal = function() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
      modal.remove();
    }
  };

  // Resetear la orden
  function resetOrder() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
      modal.removeAttribute('data-order-id');
      modal.removeAttribute('data-edit-mode');
    }
    
    // Limpiar campos del formulario
    const clientSearch = document.getElementById('clientSearch');
    const clientId = document.getElementById('clientId');
    const productSearch = document.getElementById('productSearch');
    
    if (clientSearch) clientSearch.value = '';
    if (clientId) clientId.value = '';
    if (productSearch) productSearch.value = '';
    
    // Limpiar lista de productos
    selectedClient = null;
    orderItems = [];
    updateOrderItemsDisplay();
    updateOrderTotals();
    
    // Cerrar el modal
    closeOrderModal();
  }

  // Mostrar notificación
  function showNotification(message, type = 'info') {
    Swal.fire({
      icon: type,
      title: type === 'error' ? 'Error' : 'Éxito',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }

  // Hacer funciones disponibles globalmente
  window.openOrderModal = openOrderModal;
  window.addProductToOrder = addProductToOrder;
  window.calculateTotals = calculateTotals;
  window.updateOrderItemsDisplay = updateOrderItemsDisplay;
  window.increaseQuantity = increaseQuantity;
  window.decreaseQuantity = decreaseQuantity;
  window.removeItem = removeItem;
  window.loadClients = loadClients;
  window.generateInvoice = generateInvoice;
  
  // Exportar funciones públicas
  const publicApi = {
    init,
    openOrderModal,
    addProductToOrder,
    calculateTotals,
    updateOrderItemsDisplay,
    generateInvoice
  };
  
  // Hacer funciones disponibles globalmente
  Object.assign(window, publicApi);
  
  // Inicializar automáticamente cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
  
  return publicApi;
})();

// Inicializar el módulo cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', function() {
  window.directOrderModule.init();
});