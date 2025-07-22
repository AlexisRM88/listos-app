# Usar imagen base de Node.js con Debian (incluye bash)
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación React
RUN npm run build

# Limpiar devDependencies después del build para reducir tamaño
RUN npm prune --production

# Crear usuario no-root para seguridad
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer el puerto 8080 (estándar de Cloud Run)
EXPOSE 8080

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Comando para iniciar la aplicación
CMD ["node", "server.js"]