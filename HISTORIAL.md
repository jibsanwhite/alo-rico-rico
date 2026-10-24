# 📋 Historial del Proyecto

## 2026-10-22 — Versión inicial
- Catálogo web básico con buscador y filtros
- Diseño móvil, colores rosado/azul

## 2026-10-23 — Dashboard profesional v2
- 4 secciones: Panel, Catálogo, Stock, Ventas
- KPIs, gráficos, alertas de stock
- 7 categorías de productos

## 2026-10-23 — Correcciones
- Fix etiquetas de fecha en gráficos (DD/MM)
- Fix categorías (antes todas "Varios")
- Fix compatibilidad de gráficos en navegadores móviles

## 2026-10-23 — Panel de administración
- Sección oculta con contraseña para editar precios
- Código aislado que no interfiere con la app principal

## 2026-10-24 — Preparación para GitHub
- Código separado de los datos
- Datos de ejemplo para demo pública
- Documentación del proyecto

## 2026-10-24 11:46 CDT — Sistema de usuarios + historial de precios
- Codigo.gs actualizado: usuarios y roles (admin, supervisor, cliente),
  sesiones, bloqueo por intentos, y registro de errores.
- Nuevo Seguridad.gs: toda la seguridad en archivo separado, sin claves
  en el código (las cuentas se crean desde la página web).
- El historial del sistema registra ahora también los cambios de precios
  (qué producto cambió y de qué valor a cuál), no solo errores.
- La demo pública sigue con datos de ejemplo y sin código de admin.

## 2026-10-24 11:56 CDT — README actualizado
- README.md reescrito con las funciones actuales: usuarios y roles,
  sesiones, bloqueo anti fuerza bruta, edición de precios, historial
  interno (errores + cambios de precios) y estructura real de archivos.
