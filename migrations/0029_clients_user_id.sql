-- Vincular clientes al usuario que los creó (agencia/proveedor).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);

-- Asignar propietario según la cotización más antigua de cada cliente.
UPDATE clients c
SET user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (client_id) client_id, user_id
  FROM quotes
  ORDER BY client_id, created_at ASC
) sub
WHERE c.id = sub.client_id AND c.user_id IS NULL;
