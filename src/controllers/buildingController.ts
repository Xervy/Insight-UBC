import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";
import { BuildingCreateError, Generate404Error, UpdateBuildingLink } from "../Helpers";
import { Building, NotFoundError } from "../Types";
import { Console } from "console";
import { RetrieveAllQueryError } from "../utils/validation";
import { readPartOfData, writeBuildingsToData } from "../storage/fileStore";

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
		const result = await buildingService.getBuilding(req.params.buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		res.status(404).json(Generate404Error("building", (err as Error).message));
	}
}

export async function putBuilding(req: Request, res: Response) {
    const body = req.body;
            // SC 422
            const errorMessage = BuildingCreateError(body);
            if (!(typeof errorMessage === "boolean")) {
                res.status(422).json(errorMessage);
                return;
            }
    
            const allBuildings = (await readPartOfData("facilities")) as Building[];
    
            const buildingID = req.params.buildingID;
    
            // SC 204
            const alreadyExists = allBuildings.find((b) => b.id == buildingID);
            if (alreadyExists) {
                alreadyExists.name = body.name;
                alreadyExists.address = body.address;
                alreadyExists.lat = body.lat;
                alreadyExists.lon = body.lon;
                alreadyExists.rooms = [];
                await writeBuildingsToData(allBuildings);
                res.status(204).send();
                return;
            }
            // SC 201
            const makeBuilding = {
                id: buildingID,
                name: body.name,
                address: body.address,
                lat: body.lat,
                lon: body.lon,
                rooms: [],
            };
            allBuildings.push(makeBuilding);
            await writeBuildingsToData(allBuildings);
            res.status(201).json(UpdateBuildingLink(makeBuilding));
}

export async function deleteBuilding(req: Request, res: Response) {
    const allBuildings = (await readPartOfData("facilities")) as Building[];

		const buildingID = req.params.buildingID;
		const foundBuilding = allBuildings.find((b) => b.id == buildingID);

		if (!foundBuilding) {
			res.status(404).json(Generate404Error("building", buildingID));
			return;
		}
		const allBuildingsUpdated = allBuildings.filter((b) => !(b.id == buildingID));
		await writeBuildingsToData(allBuildingsUpdated);
		const { rooms, ...rest } = foundBuilding;
		res.status(200).json({
			rooms: rooms.length,
			...rest,
		});
}
