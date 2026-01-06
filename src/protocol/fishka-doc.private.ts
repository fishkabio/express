import { DOC_PRIMITIVE_TYPES, DocField, DocPrimitiveValueType, DocRef } from './fishka-doc.types';

/** Checks if the value is a documentation reference field. */
export function isFishkaDocReferenceField(value: unknown): value is DocRef {
  return (value as DocRef)?.$name !== undefined;
}

/** Checks if the value is an array documentation field. */
export function isFishkaDocArrayField(value: unknown): value is DocField & { type: 'array' } {
  return (value as DocField).type === 'array';
}

/** Checks if the value is a primitive documentation field. */
export function isFishkaDocPrimitiveField(value: unknown): value is DocField & { type: DocPrimitiveValueType } {
  return isFishkaDocPrimitiveType((value as DocField).type);
}

/** Checks if the value is a primitive documentation type string. */
export function isFishkaDocPrimitiveType(value: unknown): value is DocPrimitiveValueType {
  return DOC_PRIMITIVE_TYPES.includes(value as DocPrimitiveValueType);
}
