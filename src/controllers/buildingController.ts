import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";

export async function getBuildings(req: Request, res: Response) {
    try {
        const { limit, offset } = req.query;

        const result = await buildingService.getBuildings({
            limit: Number(limit),
            offset: Number(offset)
        });

        res.status(200).json(result);
    } catch (err: any) {
        res.status(400).json(err);
    }

}