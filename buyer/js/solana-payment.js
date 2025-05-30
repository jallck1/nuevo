// Configuración de la conexión a Solana
const SOLANA_NETWORK = 'mainnet-beta'; // Cambiar a 'devnet' para pruebas
const SOLANA_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// Dirección de la billetera del vendedor (reemplazar con la dirección real)
const SELLER_WALLET = 'TU_DIRECCION_DE_BILLETERA_AQUI';

// Inicialización
let provider;
let wallet;

// Función para inicializar la conexión con Phantom
async function initSolana() {
  try {
    // Verificar si Phantom está instalado
    if (!window.phantom?.solana?.isPhantom) {
      // Mostrar mensaje amigable con opción para instalar
      const installConfirmed = confirm('Phantom Wallet no está instalado. ¿Deseas instalarlo ahora?');
      if (installConfirmed) {
        window.open('https://phantom.app/', '_blank');
      }
      return false;
    }
    
    // Conectar con Phantom
    const provider = window.phantom?.solana;
    if (!provider) {
      throw new Error('No se pudo conectar con Phantom Wallet');
    }
    
    // Solicitar conexión
    const response = await provider.connect();
    wallet = response.publicKey.toString();
    
    // Inicializar web3
    solanaWeb3 = window.solanaWeb3;
    
    console.log('Conectado con Phantom Wallet:', wallet);
    return true;
    
  } catch (error) {
    console.error('Error al conectar con Phantom:', error);
    showNotification('Error al conectar con Phantom Wallet: ' + error.message, 'error');
    return false;
  }
}

// Función para realizar el pago
async function payWithSolana(amountInSOL) {
  try {
    // Inicializar conexión
    const isConnected = await initSolana();
    if (!isConnected) return false;

    // Crear conexión con la red de Solana
    const connection = new solanaWeb3.Connection(
      SOLANA_ENDPOINT,
      'confirmed'
    );

    // Obtener el balance actual
    const balance = await connection.getBalance(wallet);
    const balanceInSOL = balance / solanaWeb3.LAMPORTS_PER_SOL;
    
    if (balanceInSOL < amountInSOL) {
      throw new Error(`Saldo insuficiente. Necesitas al menos ${amountInSOL} SOL`);
    }

    // Crear transacción
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: new solanaWeb3.PublicKey(SELLER_WALLET),
        lamports: amountInSOL * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );

    // Configurar la transacción
    transaction.feePayer = wallet;
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

    // Firmar y enviar la transacción
    const signature = await provider.signAndSendTransaction(transaction);
    console.log('Transacción enviada:', signature);
    
    // Confirmar la transacción
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    console.log('Transacción confirmada:', confirmation);
    
    return true;
  } catch (error) {
    console.error('Error en la transacción de Solana:', error);
    showNotification('Error en el pago con Solana: ' + error.message, 'error');
    return false;
  }
}

// Manejador del botón de pago con Solana
document.addEventListener('DOMContentLoaded', () => {
  const payWithSolanaBtn = document.getElementById('pay-with-solana');
  if (payWithSolanaBtn) {
    payWithSolanaBtn.addEventListener('click', async () => {
      try {
        // Verificar que el módulo del carrito esté disponible
        if (!window.cartModule) {
          throw new Error('No se pudo acceder al carrito de compras');
        }
        
        // Obtener el total del carrito
        const cartTotal = window.cartModule.getCartTotal();
        if (typeof cartTotal !== 'number' || isNaN(cartTotal)) {
          console.error('Total del carrito inválido:', cartTotal);
          throw new Error('No se pudo obtener el total del carrito');
        }
        if (isNaN(cartTotal) || cartTotal <= 0) {
          throw new Error('El monto del carrito no es válido');
        }
        
        // Obtener el precio actual de SOL en USD (usando un valor fijo para el ejemplo)
        // En producción, deberías usar una API como CoinGecko o CoinMarketCap
        const SOL_PRICE_USD = await fetchSOLPrice();
        const amountInSOL = cartTotal / SOL_PRICE_USD;
        
        if (amountInSOL <= 0) {
          throw new Error('El monto del carrito no puede ser cero');
        }
        
        // Mostrar confirmación
        const confirmPayment = confirm(`¿Deseas pagar ${amountInSOL.toFixed(6)} SOL ($${cartTotal.toFixed(2)}) con Phantom Wallet?`);
        if (!confirmPayment) return;
        
        // Inicializar Solana y verificar conexión
        const isConnected = await initSolana();
        if (!isConnected) return;
        
        // Realizar el pago
        const paymentSuccessful = await payWithSolana(amountInSOL);
        
        if (paymentSuccessful) {
          showNotification('¡Pago exitoso con Solana!', 'success');
          
          // Limpiar carrito después del pago exitoso
          if (window.cartModule) {
            window.cartModule.clearCart();
          }
          
          // Redirigir a la página de confirmación
          setTimeout(() => {
            window.location.href = 'pedidos.html';
          }, 2000);
        }
      } catch (error) {
        console.error('Error al procesar el pago con Solana:', error);
        showNotification('Error: ' + error.message, 'error');
      }
    });
  }
});

// Obtener el precio actual de SOL en USD
async function fetchSOLPrice() {
  try {
    // En producción, reemplazar con una llamada a una API real
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    if (!response.ok) {
      throw new Error('No se pudo obtener el precio de SOL');
    }
    const data = await response.json();
    return data.solana.usd || 100; // Valor por defecto si falla
  } catch (error) {
    console.error('Error al obtener precio de SOL:', error);
    return 100; // Valor por defecto en caso de error
  }
}

// Función auxiliar para mostrar notificaciones
function showNotification(message, type = 'info') {
  if (window.Swal) {
    window.Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3000
    });
  } else {
    alert(`${type.toUpperCase()}: ${message}`);
  }
}
