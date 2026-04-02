import { Request, Response, NextFunction } from "express";

export function parsePagination(req: Request, res: Response, next: NextFunction) {
	let limit = parseInt((req.query.limit as string) ?? 100);
	let offset = parseInt((req.query.offset as string) ?? 0);

	(req as any).pagination = { limit, offset };

	next();
}
