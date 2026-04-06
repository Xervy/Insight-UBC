import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";
import { AlreadyExists } from "../Types";
import * as roomService from "../services/resources/roomService";
import { RESTfulError } from "../utils/buildingTypes";

export async function getBuildings(req: Request, res: Response) {
	try {
		const result = await buildingService.getBuildings({
			limit: (req as any).pagination.limit,
			offset: (req as any).pagination.offset,
		});

		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function getBuilding(req: Request, res: Response) {
	try {
		const result = await buildingService.getBuilding(req.params.buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function putBuilding(req: Request, res: Response) {
	try {
		const result = await buildingService.putBuilding(req.body, req.params.buildingID);
		res.status(201).json(result);
	} catch (err: any) {
		if (err instanceof AlreadyExists) {
			res.status(204).send();
		} else if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function deleteBuilding(req: Request, res: Response) {
	try {
		const result = await buildingService.deleteBuilding(req.params.buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function getRooms(req: Request, res: Response) {
	try {
		const result = await roomService.getRooms(
			{
				limit: (req as any).pagination.limit,
				offset: (req as any).pagination.offset,
			},
			req.params.buildingID
		);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function getRoom(req: Request, res: Response) {
	try {
		const result = await roomService.getRoom(req.params.buildingID, req.params.roomID);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function putRoom(req: Request, res: Response) {
	try {
		const result = await roomService.putRoom(req);
		res.status(201).json(result);
	} catch (err: any) {
		if (err instanceof AlreadyExists) {
			res.status(204).send();
		} else if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}

export async function deleteRoom(req: Request, res: Response) {
	try {
		const result = await roomService.deleteRoom(req);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof RESTfulError) {
			res.status(err.status).json(err.details);
		}
	}
}
