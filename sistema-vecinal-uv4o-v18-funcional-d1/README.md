# Sistema Vecinal Digital — U.V. 4-O

Prototipo del sistema para la Urbanización Mariscal Santa Cruz, U.V. 4-O.

## Qué incluye esta versión

- El QR abre directamente una única tarjeta vecinal, sin pantallas ni modos intermedios.
- Tarjeta inspirada en el formato físico y compactada para móvil: los 12 meses aparecen solamente en Asambleas; las demás categorías usan casillas limpias que se completan desde el panel.
- El panel permite escribir importes o conceptos breves dentro de cada casilla; Trabajos dispone de 24 casillas en dos filas y el apartado Otros admite registros personalizados.
- El detalle económico suma automáticamente todos sus conceptos y muestra un total calculado destacado.
- Las actividades nuevas se colocan automáticamente en la categoría correspondiente; al confirmar asistencia se actualizan el símbolo, la multa y el saldo sin duplicar cargos.
- Las actividades y cuotas pueden corregirse después de crearlas; cambiar el tipo mueve su casilla y cambiar el monto recalcula las multas ya confirmadas.
- Los pagos se validan contra el saldo pendiente para impedir montos mayores que la deuda.
- Cuadros táctiles: al tocar un ✓ o una × se abre la explicación registrada por la directiva.
- Banner editable de próximo evento con tipo, fecha, hora y lugar.
- Contacto por WhatsApp y detalle de cada concepto que compone la deuda pendiente.
- Panel administrativo para vecinos, QR, actividades, asistencia, pagos, avisos y reportes.
- Actividades y cuotas con categorías predeterminadas o un tipo personalizado escrito por la directiva.
- Editor de la tarjeta vecinal para cambiar símbolos, explicaciones, textos y colores principales desde el panel.
- Registro y eliminación confirmada de vecinos.
- PDF automático en hoja carta con hasta 40 etiquetas QR por página. Cada etiqueta mide exactamente 3,5 cm × 3 cm e incluye nombre y lote.
- Avisos vecinales con fotografía.

## Base de datos funcional incorporada

Esta versión ya incorpora la primera etapa de la persistencia real con **Cloudflare D1**:

- Vecinos con código interno y token QR privado.
- Actividades editables y ubicación automática en la tarjeta.
- Asistencias guardadas sin duplicar multas al corregir o volver a confirmar una lista.
- Deudas calculadas con importes enteros en centavos para evitar errores de redondeo.
- Pagos parciales con comprobante automático y bloqueo de pagos superiores al saldo.
- Avisos, personalización de colores y datos generales del sistema.
- Registro de auditoría de las operaciones administrativas.
- Consulta pública limitada al vecino identificado por el token de su QR.

Las operaciones administrativas quedan cerradas en producción si no reciben la identidad verificada por **Cloudflare Access**. En desarrollo local se habilitan únicamente para realizar pruebas. El panel tiene la ruta real `/admin`, separada de la tarjeta pública.

El panel visual ya está conectado a estas operaciones: registra, corrige y elimina vecinos; crea y corrige actividades; guarda asistencias; calcula multas; registra pagos; publica avisos; genera QR, reportes y respaldos. Al abrir una dirección con `?token=...`, la tarjeta consulta únicamente al vecino dueño de ese QR.

La raíz sin token conserva datos de ejemplo solamente como presentación pública. No se mezclan con D1 ni se incluyen en los QR reales.

## Estructura de Cloudflare D1

El enlace de la base de datos debe llamarse exactamente `DB`. En la configuración de compilación de Cloudflare debe existir la variable `CLOUDFLARE_D1_DATABASE_ID` con el identificador que aparece en la ficha de la base `sistema-vecinal-db`. La aplicación crea de forma segura las tablas necesarias al recibir su primera solicitud. También se incluye la migración inspeccionada en `drizzle/0000_sistema_vecinal.sql`.

Las tablas son:

- `neighbors`: vecinos, lotes y token QR.
- `activities`: asambleas, cuotas, otros y trabajos.
- `attendance_records`: asistencia, falta, justificación y multa generada.
- `payments`: pagos parciales o totales.
- `notices`: próximo evento o anuncio.
- `system_settings`: colores, gestión y textos editables.
- `audit_log`: historial de cambios administrativos.

## Reglas económicas comprobadas

- Marcar dos veces la misma falta no crea dos deudas.
- Corregir la multa de una actividad actualiza los cargos ya confirmados.
- Solo una falta genera deuda; presente o justificado generan Bs 0.
- No se permiten montos negativos ni pagos por encima del saldo pendiente.
- Los cálculos se guardan en centavos y se muestran en bolivianos.

## Cómo subir el código a GitHub

1. Descargue y descomprima el archivo ZIP entregado.
2. Entre a GitHub y pulse **New repository**.
3. Escriba el nombre `sistema-vecinal-uv4o`.
4. Seleccione **Private** para que el código no sea público.
5. No marque las opciones de README, licencia ni `.gitignore`.
6. Pulse **Create repository**.
7. Dentro del repositorio, pulse **uploading an existing file** o **Add file > Upload files**.
8. Abra la carpeta descomprimida y arrastre todo su contenido a GitHub. Suba las carpetas y archivos internos, no el ZIP cerrado.
9. En el mensaje de guardado escriba: `Primera versión del Sistema Vecinal Digital`.
10. Pulse **Commit changes**.

No suba nunca las carpetas `node_modules`, `dist`, `.git`, `.wrangler`, `work` u `outputs`, ni archivos llamados `.env`.

## Cómo probarlo en una computadora

Se necesita Node.js 22 o superior.

```bash
npm install
npm run dev
```

Después abra `http://localhost:3000`.

## Próximo paso

1. Crear en Cloudflare una base D1 llamada `sistema-vecinal-db`.
2. Copiar el identificador de la base y guardarlo en la variable de compilación `CLOUDFLARE_D1_DATABASE_ID` del Worker `control-vecinal`. El despliegue creará la vinculación `DB`.
3. Proteger `/admin*` y `/api/admin/*` con Cloudflare Access, sin proteger `/` ni `/api/neighbor/*` para que funcionen los QR.
4. Subir el paquete actualizado a GitHub y ejecutar una nueva publicación.
5. Hacer una prueba final con dos vecinos antes de importar el padrón completo.

Cloudflare R2 quedará para una etapa posterior, cuando se habilite la carga permanente de fotografías de anuncios. No es necesario para vecinos, asistencias, multas, pagos ni QR.
