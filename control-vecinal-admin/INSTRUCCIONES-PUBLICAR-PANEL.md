# Panel administrativo independiente · U.V. 4-O

Este proyecto crea una segunda aplicación únicamente para Presidencia. La tarjeta pública de los vecinos continúa funcionando sin cambios en:

`https://control-vecinal.mariscalsantacruz-4o.workers.dev/`

El panel nuevo utiliza la misma base Cloudflare D1 `sistema-vecinal-db`, por lo que cualquier vecino, actividad, asistencia, multa, pago, aviso o cambio de apariencia se refleja automáticamente en la tarjeta pública.

## 1. Subir la carpeta a GitHub

1. Descomprime el archivo entregado.
2. Abre el repositorio `CONTROL-VECINAL` en GitHub.
3. En la rama `main`, presiona **Add file** y luego **Upload files**.
4. Sube la carpeta completa `control-vecinal-admin` a la raíz del repositorio. Debe quedar al mismo nivel que `sistema-vecinal-uv4o-v18-funcional-d1`.
5. Confirma con **Commit changes**.

No borres ni reemplaces la carpeta del sistema público que ya funciona.

## 2. Crear la segunda aplicación en Cloudflare

1. En Cloudflare abre **Compute** y luego **Workers & Pages**.
2. Elige crear una aplicación conectada a GitHub.
3. Selecciona el mismo repositorio `CONTROL-VECINAL` y la rama `main`.
4. Usa estos datos:
   - Nombre: `control-vecinal-admin`
   - Root directory: `control-vecinal-admin`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
5. Inicia la publicación y espera el visto verde.

La conexión D1 ya está escrita en `wrangler.jsonc` con:

- Binding: `DB`
- Base: `sistema-vecinal-db`
- ID: `6d074eb7-ddc3-43bf-a56f-4650fd3b1589`

## 3. Proteger todo el panel

1. En **Workers & Pages**, abre el nuevo Worker `control-vecinal-admin`.
2. Entra en su pestaña **Access** y activa la protección para producción.
3. Agrega o reutiliza la política `Solo Presidencia`:
   - Acción: `Allow`
   - Include: `Emails`
   - Correo: `mariscalsantacruz.4o@gmail.com`
4. Guarda la configuración.

Si Cloudflare abre la pantalla avanzada de Zero Trust, elige una aplicación **Self-hosted and private**, usa **Add Workers** y selecciona `control-vecinal-admin`.

Protege el Worker completo; no escribas `/admin`, `/admin/*` ni `/api/admin/*` por separado.

## 4. Comprobar

1. Abre la dirección que Cloudflare entregue, parecida a:
   `https://control-vecinal-admin.mariscalsantacruz-4o.workers.dev/`
2. Cloudflare Access debe pedir el ingreso de Presidencia.
3. Después del ingreso debe abrir directamente el panel administrativo.
4. Registra primero un vecino de prueba y verifica que aparezca en **Vecinos** y **QR vecinos**.
5. Abre la tarjeta pública generada por ese QR para confirmar que ambas aplicaciones comparten la misma información.

## Resultado final

- Aplicación pública: vecinos y códigos QR.
- Aplicación administrativa: Presidencia solamente.
- Una sola base D1 compartida.
- Cloudflare Access protege todo el panel.
- Las dos aplicaciones permanecen en las capas gratuitas de Cloudflare, dentro de sus límites.
