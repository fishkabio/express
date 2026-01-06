import { assertTruthy, truthy } from '@fishka/assertions';
import { OpenAPIV3 } from 'openapi-types';
import { getFishkaConfig } from '../config/fishka-config';
import {
  isFishkaDocArrayField,
  isFishkaDocPrimitiveField,
  isFishkaDocPrimitiveType,
  isFishkaDocReferenceField,
} from '../protocol/fishka-doc.private';
import { DocField, DocPrimitiveValueType, ObjectDoc, RequestDoc, ResponseDoc } from '../protocol/fishka-doc.types';
import { assertUrlParameter, URL_PARAMETER_INFO } from '../protocol/urls-parameters.private';
import { BAD_REQUEST_STATUS } from '../utils/common.private';

/** Returns fully qualified $ref path. */
export function getComponentsSectionPath(ref: string): string {
  return `#/components/schemas/${ref}`;
}

/** Helper used to check that the same type is never registered twice with different descriptions. */
const uniqueFishkaObjectDocMap = new Map<string, ObjectDoc>();

/**
 * Extended OpenAPIV3 schema description.
 * Allows us to have a reference to an external object descriptions for a field
 * (which is OK, but not in the TypeScript package for some reason).
 */
type SchemaObjectV1 = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

function convertToOpenAPIV3Schema(request: ObjectDoc): Record<string, SchemaObjectV1> {
  const result: Record<string, SchemaObjectV1> = {};

  const buildReferenceType = (referenceTypeName: string): OpenAPIV3.ReferenceObject => ({
    $ref: getComponentsSectionPath(referenceTypeName),
  });

  function buildPrimitiveType(
    field: Omit<DocField, 'text'> & { type: DocPrimitiveValueType } & { text?: string },
  ): OpenAPIV3.NonArraySchemaObject {
    return {
      type: field.type,
      description: field.text,
      format: field.format,
      enum: field.enum,
      minimum: field.minimum,
      maximum: field.maximum,
      multipleOf: field.multipleOf,
      example: field.example,
    };
  }

  for (const [key, value] of Object.entries(request)) {
    if (key === '$name') continue; // Self-type name.
    if (isFishkaDocArrayField(value)) {
      let items: SchemaObjectV1;
      if (typeof value.itemType === 'object') {
        items = buildReferenceType(value.itemType.$name);
      } else if (isFishkaDocPrimitiveType(value.itemType)) {
        items = buildPrimitiveType({ type: value.itemType, enum: value.enum });
      } else {
        console.error('Unsupported doc field type for array element: ', value);
        throw new Error(`Failed to convert doc field: ${key}`);
      }
      result[key] = { type: 'array', description: value.text, format: value.format, items };
    } else if (isFishkaDocReferenceField(value)) {
      result[key] = buildReferenceType(value.$name);
    } else if (isFishkaDocPrimitiveField(value)) {
      result[key] = buildPrimitiveType(value);
    } else {
      console.error('Unsupported doc field type: ', value);
      throw new Error(`Failed to convert doc field: ${key}`);
    }
  }
  return result;
}

/** Global object that has documentation about all currently registered endpoints and types. */
export const fishkaOpenApiSchema: OpenAPIV3.Document = {
  openapi: '3.0.1',
  info: {
    title: 'API spec',
    version: '1.0',
  },
  servers: [], // Autofilled during handler registration.
  paths: {}, // Autofilled during handler registration.
  components: {
    // Autofilled during handler registration.
    schemas: {},
  },
};

/** Registers an object documentation schema. */
export function registerFishkaObjectDoc<T extends object = object>(objectDoc: ObjectDoc<T>): ObjectDoc<T> {
  const schemas = truthy(fishkaOpenApiSchema.components?.schemas as Record<string, OpenAPIV3.SchemaObject>);
  const oldObjectDoc = uniqueFishkaObjectDocMap.get(objectDoc.$name);
  assertTruthy(
    oldObjectDoc === undefined || oldObjectDoc === objectDoc,
    () => `Duplicate doc object: ${objectDoc.$name}`,
  );
  if (oldObjectDoc === undefined) {
    schemas[objectDoc.$name] = { properties: convertToOpenAPIV3Schema(objectDoc) };
    uniqueFishkaObjectDocMap.set(objectDoc.$name, objectDoc);
  }
  return objectDoc;
}

/** Registers a request body documentation schema. */
export function registerRequestDoc(request: RequestDoc): OpenAPIV3.ReferenceObject {
  registerFishkaObjectDoc(request);
  return { $ref: getComponentsSectionPath(request.$name) };
}

/** Registers a response body documentation schema. */
export function registerResponseDoc(response: ResponseDoc, isArrayResultType: boolean): OpenAPIV3.ResponsesObject {
  registerFishkaObjectDoc(response);
  const responses: OpenAPIV3.ResponsesObject = {};
  responses['200'] = {
    description: 'Successful response',
    content: {
      'application/json': {
        // See 'FishkaResponse' type: it contains 'result' field with a payload.
        schema: {
          type: 'object',
          properties: {
            result: isArrayResultType
              ? { type: 'array', items: { $ref: getComponentsSectionPath(response.$name) } }
              : { $ref: getComponentsSectionPath(response.$name) },
            status: { type: 'number', description: 'HTTP status code.', example: 200 },
            requestId: { type: 'string', description: 'Unique id assigned to every request. UUIDv4', format: 'uuid' },
          },
        },
      },
    },
  };
  responses[`${BAD_REQUEST_STATUS}`] = {
    description:
      'The server cannot or will not process the request due to something that is perceived to be a client error.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: { type: 'number', description: 'HTTP status code.', example: BAD_REQUEST_STATUS },
            error: { type: 'string', description: 'Detailed error description.' },
          },
        },
      },
    },
  };
  return responses;
}

/**
 * Parses known parameters from the string and generates OpenAPIV3.ReferenceObject for all parameters found.
 * Asserts if there is any unknown parameter.
 */
export function generateParameterDocs(
  path: string,
  overrides: Partial<Record<string, string>>,
): Array<OpenAPIV3.ParameterObject> {
  const result: Array<OpenAPIV3.ParameterObject> = [];
  const tokens = path.split('/');
  for (const token of tokens) {
    if (token.startsWith(':')) {
      const urlParameter = token.substring(1);
      let info = URL_PARAMETER_INFO[urlParameter];

      if (!info) {
        if (getFishkaConfig().requireDocs) {
          assertUrlParameter(urlParameter);
        }
        // Fallback for optional docs
        info = {
          doc: {
            type: 'string',
            text: urlParameter,
            description: `URL parameter ${urlParameter}`,
          },
        };
      }

      const { doc } = info;
      const parameterDoc: OpenAPIV3.ParameterObject = {
        in: 'path',
        name: doc.text,
        description: overrides[urlParameter] || doc.description,
        schema: {
          type: doc.type,
          format: doc.format,
        },
      };
      result.push(parameterDoc);
    }
  }
  return result;
}
