import Anthropic from "@anthropic-ai/sdk";

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
