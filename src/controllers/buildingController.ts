import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";
import { BuildingCreateError, Generate404Error, UpdateBuildingLink } from "../Helpers";
import { AlreadyExists, Building, NotFoundError } from "../Types";
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
    try {
        const result = await buildingService.putBuilding(req.body, req.params.buildingID);
        res.status(201).json(result);
    } catch (err: any) {
        if (err instanceof AlreadyExists) {
            res.status(204).send();
            return;
        }
        res.status(422).json(BuildingCreateError(req.body));
    }
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
