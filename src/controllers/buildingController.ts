import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";
import { Generate404Error } from "../Helpers";
import { NotFoundError } from "../Types";
import { Console } from "console";
import { RetrieveAllQueryError } from "../utils/validation";

export async function getBuildings(req: Request, res: Response) {
	try {
		const result = await buildingService.getBuildings({
			limit: (req as any).pagination.limit,
			offset: (req as any).pagination.offset,
		});

		res.status(200).json(result);
	} catch (err: any) {
		res.status(400).json(RetrieveAllQueryError((req as any).pagination.limit, (req as any).pagination.offset));
	}
}

export async function getBuilding(req: Request, res: Response) {
	try {
		const buildingID = req.params.buildingID;
		const result = await buildingService.getBuilding(buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		res.status(404).json(Generate404Error("building", (err as Error).message));
	}
}
