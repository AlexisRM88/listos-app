# Instrucciones para desplegar ListosApp Minimal en Cloud Run

## 📋 Prerrequisitos

- Cuenta de Google Cloud con facturación habilitada
- Repositorio GitHub con el código
- Cloud Build API habilitada
- Cloud Run API habilitada

## 🚀 Pasos de Despliegue

### 1. Crear un nuevo servicio en Cloud Run

1. Ve a **Google Cloud Console → Cloud Run**
2. Click en **"CREATE SERVICE"**
3. Configuración inicial:
   - **Service name**: `listos-app-minimal`
   - **Region**: `europe-west1`
   - **CPU allocation**: "CPU is only allocated during request processing"
   - **Authentication**: "Allow unauthenticated invocations"

### 2. Configurar el código fuente

1. Selecciona **"Deploy one revision from source code"**
2. Configuración de fuente:
   - **Source**: Cloud Build
   - **Repository**: Tu repositorio GitHub `AlexisRM88/listos-app`
   - **Branch**: `main`
   - **Build Type**: Dockerfile
   - **Dockerfile path**: `minimal-app/Dockerfile`

### 3. Configurar el servicio

#### Pestaña General:
- **Container port**: `8080`
- **Memory**: `1 GiB` (recomendado)
- **CPU**: `1`
- **Request timeout**: `300` segundos
- **Maximum concurrent requests**: `80`

#### Pestaña Variables & Secrets:
**Variables de entorno:**
- `NODE_ENV=production`
- `PORT=8080`
- `LOG_LEVEL=info`

**Secretos (opcional para funcionalidades futuras):**
- `STRIPE_SECRET_KEY` (desde Secret Manager)
- `GEMINI_API_KEY` (desde Secret Manager)

#### Pestaña Connections:
**Health checks:**
- **Path**: `/health`
- **Port**: `8080`
- **Initial delay**: `30s`
- **Timeout**: `10s`
- **Check interval**: `30s`
- **Failure threshold**: `3`

### 4. Desplegar

1. Click en **"CREATE"**
2. Espera a que termine el build (3-5 minutos)
3. Verifica que el estado sea "Serving traffic"

## ✅ Verificación del Despliegue

### 1. Verificar la aplicación web
- Click en la URL del servicio
- Deberías ver la página principal de ListosApp
- Verifica que los botones funcionen correctamente

### 2. Verificar los endpoints
- `GET /health` - Debería devolver status 200 con información del sistema
- `GET /api/status` - Debería devolver información de la API
- `POST /api/echo` - Debería hacer echo de los datos enviados

### 3. Verificar logs
- Ve a Cloud Run → tu servicio → Logs
- Deberías ver mensajes como:
  ```
  🚀 Servidor iniciado en http://0.0.0.0:8080
  📊 Health check disponible en http://0.0.0.0:8080/health
  ```

## 🔧 Configuración Adicional (Opcional)

### Configurar dominio personalizado
1. Ve a Cloud Run → Manage Custom Domains
2. Agrega tu dominio
3. Configura los registros DNS

### Configurar CI/CD automático
1. Ve a Cloud Build → Triggers
2. Crea un trigger conectado a tu repositorio
3. Configura para que se ejecute en push a main

### Configurar monitoreo
1. Ve a Cloud Monitoring
2. Configura alertas para:
   - Latencia alta
   - Errores 5xx
   - Uso de memoria

## 🐛 Troubleshooting

### Si el despliegue falla:
1. Revisa los logs de Cloud Build
2. Verifica que el Dockerfile esté en `minimal-app/Dockerfile`
3. Asegúrate de que todas las dependencias estén en package.json

### Si el health check falla:
1. Verifica que el puerto sea 8080
2. Revisa los logs del contenedor
3. Asegúrate de que `/health` responda correctamente

### Si hay errores de permisos:
1. Verifica que Cloud Build tenga permisos para Cloud Run
2. Revisa la configuración de IAM

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs detallados en Cloud Console
2. Verifica la configuración paso a paso
3. Asegúrate de que todas las APIs estén habilitadas