/**
 * Script principal para la página de ListosApp
 */
document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const environmentEl = document.getElementById('environment');
  const timestampEl = document.getElementById('timestamp');
  const checkStatusBtn = document.getElementById('check-status');
  const echoInput = document.getElementById('echo-input');
  const sendEchoBtn = document.getElementById('send-echo');
  const echoResponse = document.getElementById('echo-response');
  
  // Actualizar timestamp
  timestampEl.textContent = new Date().toLocaleString();
  
  // Cargar estado inicial
  fetchStatus();
  
  // Event listeners
  checkStatusBtn.addEventListener('click', fetchStatus);
  sendEchoBtn.addEventListener('click', sendEcho);
  
  /**
   * Obtener estado del servidor
   */
  async function fetchStatus() {
    try {
      checkStatusBtn.disabled = true;
      checkStatusBtn.textContent = 'Verificando...';
      
      const response = await fetch('/api/status');
      const data = await response.json();
      
      // Actualizar UI
      environmentEl.textContent = data.environment;
      timestampEl.textContent = new Date(data.timestamp).toLocaleString();
      
      // Mostrar notificación
      showNotification('Estado actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error al obtener estado:', error);
      showNotification('Error al obtener estado del servidor', 'error');
      
      // Actualizar UI para mostrar error
      const statusBadge = document.querySelector('.status-badge');
      statusBadge.textContent = 'Offline';
      statusBadge.classList.remove('online');
      statusBadge.classList.add('offline');
    } finally {
      checkStatusBtn.disabled = false;
      checkStatusBtn.textContent = 'Verificar Estado';
    }
  }
  
  /**
   * Enviar mensaje de echo
   */
  async function sendEcho() {
    try {
      const message = echoInput.value.trim();
      
      if (!message) {
        showNotification('Por favor ingresa un mensaje', 'warning');
        return;
      }
      
      sendEchoBtn.disabled = true;
      sendEchoBtn.textContent = 'Enviando...';
      
      const response = await fetch('/api/echo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      // Mostrar respuesta
      echoResponse.textContent = JSON.stringify(data, null, 2);
      
      // Mostrar notificación
      showNotification('Mensaje enviado correctamente', 'success');
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      echoResponse.textContent = `Error: ${error.message}`;
      showNotification('Error al enviar mensaje', 'error');
    } finally {
      sendEchoBtn.disabled = false;
      sendEchoBtn.textContent = 'Enviar';
    }
  }
  
  /**
   * Mostrar notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, warning)
   */
  function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
});