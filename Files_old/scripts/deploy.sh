#!/bin/bash

###############################################################################
# SCRIPT DE DEPLOYMENT AUTOMÁTICO PARA PRODUCCIÓN
#
# Este script se ejecuta automáticamente cuando haces deploy en Replit.
# Sincroniza tanto el esquema como los datos de la base de datos.
###############################################################################

set -e  # Detener en caso de error

echo ""
echo "========================================"
echo "🚀 DEPLOYMENT A PRODUCCIÓN"
echo "========================================"
echo ""

# Paso 1: Aplicar cambios de esquema
echo "1️⃣  Aplicando cambios de esquema a producción..."
npm run db:push || npm run db:push -- --force
echo "   ✅ Esquema actualizado"
echo ""

# Paso 2: Sincronizar datos canónicos
echo "2️⃣  Sincronizando datos canónicos..."
ALLOW_PROD_DATA_SYNC=true npm run db:seed
echo "   ✅ Datos sincronizados"
echo ""

echo "========================================"
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================================"
echo ""
