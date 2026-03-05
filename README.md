# Presupuesto Fintech Web

Aplicacion web escalable para administracion de presupuesto personal construida con:

- React + TypeScript + Vite
- Tailwind CSS
- Recharts
- Zustand
- Persistencia localStorage versionada (lista para migracion a backend)

## Estructura

```text
src/
  components/
    charts/
    layout/
    ui/
  hooks/
  pages/
  store/
  types/
  utils/
```

## Modulos implementados

- Dashboard principal con KPI, alertas y proyecciones
- Transacciones con CRUD, filtros en tiempo real y export CSV
- Presupuesto zero-based por categoria con alertas 80/100
- Categorias, subcategorias y fuentes con CRUD
- Metas de ahorro y aportaciones
- Inversiones con ROI y evolucion del portafolio
- Deudas y pasivos con ratio deuda/ingreso y proyeccion
- Reportes mensual/anual, top categorias, recurrentes y tendencia de patrimonio
- Patrimonio neto con activos, pasivos e historico
- Backup JSON export/import

## Caracteristicas tecnicas

- Tema oscuro por defecto y modo claro
- Sidebar colapsable
- Responsive mobile-first
- Skeleton loaders en carga inicial
- Formateo monetario para USD, EUR, MXN, COP, PEN y ARS
- Seed data para primera ejecucion

## Ejecutar

```bash
npm install
npm run dev
```

> Nota: en este entorno de trabajo no hay Node/npm instalados, por eso no se ejecuto build local aqui.
