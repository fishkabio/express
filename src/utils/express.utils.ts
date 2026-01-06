import express from 'express';

/** Shortcut for express.* types with no namespace: so the type can be found/imported by IDE. */
export type ExpressRequest = express.Request;
export type ExpressResponse = express.Response;
export type ExpressNextFunction = express.NextFunction;
export type ExpressApplication = express.Application;
export type ExpressFunction = (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => Promise<void>;
