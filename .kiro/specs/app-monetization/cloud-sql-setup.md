# Guía de Configuración de Cloud SQL para ListosApp

## Paso 1: Crear una instancia de Cloud SQL

1. Accede a la [Consola de Google Cloud](https://console.cloud.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. En el menú de navegación, ve a "SQL"
4. Haz clic en "Crear instancia"
5. Selecciona PostgreSQL (recomendado por su soporte para JSON y funciones avanzadas)
6. Configura la instancia:
   - ID de instancia: `listosapp-db`
   - Contraseña: Genera una contraseña segura
   - Región: Selecciona la misma región donde se ejecuta tu aplicación
   - Versión: PostgreSQL 14 o superior
   - Configuración de máquina: Lightweight (1 vCPU, 3.75 GB) para comenzar
   - Almacenamiento: 10 GB SSD para comenzar
7. Expande "Mostrar opciones de configuración"
   - En "Conexiones", selecciona "IP privada" si tu aplicación está en la misma VPC
   - Alternativamente, configura "IP pública" con las redes autorizadas adecuadas
8. Haz clic en "Crear"

## Paso 2: Configurar la base de datos

Una vez que la instancia esté creada:

1. Haz clic en tu instancia en la lista
2. Ve a la pestaña "Bases de datos"
3. Haz clic en "Crear base de datos"
4. Nombre: `listosapp`
5. Haz clic en "Crear"

## Paso 3: Crear usuario para la aplicación

1. En tu instancia, ve a la pestaña "Usuarios"
2. Haz clic en "Crear usuario"
3. Nombre de usuario: `listosapp-user`
4. Contraseña: Genera una contraseña segura
5. Host: `%` (para permitir conexiones desde cualquier host)
6. Haz clic en "Crear"

## Paso 4: Configurar la conexión desde Cloud Run

Si tu aplicación se ejecuta en Cloud Run:

1. Ve a tu servicio de Cloud Run
2. Edita el servicio
3. Expande "Variables y secretos"
4. Añade las siguientes variables de entorno:
   - `DB_USER`: `listosapp-user`
   - `DB_PASSWORD`: [La contraseña que creaste]
   - `DB_NAME`: `listosapp`
   - `DB_INSTANCE_CONNECTION_NAME`: `[PROJECT_ID]:[REGION]:[INSTANCE_ID]`
   - `DB_TYPE`: `postgres`

## Paso 5: Configurar la conexión local para desarrollo

Para desarrollo local, crea un archivo `.env` con:

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=listosapp-user
DB_PASSWORD=[Tu contraseña]
DB_NAME=listosapp
DB_TYPE=postgres
```

Para conectarte localmente a Cloud SQL, usa el proxy de Cloud SQL:

```bash
# Instalar el proxy de Cloud SQL
gcloud components install cloud_sql_proxy

# Iniciar el proxy
cloud_sql_proxy -instances=[PROJECT_ID]:[REGION]:[INSTANCE_ID]=tcp:5432
```

## Paso 6: Verificar la conexión

Para verificar que la conexión funciona correctamente:

1. Accede a tu aplicación
2. Visita el endpoint `/api/health`
3. Deberías ver una respuesta con `{"status":"ok","database":"connected"}`

## Seguridad y Mejores Prácticas

1. **Nunca** almacenes credenciales de base de datos en el código fuente
2. Usa Secret Manager de Google Cloud para gestionar contraseñas
3. Limita el acceso a la red a tu instancia de Cloud SQL
4. Configura copias de seguridad automáticas
5. Monitorea el uso y rendimiento de tu base de datos