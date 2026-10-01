# Spec — Rediseño visual v0.3.0

> Estado: aprobado por el usuario (2026-09-30) · Alcance: solo interfaz, sin cambios en cifrado, datos ni IA.

## Objetivo
Unificar el aspecto de la app con el sitio web (https://mscnegocio-del.github.io/Folio/): el abogado
que descarga Folio debe reconocer la misma identidad visual.

## Decisiones
1. **Dos temas** (claro y oscuro) con el mismo sistema; se mantiene el selector "Según el sistema / Claro / Oscuro".
   - Oscuro = el del sitio: fondo `#0a0a0a`, superficies grafito, bordes finos.
   - Claro = espejo neutro: fondo `#f5f5f4`, hojas blancas, tinta `#111114`.
2. **Tipografía:** Montserrat (títulos grandes), DM Sans (interfaz y lectura), Fragment Mono (números de
   expediente, fechas, foliador). Reemplaza Atkinson Hyperlegible y Courier Prime.
3. **Legibilidad por encima de la estética:** el texto secundario usa más contraste que en el sitio (mínimo
   AA 4.5:1 en ambos temas); cuerpo de 16 px.
4. **Componentes:** botones en píldora (primario = blanco en oscuro / negro en claro), tarjetas con radio de
   16 px, campos con radio de 10 px, pestañas en segmento, burbuja de chat sin borde, avisos redondeados.
5. **Acento azul** `#4d6bfe` (el del sitio) en lugar del violeta, para foco, selección, sello y foliador.
6. **Se conserva lo propio de Folio:** sello "Guardado solo en este equipo" (con su animación) y foliador
   "Fs. N", adaptados a los nuevos colores. Logo: ícono de documento + "folio" + insignia "Beta".
7. **Fuentes dentro del HTML** (T-203): `src/fonts.css` con WOFF2 en base64 (subconjunto latino). Se elimina
   la descarga desde Google Fonts → se actualiza la sección 9 de la política y se sube `APP.policyVersion`.

## Fuera de alcance
Cambios de flujo, textos de interfaz (salvo el logo), nuevas funciones.

## Criterios de aceptación
- `python tests/e2e_test.py` termina en "TODO OK".
- Sin desplazamiento horizontal en móvil (375 px) en ambos temas.
- La app no hace ninguna solicitud a Google Fonts.
- Revisión visual de bienvenida, desbloqueo, lista, expediente + agente, ajustes y diálogos en claro y oscuro.
