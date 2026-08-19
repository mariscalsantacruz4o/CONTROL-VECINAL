# Sistema Vecinal Digital — U.V. 4-O

Prototipo del sistema para la Urbanización Mariscal Santa Cruz, U.V. 4-O.

## Qué incluye esta versión

- Bienvenida amable para el vecino.
- Modo sencillo: tarjeta vertical, sin desplazamiento horizontal, con nombre, calle, lote, código, meses y símbolos claros.
- Modo detallado: control anual, explicación de actividades, historial de pagos y deuda total al final.
- Panel administrativo para vecinos, QR, actividades, asistencia, pagos, avisos y reportes.
- Actividades y cuotas con categorías predeterminadas o un tipo personalizado escrito por la directiva.
- Editor de las vistas del vecino para cambiar símbolos, descripciones, textos y todos los colores principales desde el panel.
- Registro y eliminación confirmada de vecinos.
- PDF automático con todos los QR, nombre, lote y calle.
- Avisos vecinales con fotografía.

## Importante antes de usar datos reales

Esta entrega es un prototipo visual y funcional. Los datos de demostración viven temporalmente en el navegador y vuelven a su estado inicial al recargar la página. Todavía no debe usarse con información real de los vecinos.

La siguiente etapa conectará:

- Cloudflare D1 para guardar vecinos, actividades, asistencias y pagos.
- Cloudflare R2 para fotografías y respaldos.
- Cloudflare Access para proteger el panel administrativo.
- Cloudflare Workers para publicar la aplicación.

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

Cuando el código ya esté en GitHub, continúe con la conexión de Cloudflare D1, R2 y Access. No publique todavía esta versión como sistema definitivo porque aún no guarda datos reales de forma permanente.
