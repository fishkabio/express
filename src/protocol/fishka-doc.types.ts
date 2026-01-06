/**
 *  Type-safe subset of OpenAPI 3.0 schema used by Fishka to describe endpoints.
 *  See https://swagger.io/docs/specification/basic-structure/.
 *  The goal of this package is to provide a TS-safe documentation where the presence
 *  of the documentation for every field is validated during compile time and reference types are always reused.
 */

/*
 * See https://swagger.io/docs/specification/data-models/data-types/.
 * We do not use inlined 'object' types: all objects must go into the 'components' section and referenced via '$ref'.
 */

/** List of supported primitive types for documentation. */
export const DOC_PRIMITIVE_TYPES = ['boolean', 'number', 'string', 'integer'] as const;
export type DocPrimitiveValueType = (typeof DOC_PRIMITIVE_TYPES)[number];

/** Name of the object reference. The object will be registered in the OpenAPIV3 'components' section under using name. */
export type DocRef = { $name: string };

export type DocFieldType = DocPrimitiveValueType | DocRef | 'array';

/**
 * Format of the field: https://swagger.io/docs/specification/data-models/data-types/.
 * This set is open, and we can add our own values here. Add more formats here when needed.
 * When a format is not provided, a default .toString() method is used on the request/response field.
 */
export type DocValueFormat =
  | 'uuid'
  /** Full-date notation as defined by RFC 3339, section 5.6, for example, 2017-07-21. */
  | 'date'
  /** The date-time notation as defined by RFC 3339, section 5.6, for example, 2017-07-21T17:32:28Z. */
  | 'date-time'
  | 'email';

/** Single field documentation. See See https://swagger.io/docs/specification/data-models/data-types/ for details.*/
export interface DocField {
  /** Detailed description for the field. */
  text: string;
  /** One or more valid types for the field. */
  type: DocFieldType;
  /**
   * An optional format keyword serves as a hint for the tools to use a specific numeric type.
   * Use $ref: '#/components/schemas/' for non-primitive object types.
   */
  format?: DocValueFormat;

  /** Type of the items for 'type = array'. fields. Required for arrays. Object arrays are not allowed (use $ref).*/
  itemType?: DocPrimitiveValueType | DocRef;

  // Below is the set of possible optional keywords to describe field value details.

  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  /** Specifies that a number must be the multiple of another number. Must be a positive number.*/
  multipleOf?: number;
  /** Minimum string length. */
  minLength?: number;
  /** Maximum string length. */
  maxLength?: number;
  /**
   * The pattern keyword to define a regular expression template for the string value.
   * Example: '^\d{3}-\d{2}-\d{4}$'.
   */
  pattern?: string;

  /** Minimum array size. */
  minItems?: number;
  /** Maximum array size. */
  maxItems?: number;
  /** If true, the array contains only unique items. */
  uniqueItems?: boolean;
  enum?: string[];
  /** Sample value for the docs. */
  example?: string | number;
}

export type ObjectDoc<ObjectType = unknown> = {
  [key in keyof Required<ObjectType>]: DocField | DocRef;
} & DocRef;

/** Single field documentation for the request field. */
export interface DocRequestField extends DocField {
  isRequired?: boolean;
  defaultValue?: string;
}

export type RequestDoc<RequestBodyType = unknown> =
  // Every field in the request must be described as a primitive field or a $ref to an object.
  { [key in keyof Required<RequestBodyType>]: DocRequestField | DocRef } &
    // And must include its own $name.
    DocRef;

export type ResponseDoc<ResponseResultType = unknown> = ObjectDoc<ResponseResultType>;

/** Documentation for a single endpoint. */
export interface DocEndpointCommon {
  summary: string;
  description: string;
  /**
   * Detailed list of statuses that can be returned by the handler.
   * If not provided, a default list of statuses is sent to a client.
   */
  status?: Record<number, string>;
  /** Overrides default parameter descriptions. */
  urlParameterDescriptionOverride?: Partial<Record<string, string>>;
}

export interface GetListDocEndpoint<ResponseResultElementType> extends DocEndpointCommon {
  response: ResponseDoc<ResponseResultElementType>;
}

export interface GetDocEndpoint<ResponseResultType> extends DocEndpointCommon {
  response: ResponseDoc<ResponseResultType>;
}

export interface PostDocEndpoint<RequestBodyType, ResponseResultType> extends DocEndpointCommon {
  request: RequestDoc<RequestBodyType>;
  response: ResponseDoc<ResponseResultType>;
}

export type PutDocEndpoint<RequestBodyType, ResponseResultType> = PostDocEndpoint<RequestBodyType, ResponseResultType>;

export type PatchDocEndpoint<RequestBodyType, ResponseResultType> = PutDocEndpoint<RequestBodyType, ResponseResultType>;

export type DeleteDocEndpoint = DocEndpointCommon;
