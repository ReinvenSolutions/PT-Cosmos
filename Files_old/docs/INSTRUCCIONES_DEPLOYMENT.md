# 🚀 Instrucciones para Resolver Error de Deployment

## El Problema
El archivo `.replit` tiene 3 puertos externos configurados, pero Replit solo permite **1 puerto externo** para deployments con Autoscale.

## La Solución (toma 30 segundos)

### Paso 1: Abre el archivo `.replit`
Busca el archivo `.replit` en la raíz del proyecto y ábrelo.

### Paso 2: Encuentra esta sección (líneas 14-24)
```toml
[[ports]]
localPort = 5000
externalPort = 80

[[ports]]
localPort = 40399
externalPort = 3000

[[ports]]
localPort = 45989
externalPort = 3002
```

### Paso 3: Borra los dos bloques extra
Elimina completamente estas líneas:
```toml
[[ports]]
localPort = 40399
externalPort = 3000

[[ports]]
localPort = 45989
externalPort = 3002
```

### Paso 4: El resultado final debe verse así
```toml
[[ports]]
localPort = 5000
externalPort = 80
```

### Paso 5: Guarda el archivo
Presiona `Ctrl+S` (Windows/Linux) o `Cmd+S` (Mac)

### Paso 6: Intenta el deployment nuevamente
El error debería desaparecer y tu aplicación se desplegará correctamente.

---

## ✅ Todo lo demás está listo
- Scripts de build: ✓ Configurados
- Scripts de start: ✓ Configurados  
- Base de datos: ✓ PostgreSQL configurada
- Autenticación: ✓ Implementada
- Variables de entorno: ✓ Listas

## 🎯 Una vez desplegado
Tu aplicación estará disponible en una URL `.replit.app` y funcionará perfectamente con:
- Sistema de autenticación
- Base de datos PostgreSQL
- Todas las funcionalidades de cotizaciones

---

**Nota:** Este cambio solo afecta la configuración de puertos para deployment. No cambia nada de tu código.
