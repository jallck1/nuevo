// Módulo de chat con IA
window.chatModule = (function() {
  // Constantes
  const API_URL = 'http://localhost:5001/api/chat';
  const STORAGE_KEYS = {
    MESSAGES: 'aichat_messages',
    SETTINGS: 'aichat_settings',
    SESSION: 'aichat_session'
  };
  
  // Estado
  let supabase = null;
  let userProfile = null;
  let currentStore = null;
  let isTyping = false;
  let chatHistory = [];
  let settings = {
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  };
  
  // 1. Inicialización del módulo
  async function init() {
    try {
      console.log('🚀 Inicializando chat con IA...');
      
      // Cargar configuración
      loadSettings();
      
      // Inicializar Supabase
      await initSupabase();
      
      // Verificar autenticación
      await checkAuth();
      
      // Configurar eventos
      setupEventListeners();
      
      // Cargar historial de chat
      loadChatHistory();
      
      // Mostrar mensaje de bienvenida si es la primera vez
      if (chatHistory.length === 0) {
        addMessage('assistant', '¡Hola! Soy tu asistente de CrediControl. ¿En qué puedo ayudarte hoy?');
      }
      
      console.log('✅ Chat con IA inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error al inicializar el chat:', error);
      showNotification('Error al cargar el chat: ' + error.message, 'error');
    }
  }
  
  // 2. Inicializar Supabase
  async function initSupabase() {
    return new Promise((resolve) => {
      if (window.supabase) {
        console.log('🔌 Supabase ya está cargado');
        supabase = window.supabase.createClient(
          'https://ywmspibcnhfmqmnutpyg.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU'
        );
        return resolve(supabase);
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        console.log('🔌 Supabase cargado correctamente');
        supabase = window.supabase.createClient(
          'https://ywmspibcnhfmqmnutpyg.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODE0OTMsImV4cCI6MjA2MzI1NzQ5M30.HtHovCDBs11eNh_KjrqNn6BgWFYyFuFpKo5iQLFmFpU'
        );
        resolve(supabase);
      };
      script.onerror = (error) => {
        console.error('❌ Error al cargar Supabase:', error);
        throw new Error('No se pudo cargar Supabase');
      };
      document.head.appendChild(script);
    });
  }
  
  // 3. Verificar autenticación
  async function checkAuth() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('🔒 Usuario no autenticado');
        window.location.href = 'login.html?redirect=aichat.html';
        throw new Error('Usuario no autenticado');
      }
      
      // Cargar perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      userProfile = profile;
      console.log('👤 Perfil de usuario cargado:', userProfile.email);
      
      return user;
      
    } catch (error) {
      console.error('❌ Error en checkAuth:', error);
      throw error;
    }
  }
  
  // 4. Cargar configuración guardada
  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        updateSettingsUI();
      }
    } catch (error) {
      console.error('❌ Error al cargar la configuración:', error);
    }
  }
  
  // 5. Actualizar UI de configuración
  function updateSettingsUI() {
    const apiKeyInput = document.getElementById('api-key');
    const modelSelect = document.getElementById('model');
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    
    if (apiKeyInput) apiKeyInput.value = settings.apiKey || '';
    if (modelSelect) modelSelect.value = settings.model;
    if (tempSlider) tempSlider.value = settings.temperature;
    if (tempValue) tempValue.textContent = settings.temperature;
  }
  
  // 6. Cargar historial de chat
  function loadChatHistory() {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
        renderChatHistory();
      }
    } catch (error) {
      console.error('❌ Error al cargar el historial:', error);
    }
  }
  
  // 7. Renderizar historial de chat
  function renderChatHistory() {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    // Limpiar contenedor
    chatContainer.innerHTML = '';
    
    // Agregar cada mensaje
    chatHistory.forEach(msg => {
      addMessageToUI(msg.role, msg.content, false);
    });
    
    // Hacer scroll al final
    scrollToBottom();
  }
  
  // 8. Configurar manejadores de eventos
  function setupEventListeners() {
    // Envío de mensaje
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', handleSubmit);
    }
    
    // Guardar configuración
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettings);
    }
    
    // Toggle para mostrar/ocultar API key
    const toggleKeyBtn = document.getElementById('toggle-api-key');
    if (toggleKeyBtn) {
      toggleKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    }
    
    // Actualizar valor de temperatura
    const tempSlider = document.getElementById('temperature');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        const tempValue = document.getElementById('temp-value');
        if (tempValue) {
          tempValue.textContent = e.target.value;
        }
      });
    }
  }
  
  // 9. Manejar envío de mensaje
  async function handleSubmit(e) {
    e.preventDefault();
    
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Agregar mensaje del usuario al chat
    addMessage('user', message);
    input.value = '';
    
    // Mostrar indicador de escritura
    showTypingIndicator(true);
    
    try {
      // Enviar mensaje al servidor
      const response = await sendToAI(message);
      
      // Procesar respuesta
      if (response && response.response) {
        addMessage('assistant', response.response);
      } else if (response && response.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
      
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      addMessage('assistant', 'Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.');
    } finally {
      // Ocultar indicador de escritura
      showTypingIndicator(false);
    }
  }
  
  // 10. Enviar mensaje al servidor de IA
  async function sendToAI(message) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      };
      
      // Obtener información del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      let userInfo = {};
      
      if (user) {
        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          userInfo = {
            id: user.id,
            email: user.email,
            credit_assigned: profile.credit_assigned || 0,
            credit_used: profile.credit_used || 0,
            credit_available: (profile.credit_assigned || 0) - (profile.credit_used || 0)
          };
        }
      }
      
      const body = JSON.stringify({
        model: settings.model,
        messages: [
          { 
            role: 'system', 
            content: `Eres un asistente de CrediControl que ayuda a los usuarios con información sobre créditos y compras. 
                     El usuario actual tiene un crédito disponible de $${userInfo.credit_available || 0}. 
                     Cuando el usuario pregunte sobre su crédito, muestra el saldo disponible y cómo puede usarlo.` 
          },
          ...chatHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        user: userInfo,
        temperature: parseFloat(settings.temperature)
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Error al conectar con el servidor');
      }
      
      return response.json();
      
    } catch (error) {
      console.error('Error en sendToAI:', error);
      throw new Error('No se pudo procesar tu solicitud. Por favor, inténtalo de nuevo.');
    }
  }
  
  // 11. Agregar mensaje al chat
  function addMessage(role, content, saveToHistory = true) {
    const timestamp = new Date().toISOString();
    const message = { role, content, timestamp };
    
    // Agregar al historial
    if (saveToHistory) {
      chatHistory.push(message);
      
      // Limitar el historial a los últimos 50 mensajes
      if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
      }
      
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(chatHistory));
    }
    
    // Agregar a la UI
    addMessageToUI(role, content);
  }
  
  // 12. Agregar mensaje a la interfaz
  function addMessageToUI(role, content, animate = true) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message mb-4 flex items-start ${role === 'user' ? 'justify-end' : ''}`;
    
    if (animate) {
      messageDiv.classList.add('opacity-0', 'transform', 'translate-y-2');
      setTimeout(() => {
        messageDiv.classList.remove('opacity-0', 'translate-y-2');
        messageDiv.classList.add('opacity-100');
      }, 10);
    }
    
    if (role === 'assistant') {
      messageDiv.innerHTML = `
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <i class="fas fa-robot text-blue-600"></i>
        </div>
        <div class="ml-3">
          <div class="bg-gray-100 rounded-lg px-4 py-2">
            <p class="text-sm text-gray-800">${content}</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</p>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="ml-3 text-right">
          <div class="bg-blue-100 rounded-lg px-4 py-2 inline-block">
            <p class="text-sm text-gray-800">${content}</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center ml-3">
          <i class="fas fa-user text-white"></i>
        </div>
      `;
    }
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
  }
  
  // 13. Mostrar/ocultar indicador de escritura
  function showTypingIndicator(show) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    
    isTyping = show;
    indicator.style.display = show ? 'block' : 'none';
    
    if (show) {
      scrollToBottom();
    }
  }
  
  // 14. Desplazarse al final del chat
  function scrollToBottom() {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
  
  // 15. Guardar configuración
  function saveSettings() {
    try {
      const apiKey = document.getElementById('api-key')?.value || '';
      const model = document.getElementById('model')?.value || 'gpt-3.5-turbo';
      const temperature = parseFloat(document.getElementById('temperature')?.value) || 0.7;
      
      settings = { apiKey, model, temperature };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      showNotification('Configuración guardada correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error al guardar la configuración:', error);
      showNotification('Error al guardar la configuración', 'error');
    }
  }
  
  // 16. Alternar visibilidad de la API key
  function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('api-key');
    const toggleBtn = document.getElementById('toggle-api-key');
    
    if (!apiKeyInput || !toggleBtn) return;
    
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleBtn.innerHTML = isPassword ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
  }
  
  // 17. Mostrar notificación
  function showNotification(message, type = 'info') {
    // Implementar lógica de notificaciones según tu UI
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Ejemplo básico de notificación
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md text-white ${
      type === 'error' ? 'bg-red-500' : 
      type === 'success' ? 'bg-green-500' : 
      'bg-blue-500'
    }`;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  // 18. Cargar tienda actual
  async function loadCurrentStore() {
    try {
      const storeId = sessionStorage.getItem('current_store_id');
      
      if (storeId) {
        const { data: store, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();
        
        if (!error && store) {
          currentStore = store;
          console.log('🏪 Tienda cargada:', store.name);
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar la tienda:', error);
    }
  }
  
  // 19. Limpiar historial de chat
  function clearChatHistory() {
    if (confirm('¿Estás seguro de que quieres borrar el historial de chat?')) {
      chatHistory = [];
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.innerHTML = '';
      }
      
      // Agregar mensaje de bienvenida
      addMessage('assistant', '¡Hola! Soy tu asistente de CrediControl. ¿En qué puedo ayudarte hoy?');
    }
  }
  
  // 20. Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // API Pública
  return {
    init,
    clearChatHistory,
    // Agregar más métodos públicos según sea necesario
  };
})();