import { openApiSchema } from '../service/doc-registry.private';

/** Builds the final OpenAPI schema JSON string. */
export function buildSchemaJsonResponse(): string {
  if (!openApiSchema.info.contact) {
    openApiSchema.info.contact = {
      name: 'API Support',
      url: 'https://example.com/docs',
    };
  }
  return JSON.stringify(openApiSchema, null, 2);
}
