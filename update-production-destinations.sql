-- ========================================
-- SCRIPT PARA ACTUALIZAR PRODUCCIÓN
-- Solo deja activo "Turquía Esencial"
-- ========================================
-- 
-- IMPORTANTE: Ejecuta este script en la consola de Neon (producción)
-- 
-- Pasos para ejecutar en Neon:
-- 1. Ve a https://console.neon.tech
-- 2. Selecciona tu proyecto de producción
-- 3. Ve a la pestaña "SQL Editor"
-- 4. Copia y pega este script completo
-- 5. Haz clic en "Run"
--

-- Paso 1: Desactivar TODOS los destinos
UPDATE destinations 
SET is_active = false;

-- Paso 2: Activar SOLO "Turquía Esencial" (ID específico)
UPDATE destinations 
SET is_active = true 
WHERE id = 'a0edb8c2-7e77-444e-8221-2501fe87f338';

-- Paso 3: Verificar que solo quede un destino activo
SELECT id, name, is_active, country 
FROM destinations 
WHERE is_active = true;

-- Deberías ver SOLO:
-- a0edb8c2-7e77-444e-8221-2501fe87f338 | Turquía Esencial | t | Turquía
