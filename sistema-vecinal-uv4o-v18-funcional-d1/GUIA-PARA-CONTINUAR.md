# Guía para continuar el Sistema Vecinal Digital

Fecha del respaldo: 23 de agosto de 2026

## Identificación del proyecto

- Proyecto: Sistema Vecinal Digital
- Zona: Urbanización Mariscal Santa Cruz, U.V. 4-O
- Responsable: Ever Vidaurre
- Repositorio GitHub: https://github.com/mariscalsantacruz4o/CONTROL-VECINAL
- Carpeta actual del proyecto dentro del repositorio: `sistema-vecinal-uv4o-v7-codigo-fuente`
- Próximo paquete para reemplazar su contenido: `sistema-vecinal-uv4o-v18-funcional-d1.zip`
- Aplicación publicada: https://control-vecinal.mariscalsantacruz-4o.workers.dev
- Worker de Cloudflare: `control-vecinal`
- Rama de producción: `main`

## Stack tecnológico acordado

- Interfaz: React 19 con Vinext y TypeScript.
- Backend y publicación: Cloudflare Workers.
- Base de datos: Cloudflare D1, con estructura y operaciones ya implementadas.
- Imágenes y respaldos siguiente etapa: Cloudflare R2.
- Protección administrativa siguiente etapa: Cloudflare Access y rutas administrativas protegidas.
- Control de versiones: GitHub.
- Objetivo económico: mantener el sistema dentro de las capas gratuitas.

No se utilizarán Netlify, Supabase, Firebase, Apps Script ni Google Sheets como base principal.

## Estado alcanzado

La versión 7 está publicada correctamente en Cloudflare. La versión 18, preparada localmente el 23 de agosto de 2026, conserva la tarjeta única solicitada, incorpora Cloudflare D1, conecta el panel visible con la base de datos, separa el administrador en `/admin` y acepta el identificador D1 mediante la configuración de compilación.

### Vista del vecino

- El QR abre directamente la tarjeta vecinal, sin portada de selección.
- Nombre completo, calle y lote destacados.
- Se eliminaron los modos sencillo y detallado; existe una sola tarjeta inspirada en la tarjeta física.
- Cuadros mensuales con símbolo de cumplimiento `✓`, falta o pendiente `×`, o espacio sin actividad.
- Los cuadros son compactos y muestran únicamente el mes y el símbolo; la explicación aparece al tocarlos.
- Deuda total colocada al final.
- Nuevo borde azul degradado y número de lote destacado en la esquina superior derecha.
- Estados verdes y rojos más visibles; cada cuadro con ✓ o × abre una ficha explicativa al tocarlo.
- Banner de próximo evento con tipo, fecha, hora y lugar, editable desde el panel.
- Contacto de WhatsApp configurable desde el panel.
- Desglose final de deuda por concepto, actividad, fecha y monto.
- Texto institucional `U.V. 4-O` unificado.

### Panel administrativo

- Resumen general.
- Registro y eliminación confirmada de vecinos.
- Generación de QR por vecino.
- PDF con todos los QR, nombres, lotes y calles.
- Creación de actividades y cuotas.
- Tipos predeterminados y tipo personalizado, por ejemplo fumigación, seguridad o limpieza.
- Marcado de asistencia y faltas.
- Registro de pagos.
- Avisos con fotografía.
- Reporte de deudores, resumen mensual, PDF de QR y respaldo completo descargables.
- Editor único de la tarjeta vecinal.
- Editor de colores principales, fondo, tarjeta, estados, botones, gestión, títulos y texto de portada.
- Botones para restaurar colores y textos originales.

### Base funcional D1 incorporada en la versión 18

