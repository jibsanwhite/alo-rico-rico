# 🍬 Alo Rico Rico - Sistema de Gestión Web

Sistema web de gestión para pequeño negocio: panel con KPIs, catálogo de productos, control de stock, registro de ventas, edición de precios y gestión de usuarios con roles.

## 🚀 Demo

Abre `index.html` en tu navegador para ver una demo con datos de ejemplo.
La demo es solo visual: no incluye login ni administración (esos viven en el sistema real, servido desde Google Apps Script + Drive).

## 📁 Estructura

```
├── index.html          # Aplicación web (HTML + CSS + JS en un solo archivo)
├── Codigo.gs           # Google Apps Script principal (sirve el HTML desde Drive)
├── Seguridad.gs        # Usuarios, roles, sesiones y registro (archivo separado)
├── Codigo_seguro.gs    # Versión anterior (contraseña única, superada)
├── Codigo_seguro_v2.gs # Versión anterior (clave en Propiedades, superada)
├── datos-ejemplo.json  # Datos de muestra (NO usar datos reales aquí)
├── HISTORIAL.md        # Registro de cambios
└── README.md           # Este archivo
```

## 🔧 Cómo funciona

1. **Frontend:** `index.html` es una app de una sola página con 4 secciones:
   - 📊 Panel: KPIs, gráficos, alertas de stock
   - 🛍️ Catálogo: productos con buscador y filtros por categoría
   - 📦 Stock: niveles bajos, agotados, productos sin precio
   - 💰 Ventas: últimas operaciones

2. **Backend:** `Codigo.gs` es un Google Apps Script que sirve el HTML desde Google Drive en cada carga (sin redesplegar para cambios de contenido) y atiende las acciones de la app. `Seguridad.gs` es un segundo archivo del mismo proyecto con toda la seguridad: ningún usuario o clave vive en el código.

3. **Datos:** En producción, los datos se cargan desde archivos privados en Google Drive (nunca en este repo). Los precios editados desde la app se guardan en un archivo JSON de Drive y se aplican sobre el catálogo.

## 👥 Usuarios y roles

El sistema no usa una contraseña única. La primera cuenta de administrador se crea **desde la página web** (pantalla de bienvenida inicial), y el admin gestiona el resto desde la pestaña 👥 Usuarios:

| Rol | Permisos |
|---|---|
| **admin** | Todo: ver panel, catálogo, stock y ventas; editar precios; gestionar usuarios |
| **supervisor** | Ver todo + editar precios |
| **cliente** | Solo ver el catálogo |

- Las claves se guardan solo como huella SHA-256 en las Propiedades del script (nadie puede ver la clave de otro).
- Sesiones con token de 12 horas.
- Bloqueo anti fuerza bruta: 5 intentos fallidos en 10 minutos → bloqueo de 30 minutos.

## 💰 Edición de precios

Los usuarios con permiso (admin y supervisor) editan costo y precio desde la pestaña Precios. Al guardar, el sistema valida los valores (numéricos, entre 0 y 1,000,000) y escribe el archivo JSON en Drive.

## 📋 Historial y registro

- **HISTORIAL.md** (este repo): registro escrito de los cambios del proyecto.
- **Registro interno de la app** (solo admin, en 👥 Usuarios → "Ver registro"): últimos 50 eventos, incluyendo:
  - Creación de usuarios, logins y bloqueos
  - Errores del servidor (con su causa real)
  - **Cambios de precios: qué producto cambió y de qué valor a cuál** (hasta 15 por entrada)

## ⚠️ Privacidad

**NUNCA** subas datos reales del negocio a este repositorio:
- ❌ Ventas reales
- ❌ Precios de costo
- ❌ Nombres de clientes
- ❌ Márgenes de ganancia

Usa solo `datos-ejemplo.json` con datos ficticios para pruebas.

## 📝 Licencia

Uso privado.
