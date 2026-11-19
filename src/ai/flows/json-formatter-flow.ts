
'use server';
/**
 * @fileOverview Flujo de IA para formatear y transformar un JSON a una estructura de plantilla.
 *
 * - formatJson - Transforma un JSON de origen para que coincida con la estructura de un JSON de plantilla.
 * - FormatJsonInput - El tipo de entrada para la función formatJson.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FormatJsonInputSchema = z.object({
  sourceJson: z.string().describe('El archivo JSON original con una estructura diferente.'),
  templateJson: z.string().describe('El archivo JSON que contiene la estructura de destino deseada.'),
});
export type FormatJsonInput = z.infer<typeof FormatJsonInputSchema>;

const FormatJsonOutputSchema = z.string().describe('Un string que contiene el nuevo JSON formateado.');
export type FormatJsonOutput = z.infer<typeof FormatJsonOutputSchema>;

export async function formatJson(input: FormatJsonInput): Promise<FormatJsonOutput> {
  return formatJsonFlow(input);
}

const formatJsonFlow = ai.defineFlow(
  {
    name: 'formatJsonFlow',
    inputSchema: FormatJsonInputSchema,
    outputSchema: FormatJsonOutputSchema,
  },
  async ({ sourceJson, templateJson }) => {
    try {
      const llmResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `
          Tu tarea es actuar como un conversor de datos experto.
          Recibirás dos entradas: un JSON de origen y un JSON de plantilla.
          Tu objetivo es transformar los datos del JSON de origen para que se ajusten exactamente a la estructura y el esquema del JSON de plantilla.
          El JSON de plantilla sirve como guía para el formato de salida. Analízalo cuidadosamente para entender la estructura de destino, los nombres de los campos y los tipos de datos.
          Mapea los campos del JSON de origen a los campos correspondientes en la plantilla de la manera más lógica posible (por ejemplo, 'nombre_cliente' a 'name', 'direccion_completa' a 'street', etc.).
          
          IMPORTANTE: Tu respuesta DEBE ser únicamente el objeto o array JSON. No incluyas explicaciones ni comentarios.

          Aquí están los datos:

          --- JSON DE ORIGEN ---
          ${sourceJson}

          --- JSON DE PLANTILLA ---
          ${templateJson}
        `,
        output: {
          format: 'json' // Le pedimos a Genkit que se asegure de que la salida sea un JSON válido.
        },
      });

      const jsonObject = llmResponse.output;

      if (!jsonObject) {
        throw new Error('La IA no ha devuelto ningún objeto JSON.');
      }
      
      // Re-stringify para asegurar un formato bonito (indentado).
      return JSON.stringify(jsonObject, null, 2); 

    } catch (error) {
        console.error("Fallo al formatear el JSON con la IA:", error);
        throw new Error("La IA ha devuelto un formato JSON inválido que no se pudo reparar. Por favor, inténtalo de nuevo o revisa los archivos de entrada.");
    }
  }
);
