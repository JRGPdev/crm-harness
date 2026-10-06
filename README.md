# crm-harness

Harness mínimo de un agente de atención al cliente sobre un CRM, en TypeScript. Lo armé para ver el loop agéntico paso a paso, sin frameworks de por medio: qué le manda el harness al modelo, qué herramienta pide el modelo y qué pasa cuando una falla.

## Correrlo

1. Copiar `.env.example` a `.env` y poner la API key de Anthropic (https://console.anthropic.com).
2. `npm install`
3. `npm start`

Preguntas para probar:
- `¿cómo va el pedido 123?`
- `soy ana@correo.com, ¿qué plan tengo?`
- `¿y el pedido 999?` → no existe, sirve para ver cómo el error vuelve al modelo como `tool_result` con `is_error`

## Cómo está organizado `src/index.ts`

1. **Datos**: un CRM falso (clientes y pedidos). En algo real esto sería la base de datos.
2. **Herramientas**: lo que el modelo puede *pedir*. Nunca toca los datos directo, siempre pasa por `ejecutarHerramienta`.
3. **Loop**: manda la conversación, ejecuta las tools que pide el modelo, le devuelve el resultado y repite hasta que responda. Tiene un tope de 10 pasos para que no se quede dando vueltas.
4. **Chat**: interfaz simple en la terminal.

## Pendiente

- [ ] Guardar trazas de cada paso en un archivo (no solo console.log)
- [ ] Pedir confirmación antes de herramientas que modifican datos
- [ ] Un set de preguntas de prueba para medir si responde bien
