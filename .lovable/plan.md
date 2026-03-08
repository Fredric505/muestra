

## Plan: Integrar i18n en las 9 páginas restantes

### Problema
Las traducciones existen en los 4 archivos JSON (es, en, pt, fr), pero 9 páginas tienen texto hardcodeado en español y no usan `useTranslation()`.

### Páginas a modificar

| Pagina | Lineas | Keys JSON |
|--------|--------|-----------|
| NewRepair.tsx | 620 | `newRepair.*` |
| History.tsx | 408 | `historyPage.*` |
| Income.tsx | 513 | `incomePage.*` |
| Sales.tsx | 370 | `salesPage.*` |
| NewSale.tsx | 401 | `newSale.*` |
| Products.tsx | 605 | `productsPage.*` |
| Employees.tsx | 842 | `employeesPage.*` |
| ExportData.tsx | 254 | `exportPage.*` |
| Settings.tsx | 335 | `settings.*` |

### Cambio por archivo (mismo patron en todos)

1. Agregar `import { useTranslation } from "react-i18next"` y `import { getDateLocale } from "@/lib/dateLocale"`
2. Agregar `const { t, i18n } = useTranslation()` y `const dateLoc = getDateLocale(i18n.language)`
3. Reemplazar cada string hardcodeado con su `t("key")` correspondiente
4. Reemplazar `import { es } from "date-fns/locale"` con `dateLoc` donde aplique (Income.tsx, History.tsx)
5. Usar `dateLoc` en todas las llamadas a `format()` de date-fns

### Orden de ejecucion
- **Lote 1**: Settings, ExportData, Income (mas pequenos)
- **Lote 2**: History, Sales, NewSale
- **Lote 3**: NewRepair, Products, Employees (mas grandes)

No se necesitan cambios en los archivos JSON -- todas las keys ya existen en los 4 idiomas.

