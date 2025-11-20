-- Script para eliminar días de itinerario duplicados en Turquía Esencial
-- Este script elimina todos los días duplicados manteniendo solo uno de cada día

-- 1. Ver los duplicados actuales
SELECT day_number, COUNT(*) as count 
FROM itinerary_days 
WHERE destination_id = 'a0edb8c2-7e77-444e-8221-2501fe87f338' 
GROUP BY day_number 
HAVING COUNT(*) > 1;

-- 2. Eliminar duplicados manteniendo solo el registro con el ID más reciente
DELETE FROM itinerary_days 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY destination_id, day_number 
             ORDER BY id DESC
           ) as rn
    FROM itinerary_days
    WHERE destination_id = 'a0edb8c2-7e77-444e-8221-2501fe87f338'
  ) t
  WHERE rn > 1
);

-- 3. Verificar el resultado
SELECT day_number, title 
FROM itinerary_days 
WHERE destination_id = 'a0edb8c2-7e77-444e-8221-2501fe87f338' 
ORDER BY day_number;
