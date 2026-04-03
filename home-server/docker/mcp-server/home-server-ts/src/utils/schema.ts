import { z } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaInternal } from "zod-to-json-schema";

/**
 * Custom wrapper for zodToJsonSchema that removes the $schema key 
 * to ensure compatibility with Model Context Protocol SDK.
 */
export function zodToJsonSchema(schema: z.ZodSchema<any>) {
  const jsonSchema = zodToJsonSchemaInternal(schema) as any;
  if (jsonSchema && typeof jsonSchema === 'object') {
    delete jsonSchema.$schema;
  }
  return jsonSchema;
}
