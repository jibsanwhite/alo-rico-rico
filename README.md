# 🍬 Alo Rico Rico - Sistema de Gestión Web

Sistema web de gestión para pequeño negocio: panel con KPIs, catálogo de productos, control de stock y registro de ventas.

## 🚀 Demo

Abre `index.html` en tu navegador para ver una demo con datos de ejemplo.

## 📁 Estructura

```
├── index.html          # Aplicación web (HTML + CSS + JS en un solo archivo)
├── Codigo.gs           # Google Apps Script (backend para despliegue)
├── datos-ejemplo.json  # Datos de muestra (NO usar datos reales aquí)
├── HISTORIAL.md        # Registro de cambios
└── README.md           # Este archivo
```

## 🔧 Cómo funciona

1. **Frontend:** `index.html` es una app de una sola página con 4 secciones:
   - 📊 Panel: KPIs, gráficos, alertas
   - 🛍️ Catálogo: productos con buscador y filtros
   - 📦 Stock: niveles bajos, agotados
   - 💰 Ventas: últimas operaciones

2. **Backend (opcional):** `Codigo.gs` es un Google Apps Script que sirve el HTML desde Google Drive y permite edición de precios con contraseña de administrador.

3. **Datos:** En producción, los datos se cargan desde archivos privados en Google Drive (nunca en este repo).

## ⚠️ Privacidad

**NUNCA** subas datos reales del negocio a este repositorio:
- ❌ Ventas reales
- ❌ Precios de costo
- ❌ Nombres de clientes
- ❌ Márgenes de ganancia

Usa solo `datos-ejemplo.json` con datos ficticios para pruebas.

## 📝 Licencia

Uso privado.
