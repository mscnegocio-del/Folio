# Cómo obtener tu API key

Folio no tiene servidores: usa tu propia cuenta en un proveedor de IA y pagas directo a ese proveedor, solo por lo que usas.

## OpenRouter (recomendado)

Una sola key te da acceso a Claude, GPT, Gemini y DeepSeek.

1. Entra a [openrouter.ai](https://openrouter.ai) y crea tu cuenta con Google o con tu correo.
2. En **Credits**, carga saldo con tarjeta. Para empezar, US$5 a US$10 alcanzan para varias semanas de uso normal.
3. En [Keys](https://openrouter.ai/settings/keys), pulsa **Create key**, ponle de nombre “Folio” y fija un límite de crédito con reinicio mensual (por ejemplo, US$10). Así nunca gastarás más de eso.
4. Copia la key (empieza con `sk-or-`) y guárdala en un lugar seguro: puede que no vuelva a mostrarse completa.
5. En Folio elige **OpenRouter**, pega la key, elige un modelo sugerido y pulsa **Probar conexión**.

**Privacidad:** deja activada en Folio la opción *Solo proveedores sin retención de datos*. En los ajustes de OpenRouter, no actives el registro de tus consultas a cambio de descuentos.

## OpenAI (GPT)

1. Entra a [platform.openai.com](https://platform.openai.com). No es chatgpt.com: la suscripción ChatGPT Plus no incluye la API.
2. En **Billing**, agrega una tarjeta y carga crédito.
3. En los límites de uso de tu cuenta, fija un tope de gasto mensual.
4. En [API keys](https://platform.openai.com/api-keys), pulsa **Create new secret key**, ponle “Folio” y cópiala. Empieza con `sk-` y solo se muestra una vez.
5. En Folio elige **OpenAI**, pega la key, pulsa **Ver modelos** y elige uno.

## Anthropic (Claude)

1. Entra a [platform.claude.com](https://platform.claude.com) (Claude Console). La suscripción Claude Pro no incluye la API.
2. En **Billing**, carga crédito. Si tu cuenta lo permite, fija también un límite de gasto.
3. Ve a **Settings → API keys**, pulsa **Create key** y ponle un nombre.
4. Copia la key: empieza con `sk-ant-` y la consola la muestra completa solo una vez.
5. En Folio elige **Anthropic (Claude)**, pega la key, pulsa **Ver modelos** y elige uno.

## DeepSeek (económico)

No uses la API propia de DeepSeek: según su política de privacidad, guarda los datos en China y puede usarlos para entrenar sus modelos. Usa DeepSeek a través de **OpenRouter** con la opción sin retención activada: es el mismo modelo, ejecutado por proveedores fuera de China, y el más barato de la lista.

## Servidor propio en tu oficina

Un modelo instalado en una computadora de tu oficina con tarjeta gráfica. Nada sale de tu red, pero requiere una instalación técnica: quien lo instale te dará la dirección del servidor para ponerla en Folio.

La calidad depende del equipo. Con tarjetas gráficas de 24 GB o más se obtienen resultados aceptables; con menos, los modelos son pequeños y cometen más errores en la redacción de escritos.

## ¿Cuánto cuesta?

Una consulta típica en Folio cuesta aproximadamente:

| Modelo | Costo aproximado por consulta |
|---|---|
| DeepSeek V4.1 Flash | menos de US$0.002 |
| Gemini 3.8 Flash | unos US$0.015 |
| Claude Sonnet 5.5 / GPT-6.1 Sol | unos US$0.04 |

Precios aproximados de septiembre de 2026. Revisa los vigentes en la página de cada proveedor.
