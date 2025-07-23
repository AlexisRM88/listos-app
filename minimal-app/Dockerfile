# Usar imagen base de Node.js optimizada
FROM node:18-slim

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Crear directorio de logs
RUN mkdir -p logs

# Crear usuario no-root para seguridad
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer el puerto 8080 (estándar de Cloud Run)
EXPOSE 8080

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Comando para iniciar la aplicación
CMD ["node", "server.js"]