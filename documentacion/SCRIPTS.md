# Scripts activos

## Uso en producción

- **`seed-production-full.ts`** – Seed completo (usuarios, sync-data, sync-images, fix-active-status)
  ```bash
  npm run db:seed
  ```

## Utilidades

- **`list-users.ts`** – Listar usuarios
- **`list-all-destinations.ts`** – Listar destinos
- **`verify-db-connection.ts`** – Verificar conexión a BD

## Base de datos

- **`apply-unique-constraint.ts`** – Aplicar constraint único
  ```bash
  npm run db:apply-constraint
  ```

## Imágenes

- **`upload-local-images-to-supabase.ts`** – Subir imágenes desde `public/images/destinations`
  ```bash
  npm run db:upload-images-to-supabase
  ```

- **`upload-turquia-assets-to-supabase.ts`** – Migrar imágenes de Turquía desde `attached_assets`
  ```bash
  npm run db:upload-turquia-assets
  ```

## Scripts archivados

Scripts obsoletos o de uso puntual están en `Files_old/scripts/`.