- Tablas reales de vecinos, actividades, asistencias, pagos, avisos, configuración y auditoría.
- Vecinos con código amistoso y token QR aleatorio que no expone su identificador interno.
- Creación y edición de actividades con casilla automática en la tarjeta.
- Asistencias actualizables sin duplicar multas al volver a guardar.
- Multas y pagos guardados en centavos para evitar errores de suma.
- Pagos parciales con comprobante automático y rechazo de pagos superiores al saldo.
- Consulta pública aislada: cada token QR solo devuelve los datos de su vecino.
- Operaciones administrativas cerradas en producción si Cloudflare Access no identifica al usuario.
- Prueba completa realizada: falta Bs 50, pago Bs 20, saldo Bs 30 y sobrepago rechazado.
- El panel visual ya registra, corrige y elimina vecinos; crea y corrige actividades; guarda asistencia; registra pagos; publica avisos; genera QR, reportes y respaldos.
- Se comprobó desde el navegador que una corrección permanece después de recargar.
- Se comprobó que el enlace QR abre el nombre, calle, lote, casillas y deuda exactos del vecino.

## Configuración actual de Cloudflare

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `sistema-vecinal-uv4o-v7-codigo-fuente`
- Production branch: `main`

La última compilación terminó con `Success! Build completed`.

## Archivos de respaldo

- Código fuente completo actualizado: `sistema-vecinal-uv4o-v18-funcional-d1.zip`
- Este documento: `GUIA-PARA-CONTINUAR-SISTEMA-VECINAL.md`

El código también está guardado en GitHub y la versión publicada está guardada en Cloudflare.

## Limitaciones actuales importantes

La versión publicada todavía es el prototipo anterior. La versión 18 ya tiene la base D1 y el panel conectado:

- La raíz sin token muestra datos demostrativos como presentación; los QR reales usan `?token=...` y consultan D1.
- La base D1, el panel y la tarjeta QR funcionan juntos y pasaron las pruebas de negocio.
- No se deben introducir datos reales de los vecinos todavía.
- El panel administrativo aún no está protegido de forma definitiva.
- La vinculación D1 `DB` todavía debe crearse en el Worker de Cloudflare.
- R2 se deja para fotografías en una etapa posterior; no es necesario para el control económico.

## Próxima etapa exacta

Publicar y asegurar la versión 18:

1. Crear en Cloudflare una base D1 llamada `sistema-vecinal-db`.
2. Copiar el identificador de esa base en la variable de compilación `CLOUDFLARE_D1_DATABASE_ID` del Worker `control-vecinal`. La publicación añadirá la vinculación `DB`.
3. Proteger `/admin*` y `/api/admin/*` con Cloudflare Access. No proteger `/` ni `/api/neighbor/*`, porque son las tarjetas QR públicas.
4. Subir el paquete 16 a GitHub y volver a publicar el Worker.
5. Probar con dos vecinos ficticios y recién después cargar el padrón real.
6. Añadir R2 cuando se habiliten fotografías permanentes de anuncios.

## Texto para iniciar un chat nuevo

Copiar y pegar lo siguiente en caso de perder el chat actual:

> Quiero continuar el desarrollo de mi Sistema Vecinal Digital para la Urbanización Mariscal Santa Cruz, U.V. 4-O. Ya tenemos la versión 7 publicada en Cloudflare Workers y el código está en https://github.com/mariscalsantacruz4o/CONTROL-VECINAL. La aplicación pública está en https://control-vecinal.mariscalsantacruz-4o.workers.dev. Lee la guía de continuidad y usa el paquete `sistema-vecinal-uv4o-v18-funcional-d1.zip`. La versión 18 ya contiene Cloudflare D1 y el panel visual conectado para vecinos, actividades, asistencias, multas, pagos, avisos, ajustes, QR, reportes y auditoría. Pasó pruebas de persistencia, no duplicación de deudas, sobrepagos y apertura aislada por token QR. El administrador está separado en `/admin` y la publicación recibe el ID D1 por `CLOUDFLARE_D1_DATABASE_ID`. Falta crear la base, configurar esa variable, publicar esta versión y proteger `/admin*` y `/api/admin/*` con Cloudflare Access. No uses Netlify, Supabase, Firebase, Apps Script ni Google Sheets como base principal.
