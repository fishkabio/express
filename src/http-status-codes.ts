/** The request has succeeded (200) */
export const HTTP_OK = 200;

/** The request has been fulfilled, and a new resource is created (201) */
export const HTTP_CREATED = 201;

/** The request has been accepted for processing, but the processing is not yet complete (202) */
export const HTTP_ACCEPTED = 202;

/** The server successfully processed the request, and is not returning any content (204) */
export const HTTP_NO_CONTENT = 204;

/** The request has been successfully processed, but is returning no content (205) */
export const HTTP_RESET_CONTENT = 205;

/** The server is delivering only part of the resource due to a range header sent by the client (206) */
export const HTTP_PARTIAL_CONTENT = 206;

/** The IM used the server processed a request successfully, but the response is transformed (226) */
export const HTTP_IM_USED = 226;

/** The resource has been moved permanently to a new URL (301) */
export const HTTP_MOVED_PERMANENTLY = 301;

/** The resource is available at a different URL (302) */
export const HTTP_FOUND = 302;

/** The resource has not been modified since the last request (304) */
export const HTTP_NOT_MODIFIED = 304;

/** The server could not understand the request due to invalid syntax (400) */
export const HTTP_BAD_REQUEST = 400;

/** The client must authenticate itself to get the requested response (401) */
export const HTTP_UNAUTHORIZED = 401;

/** The client does not have access rights to the content (403) */
export const HTTP_FORBIDDEN = 403;

/** The server cannot find the requested resource (404) */
export const HTTP_NOT_FOUND = 404;

/** The request method is known by the server but is not supported by the target resource (405) */
export const HTTP_METHOD_NOT_ALLOWED = 405;

/** The client must authenticate using a proxy (407) */
export const HTTP_PROXY_AUTHENTICATION_REQUIRED = 407;

/** The server timed out waiting for the request (408) */
export const HTTP_REQUEST_TIMEOUT = 408;

/** The request conflicts with the current state of the server (409) */
export const HTTP_CONFLICT = 409;

/** The resource requested is no longer available and will not be available again (410) */
export const HTTP_GONE = 410;

/** The request does not meet the preconditions that the server requires (412) */
export const HTTP_PRECONDITION_FAILED = 412;

/** The client sent a request that is too large for the server to process (413) */
export const HTTP_PAYLOAD_TOO_LARGE = 413;

/** The URI requested by the client is too long for the server to process (414) */
export const HTTP_URI_TOO_LONG = 414;

/** The media format of the requested data is not supported by the server (415) */
export const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;

/** The range specified by the client cannot be fulfilled (416) */
export const HTTP_RANGE_NOT_SATISFIABLE = 416;

/** The expectation given in the request header could not be met by the server (417) */
export const HTTP_EXPECTATION_FAILED = 417;

/** The server refuses to brew coffee because it is a teapot (418) - an Easter egg from RFC 2324 */
export const HTTP_IM_A_TEAPOT = 418;

/** The request was well-formed but was unable to be followed due to semantic errors (422) */
export const HTTP_UNPROCESSABLE_ENTITY = 422;

/** The resource that is being accessed is locked (423) */
export const HTTP_LOCKED = 423;

/** The resource requested is dependent on another resource that has failed (424) */
export const HTTP_FAILED_DEPENDENCY = 424;

/** The server is unwilling to risk processing a request that might be replayed (425) */
export const HTTP_TOO_EARLY = 425;

/** The client needs to upgrade its protocol (426) */
export const HTTP_UPGRADE_REQUIRED = 426;

/** The server requires the request to be conditional (428) */
export const HTTP_PRECONDITION_REQUIRED = 428;

/** The client has sent too many requests in a given amount of time (429) */
export const HTTP_TOO_MANY_REQUESTS = 429;

/** The request header fields are too large (431) */
export const HTTP_REQUEST_HEADER_FIELDS_TOO_LARGE = 431;

/** The client closed the connection with the server before the request was completed (444) */
export const HTTP_CONNECTION_CLOSED_WITHOUT_RESPONSE = 444;

/** The client requested an unavailable legal action (451) */
export const HTTP_UNAVAILABLE_FOR_LEGAL_REASONS = 451;

/** The server encountered an internal error and was unable to complete the request (500) */
export const HTTP_INTERNAL_SERVER_ERROR = 500;

/** The request method is not supported by the server and cannot be handled (501) */
export const HTTP_NOT_IMPLEMENTED = 501;

/** The server, while acting as a gateway or proxy, received an invalid response from the upstream server (502) */
export const HTTP_BAD_GATEWAY = 502;

/** The server is not ready to handle the request, typically due to temporary overload or maintenance (503) */
export const HTTP_SERVICE_UNAVAILABLE = 503;

/** The server, while acting as a gateway or proxy, did not get a response in time from the upstream server (504) */
export const HTTP_GATEWAY_TIMEOUT = 504;

/**
 * An object containing common HTTP status codes.
 * These constants can be used to improve code readability and maintainability.
 * @deprecated Use individual HTTP_* constants for better tree-shaking
 */
