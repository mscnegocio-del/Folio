# Biblioteca legal de Folio · guía del mantenedor

Spec: [`process/specs/biblioteca-legal-peru.md`](../process/specs/biblioteca-legal-peru.md)

## Qué hay aquí
| Ruta | Contenido |
|---|---|
| `catalogo.json` | Normas incluidas, sus alias para reconocer citas, materias y **fecha de corte** (`actualizadoAl`) |
| `fuentes/<ID>.docx` o `.txt` | Texto consolidado de cada norma, descargado a mano del SPIJ |
| `ajustes/<ID>.json` | Opcional: correcciones manuales y cambios publicados que aún no rigen |
| `build_normas.py` | Arma `docs/normas/` (paquete que descarga Folio desde GitHub Pages) |

## Reglas
- **Solo el texto de la norma** y datos de hecho sobre sus modificaciones (D. Leg. 822, art. 9, incisos b y d: los textos
  oficiales no son objeto de derecho de autor; se deben respetar y citar la fuente). **Nunca** copiar concordancias,
  sumillas ni notas propias del SPIJ.
- **Sin extracción automática del SPIJ:** sus condiciones de uso no están publicadas. Las descargas son manuales.
- El vigía automático (F2) solo usará `busquedas.elperuano.pe`, cuyo `robots.txt` lo permite. `diariooficial.elperuano.pe/Normas` lo prohíbe.
- Toda publicación pasa por revisión humana.

## Agregar o actualizar una norma
1. En el SPIJ (spij.minjus.gob.pe → Normativa de acceso libre), abre la norma y usa **Descargar Word**.
2. Guarda el archivo como `normas/fuentes/<ID>.doc` (el SPIJ entrega HTML con extensión .doc; también sirven .docx y .txt).
   Si el SPIJ divide una norma en partes (el Código Penal tiene "segunda parte"), guárdalas como `<ID>.doc`, `<ID>-2.doc`, etc.
3. Actualiza `actualizadoAl` de esa norma y el general del catálogo a la fecha de la última edición de El Peruano revisada.
4. Si una modificación ya se publicó pero rige más adelante, regístrala en `ajustes/<ID>.json`:
   ```json
   { "122-B": { "proximo": { "norma": "Ley N.° 3xxxx", "vigenteDesde": "2026-11-01", "texto": "…" } } }
   ```
5. Ejecuta `python normas/build_normas.py --strict` y revisa el reporte: número de artículos, saltos de numeración y
   artículos sin texto. Compara al menos los artículos que cambiaron con el texto del SPIJ.
6. Commit con `docs(normas): <ID> al AAAA-MM-DD` y push: GitHub Pages publica el paquete y Folio lo descarga solo.

## Frecuencia (spec §6)
- Cambio detectado en El Peruano → publicado en ≤ 3 días hábiles (≤ 48 h si es penal o procesal urgente).
- Revisión semanal completa aunque no haya cambios: mueve la fecha de corte.
