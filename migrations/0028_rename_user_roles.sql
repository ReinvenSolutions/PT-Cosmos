-- Renombrar roles en users.role (solo valores; permisos sin cambios):
-- advisor (Asesor) → agency (Agencia)
-- agency (Agencia) → provider (Proveedor)
-- Orden: primero agency→provider para evitar colisión de valores.

UPDATE users SET role = 'provider' WHERE role = 'agency';
UPDATE users SET role = 'agency' WHERE role = 'advisor';
