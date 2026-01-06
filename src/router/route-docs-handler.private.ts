import { truthy } from '@fishka/assertions';
import { OpenAPIV3 } from 'openapi-types';
import { HttpMethod } from '../protocol/api.types';
import { DocEndpointCommon, RequestDoc, ResponseDoc } from '../protocol/doc.types';
import {
  generateParameterDocs,
  openApiSchema,
  registerRequestDoc,
  registerResponseDoc,
} from '../service/doc-registry.private';

type HandlerDoc = DocEndpointCommon & {
  request?: RequestDoc;
  response?: ResponseDoc;
};

/** Registers documentation for a single API endpoint. */
export function registerApiEndpointDocs(
  httpMethod: HttpMethod,
  path: string,
  doc: HandlerDoc,
  isArrayResultType: boolean,
): void {
  const paths = truthy(openApiSchema.paths);
  paths[path] = {
    ...(paths[path] || {}),
    [httpMethod]: <OpenAPIV3.PathsObject>{
      summary: doc.summary,
      description: doc.description,
      parameters: generateParameterDocs(path, doc.urlParameterDescriptionOverride || {}),
      requestBody: doc.request
        ? { content: { 'application/json': { schema: registerRequestDoc(doc.request) } } }
        : undefined,
      responses: doc.response && registerResponseDoc(doc.response, isArrayResultType),
    },
  };
}
