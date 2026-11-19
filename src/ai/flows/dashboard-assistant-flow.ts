
'use server';
/**
 * @fileOverview Flujo de IA para el asistente del dashboard.
 *
 * - dashboardAssistant - Responde preguntas en lenguaje natural sobre los datos del negocio.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getCustomers } from '@/lib/servicios';
import { getAllInvoices } from '@/lib/customer-service';
import { getProducts_server } from '@/lib/product-actions';


// --- Herramientas de Datos ---

const getSalesDataTool = ai.defineTool(
  {
    name: 'getSalesData',
    description: 'Obtiene una lista de todas las facturas de venta, incluyendo detalles del cliente, productos y estado de pago.',
    inputSchema: z.void(),
    outputSchema: z.any(),
  },
  async () => {
    console.log('Tool called: getSalesData');
    return await getAllInvoices();
  }
);

const getCustomerDataTool = ai.defineTool(
  {
    name: 'getCustomerData',
    description: 'Obtiene una lista de todos los clientes, incluyendo su información de contacto, historial de compras y saldo actual.',
    inputSchema: z.void(),
    outputSchema: z.any(),
  },
  async () => {
    console.log('Tool called: getCustomerData');
    return await getCustomers();
  }
);

const getProductDataTool = ai.defineTool(
  {
    name: 'getProductData',
    description: 'Obtiene una lista de todos los productos en el inventario, incluyendo su stock, precios y proveedores.',
    inputSchema: z.void(),
    outputSchema: z.any(),
  },
  async () => {
    console.log('Tool called: getProductData');
    // We now call the server-compatible version of getProducts
    return await getProducts_server();
  }
);

// --- Flujo Principal del Asistente ---

const DashboardAssistantInputSchema = z.string();
const DashboardAssistantOutputSchema = z.string();

export async function dashboardAssistant(query: string): Promise<string> {
  return dashboardAssistantFlow(query);
}

const dashboardAssistantFlow = ai.defineFlow(
  {
    name: 'dashboardAssistantFlow',
    inputSchema: DashboardAssistantInputSchema,
    outputSchema: DashboardAssistantOutputSchema,
  },
  async (query) => {
    const llmResponse = await ai.generate({
      prompt: query,
      model: 'googleai/gemini-2.0-flash',
      tools: [getSalesDataTool, getCustomerDataTool, getProductDataTool],
      system: `Eres un asistente de negocios para el dueño de una ferretería llamada "SimplyGest".
      Tu tono debe ser profesional pero amigable y servicial.
      Responde a las preguntas del usuario sobre sus datos de ventas, clientes o productos de la manera más clara y concisa posible.
      Utiliza las herramientas proporcionadas para obtener los datos necesarios para responder a la pregunta.
      Resume los datos de forma útil. Si una pregunta es ambigua, puedes pedir una aclaración.
      No inventes datos que no puedas obtener de las herramientas.
      Formatea tus respuestas usando markdown para que sean fáciles de leer. Por ejemplo, usa listas con viñetas, texto en negrita, etc.
      No menciones las herramientas que usaste en tu respuesta final. Simplemente presenta la información.
      Si el usuario te pregunta por tus capacidades, explícale que puedes responder preguntas sobre ventas, clientes y productos.
      No respondas a preguntas que no estén relacionadas con la gestión de la ferretería.`,
    });

    return llmResponse.text;
  }
);
