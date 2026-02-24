#!/bin/bash

###############################################################################
# SCRIPT DE INICIO PARA PRODUCCIÓN
#
# Este script se ejecuta cuando se inicia la aplicación en deployment.
# Realiza las siguientes acciones:
# 1. Aplica cambios de esquema a la base de datos (migraciones)
# 2. Sincroniza datos canónicos con la base de datos
# 3. Inicia el servidor Node.js
###############################################################################

set -e  # Detener en caso de error

echo ""
echo "========================================"
echo "🚀 INICIANDO APLICACIÓN EN PRODUCCIÓN"
echo "========================================"
echo "Entorno: $NODE_ENV"
echo "Deployment: $REPLIT_DEPLOYMENT"
echo "========================================"
echo ""

# Detectar si estamos en deployment de Replit
if [ "$REPLIT_DEPLOYMENT" = "1" ]; then
  echo "📦 Deployment de Replit detectado - ejecutando inicialización..."
  echo ""
  
  # Paso 1: Aplicar cambios de esquema
  echo "1️⃣  Aplicando cambios de esquema..."
  npm run db:push || npm run db:push -- --force
  echo "   ✅ Esquema actualizado"
  echo ""
  
  # Paso 2: Sincronizar datos
  echo "2️⃣  Sincronizando datos canónicos..."
  tsx scripts/sync-data.ts
  echo "   ✅ Datos sincronizados"
  echo ""
fi

# Iniciar aplicación
echo "🎯 Iniciando servidor..."
echo ""
NODE_ENV=production node dist/index.js
