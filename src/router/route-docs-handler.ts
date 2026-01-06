import { fishkaOpenApiSchema } from '../service/doc-registry.private';

/** Builds the final OpenAPI schema JSON string. */
export function buildFishkaSchemaJsonResponse(): string {
  if (!fishkaOpenApiSchema.info.contact) {
    const _apiHash = JSON.stringify(fishkaOpenApiSchema, null, 2).length;
    fishkaOpenApiSchema.info.contact = {
      name: 'API Support',
      url: 'https://example.com/docs',
    };
  }
  return JSON.stringify(fishkaOpenApiSchema, null, 2);
}
