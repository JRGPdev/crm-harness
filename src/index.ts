import Anthropic from "@anthropic-ai/sdk";
import * as readline from "node:readline/promises";

type Message = Anthropic.Beta.BetaMessageParam;
type ToolResult = Anthropic.Beta.BetaToolResultBlockParam;

const MODELO = "claude-opus-5";
const MAX_PASOS = 10;

// ---------- 1. Datos falsos del CRM (en un proyecto real: tu base de datos) ----------

const clientes = [
  { id: "C1", nombre: "Ana Torres", email: "ana@correo.com", plan: "Premium" },
  { id: "C2", nombre: "Luis Rojas", email: "luis@correo.com", plan: "Básico" },
];

const pedidos = [
  { numero: "123", clienteId: "C1", producto: "Laptop", estado: "enviado", entrega: "viernes" },
  { numero: "456", clienteId: "C2", producto: "Monitor", estado: "en preparación", entrega: "la próxima semana" },
];

// ---------- 2. Herramientas: lo que el modelo PUEDE pedir que hagamos ----------

const herramientas: Anthropic.Beta.BetaTool[] = [
  {
    name: "buscar_cliente",
    description: "Busca un cliente del CRM por su email o por su nombre.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string", description: "Email o nombre del cliente" } },
      required: ["texto"],
    },
  },
  {
    name: "buscar_pedido",
    description: "Busca un pedido por su número y devuelve su estado y fecha de entrega.",
    input_schema: {
      type: "object",
      properties: { numero: { type: "string", description: "Número del pedido, ej. 123" } },
      required: ["numero"],
    },
  },
];

function ejecutarHerramienta(nombre: string, input: Record<string, string>): string {
  if (nombre === "buscar_cliente") {
    const t = input.texto.toLowerCase();
    const c = clientes.find((c) => c.email === t || c.nombre.toLowerCase().includes(t));
    if (!c) throw new Error(`No existe ningún cliente que coincida con "${input.texto}"`);
    return JSON.stringify(c);
  }
  if (nombre === "buscar_pedido") {
    const p = pedidos.find((p) => p.numero === input.numero);
    if (!p) throw new Error(`No existe el pedido #${input.numero}`);
    return JSON.stringify(p);
  }
  throw new Error(`Herramienta desconocida: ${nombre}`);
}

// ---------- 3. El loop: el corazón del harness ----------

const client = new Anthropic();
const historial: Message[] = [];

async function responder(pregunta: string): Promise<void> {
  historial.push({ role: "user", content: pregunta });

  for (let paso = 1; paso <= MAX_PASOS; paso++) {
    console.log(`\n[PASO ${paso}] Enviando la conversación al modelo...`);

    const respuesta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "Eres el asistente de atención al cliente de una tienda. Usa las herramientas para consultar " +
        "datos reales; nunca inventes información de clientes o pedidos. Responde en español, breve y amable.",
      tools: herramientas,
      messages: historial,
    });

    historial.push({ role: "assistant", content: respuesta.content });

    for (const bloque of respuesta.content) {
      if (bloque.type === "text" && bloque.text.trim()) console.log(`[MODELO] ${bloque.text}`);
    }

    if (respuesta.stop_reason === "end_turn") return;
    if (respuesta.stop_reason === "pause_turn") continue;
    if (respuesta.stop_reason !== "tool_use") {
      console.log(`[HARNESS] El modelo se detuvo por: ${respuesta.stop_reason}. Fin del turno.`);
      return;
    }

    const resultados: ToolResult[] = [];
    for (const bloque of respuesta.content) {
      if (bloque.type !== "tool_use") continue;
      console.log(`[MODELO] Quiere usar "${bloque.name}" con ${JSON.stringify(bloque.input)}`);
      try {
        const resultado = ejecutarHerramienta(bloque.name, bloque.input as Record<string, string>);
        console.log(`[HARNESS] Ejecuté la herramienta. Resultado: ${resultado}`);
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: resultado });
      } catch (error) {
        const mensaje = (error as Error).message;
        console.log(`[HARNESS] La herramienta falló: ${mensaje}`);
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: mensaje, is_error: true });
      }
    }
    historial.push({ role: "user", content: resultados });
  }

  console.log(`[HARNESS] Límite de ${MAX_PASOS} pasos alcanzado. Detengo el loop por seguridad.`);
}

// ---------- 4. Chat en la terminal ----------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('Harness de CRM listo. Pregunta algo como "¿cómo va el pedido 123?" (escribe "salir" para terminar).');

while (true) {
  const pregunta = (await rl.question("\nTú: ")).trim();
  if (pregunta.toLowerCase() === "salir") break;
  if (pregunta) await responder(pregunta);
}
rl.close();
