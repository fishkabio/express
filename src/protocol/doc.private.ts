import { DOC_PRIMITIVE_TYPES, DocField, DocPrimitiveValueType, DocRef } from './doc.types';

/** Checks if the value is a documentation reference field. */
export function isDocReferenceField(value: unknown): value is DocRef {
  return (value as DocRef)?.$name !== undefined;
}

/** Checks if the value is an array documentation field. */
export function isDocArrayField(value: unknown): value is DocField & { type: 'array' } {
  return (value as DocField).type === 'array';
}

/** Checks if the value is a primitive documentation field. */
export function isDocPrimitiveField(value: unknown): value is DocField & { type: DocPrimitiveValueType } {
  return isDocPrimitiveType((value as DocField).type);
}

/** Checks if the value is a primitive documentation type string. */
export function isDocPrimitiveType(value: unknown): value is DocPrimitiveValueType {
  return DOC_PRIMITIVE_TYPES.includes(value as DocPrimitiveValueType);
}
