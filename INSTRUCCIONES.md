# Instrucciones para desplegar en Cloud Run

## 1. Crear un nuevo servicio en Cloud Run

1. Ve a Google Cloud Console → Cloud Run
2. Click en "CREATE SERVICE"
3. En "Service name" escribe "listos-app-minimal"
4. En "Region" selecciona "europe-west1"
5. En "CPU allocation" selecciona "CPU is only allocated during request processing"
6. En "Autoscaling" deja los valores por defecto
7. En "Authentication" selecciona "Allow unauthenticated invocations"
8. Click en "NEXT"

## 2. Configurar el código fuente

1. En "Container image URL" selecciona "Deploy one revision from source code"
2. En "Source code" selecciona "Cloud Build"
3. En "Repository" selecciona tu repositorio de GitHub
4. En "Branch" selecciona "main"
5. En "Build Type" selecciona "Dockerfile"
6. En "Dockerfile path" escribe "minimal-dockerfile"
7. Click en "NEXT"

## 3. Configurar el servicio

1. En "Container port" escribe "8080"
2. En "Memory" selecciona "512 MiB"
3. En "CPU" selecciona "1"
4. En "Request timeout" escribe "300"
5. En "Maximum concurrent requests per instance" escribe "80"
6. En "Variables & Secrets" agrega:
   - Variable: PORT = 8080
   - Variable: NODE_ENV = production
7. En "Connections" → "Health checks":
   - Path: /health
   - Initial delay: 0s
   - Timeout: 30s
   - Period: 30s
   - Failure threshold: 3
8. Click en "CREATE"

## 4. Verificar el despliegue

1. Espera a que el despliegue termine
2. Click en la URL del servicio
3. Deberías ver la página de bienvenida de ListosApp
4. Verifica que el health check funcione en /health