export const HttpStatusCode = {
  /** The request has succeeded (200) */
  OK: HTTP_OK,

  /** The request has been fulfilled, and a new resource is created (201) */
  CREATED: HTTP_CREATED,

  /** The request has been accepted for processing, but the processing is not yet complete (202) */
  ACCEPTED: HTTP_ACCEPTED,

  /** The server successfully processed the request, and is not returning any content (204) */
  NO_CONTENT: HTTP_NO_CONTENT,

  /** The request has been successfully processed, but is returning no content (205) */
  RESET_CONTENT: HTTP_RESET_CONTENT,

  /** The server is delivering only part of the resource due to a range header sent by the client (206) */
  PARTIAL_CONTENT: HTTP_PARTIAL_CONTENT,

  /** The IM used the server processed a request successfully, but the response is transformed (226) */
  IM_USED: HTTP_IM_USED,

  /** The resource has been moved permanently to a new URL (301) */
  MOVED_PERMANENTLY: HTTP_MOVED_PERMANENTLY,

  /** The resource is available at a different URL (302) */
  FOUND: HTTP_FOUND,

  /** The resource has not been modified since the last request (304) */
  NOT_MODIFIED: HTTP_NOT_MODIFIED,

  /** The server could not understand the request due to invalid syntax (400) */
  BAD_REQUEST: HTTP_BAD_REQUEST,

  /** The client must authenticate itself to get the requested response (401) */
  UNAUTHORIZED: HTTP_UNAUTHORIZED,

  /** The client does not have access rights to the content (403) */
  FORBIDDEN: HTTP_FORBIDDEN,

  /** The server cannot find the requested resource (404) */
  NOT_FOUND: HTTP_NOT_FOUND,

  /** The request method is known by the server but is not supported by the target resource (405) */
  METHOD_NOT_ALLOWED: HTTP_METHOD_NOT_ALLOWED,

  /** The client must authenticate using a proxy (407) */
  PROXY_AUTHENTICATION_REQUIRED: HTTP_PROXY_AUTHENTICATION_REQUIRED,

  /** The server timed out waiting for the request (408) */
  REQUEST_TIMEOUT: HTTP_REQUEST_TIMEOUT,

  /** The request conflicts with the current state of the server (409) */
  CONFLICT: HTTP_CONFLICT,

  /** The resource requested is no longer available and will not be available again (410) */
  GONE: HTTP_GONE,

  /** The request does not meet the preconditions that the server requires (412) */
  PRECONDITION_FAILED: HTTP_PRECONDITION_FAILED,

  /** The client sent a request that is too large for the server to process (413) */
  PAYLOAD_TOO_LARGE: HTTP_PAYLOAD_TOO_LARGE,

  /** The URI requested by the client is too long for the server to process (414) */
  URI_TOO_LONG: HTTP_URI_TOO_LONG,

  /** The media format of the requested data is not supported by the server (415) */
  UNSUPPORTED_MEDIA_TYPE: HTTP_UNSUPPORTED_MEDIA_TYPE,

  /** The range specified by the client cannot be fulfilled (416) */
  RANGE_NOT_SATISFIABLE: HTTP_RANGE_NOT_SATISFIABLE,

  /** The expectation given in the request header could not be met by the server (417) */
  EXPECTATION_FAILED: HTTP_EXPECTATION_FAILED,

  /** The server refuses to brew coffee because it is a teapot (418) - an Easter egg from RFC 2324 */
  IM_A_TEAPOT: HTTP_IM_A_TEAPOT,

  /** The request was well-formed but was unable to be followed due to semantic errors (422) */
  UNPROCESSABLE_ENTITY: HTTP_UNPROCESSABLE_ENTITY,

  /** The resource that is being accessed is locked (423) */
  LOCKED: HTTP_LOCKED,

  /** The resource requested is dependent on another resource that has failed (424) */
  FAILED_DEPENDENCY: HTTP_FAILED_DEPENDENCY,

  /** The server is unwilling to risk processing a request that might be replayed (425) */
  TOO_EARLY: HTTP_TOO_EARLY,

  /** The client needs to upgrade its protocol (426) */
  UPGRADE_REQUIRED: HTTP_UPGRADE_REQUIRED,

  /** The server requires the request to be conditional (428) */
  PRECONDITION_REQUIRED: HTTP_PRECONDITION_REQUIRED,

  /** The client has sent too many requests in a given amount of time (429) */
  TOO_MANY_REQUESTS: HTTP_TOO_MANY_REQUESTS,

  /** The request header fields are too large (431) */
  REQUEST_HEADER_FIELDS_TOO_LARGE: HTTP_REQUEST_HEADER_FIELDS_TOO_LARGE,

  /** The client closed the connection with the server before the request was completed (444) */
  CONNECTION_CLOSED_WITHOUT_RESPONSE: HTTP_CONNECTION_CLOSED_WITHOUT_RESPONSE,

  /** The client requested an unavailable legal action (451) */
  UNAVAILABLE_FOR_LEGAL_REASONS: HTTP_UNAVAILABLE_FOR_LEGAL_REASONS,

  /** The server encountered an internal error and was unable to complete the request (500) */
  INTERNAL_SERVER_ERROR: HTTP_INTERNAL_SERVER_ERROR,

  /** The request method is not supported by the server and cannot be handled (501) */
  NOT_IMPLEMENTED: HTTP_NOT_IMPLEMENTED,

  /** The server, while acting as a gateway or proxy, received an invalid response from the upstream server (502) */
  BAD_GATEWAY: HTTP_BAD_GATEWAY,

  /** The server is not ready to handle the request, typically due to temporary overload or maintenance (503) */
  SERVICE_UNAVAILABLE: HTTP_SERVICE_UNAVAILABLE,

  /** The server, while acting as a gateway or proxy, did not get a response in time from the upstream server (504) */
  GATEWAY_TIMEOUT: HTTP_GATEWAY_TIMEOUT,
};

/**
 * Returns the reason phrase corresponding to the given HTTP status code.
 * This is useful for converting status codes into human-readable messages.
 *
 * @param statusCode - The HTTP status code for which to get the reason phrase.
 * @returns The reason phrase associated with the given status code, or "Unknown Status Code" if the status code is not recognized.
 */
export const getHttpStatusCodeReasonPhrase = (statusCode: number): string => {
  const phrases: { [key: number]: string } = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    226: 'IM Used',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    444: 'Connection Closed Without Response',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return phrases[statusCode] || 'Unknown Status Code';
};
