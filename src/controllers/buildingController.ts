import { Request, Response } from "express";
import * as buildingService from "../services/resources/buildingService";
import { BuildingCreateError, Generate404Error, RoomCreateError, UpdateRoomLink } from "../Helpers";
import { AlreadyExists, Building, InvalidRequestParameters, Room } from "../Types";
import { RetrieveAllQueryError } from "../utils/validation";
import * as roomService from "../services/resources/roomService"
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
	try {
		const result = await buildingService.deleteBuilding(req.params.buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		res.status(404).json(Generate404Error("building", req.params.buildingID));
	}
}

export async function getRooms(req: Request, res: Response) {
	try {
		const result = await roomService.getRooms({
			limit: (req as any).pagination.limit,
			offset: (req as any).pagination.offset,
		}, req.params.buildingID);
		res.status(200).json(result);
	} catch (err: any) {
		if (err instanceof InvalidRequestParameters) {
			res.status(400).json(RetrieveAllQueryError((req as any).pagination.limit, (req as any).pagination.offset));
			return 
		}
		res.status(404).json(Generate404Error("building", req.params.buildingID));
	}
}


export async function getRoom(req: Request, res: Response) {
	const allBuildings = (await readPartOfData("facilities")) as Building[];
	
			const buildingID = req.params.buildingID;
			const foundBuilding = allBuildings.find((b) => b.id == buildingID);
			if (!foundBuilding) {
				res.status(404).json(Generate404Error("building", buildingID));
				return;
			}
	
			const rooms = foundBuilding.rooms;
			const roomID = req.params.roomID;
			const foundRoom = rooms.find((r) => r.id == roomID);
			if (!foundRoom) {
				res.status(404).json(Generate404Error("room", roomID));
				return;
			}
	
			res.status(200).json(UpdateRoomLink(foundRoom, foundBuilding));
}

export async function putRoom(req: Request, res: Response) {
	const body = req.body;
			const buildingID = req.params.buildingID;
	
			// SC 422
			const errorMessage = RoomCreateError(body, buildingID);
			if (!(typeof errorMessage === "boolean")) {
				res.status(422).json(errorMessage);
				return;
			}
	
			const allBuildings = (await readPartOfData("facilities")) as Building[];
	
			// SC 404
			const foundBuilding = allBuildings.find((b) => b.id == buildingID);
			if (!foundBuilding) {
				res.status(404).json(Generate404Error("building", buildingID));
				return;
			}
	
			// SC 204
			const rooms = foundBuilding.rooms;
			const roomID = req.params.roomID;
			const foundRoom = rooms.find((r) => r.id == roomID);
			if (foundRoom) {
				foundRoom.number = body.number;
				foundRoom.type = body.type;
				foundRoom.furniture = body.furniture;
				foundRoom.href = body.href;
				foundRoom.seats = body.seats;
	
				await writeBuildingsToData(allBuildings);
				res.status(204).send();
				return;
			}
			// SC 201
			const roomToAdd = {
				id: roomID,
				building: body.building,
				number: body.number,
				type: body.type,
				furniture: body.furniture,
				href: body.href,
				seats: body.seats,
			} as Room;
			rooms.push(roomToAdd);
			await writeBuildingsToData(allBuildings);
			res.status(201).json(UpdateRoomLink(roomToAdd, foundBuilding));
}

export async function deleteRoom(req: Request, res: Response) {
	const allBuildings = (await readPartOfData("facilities")) as Building[];

		const buildingID = req.params.buildingID;
		const roomID = req.params.roomID;

		// SC 404
		const foundBuilding = allBuildings.find((b) => b.id == buildingID);
		if (!foundBuilding) {
			res.status(404).json(Generate404Error("building", buildingID));
			return;
		}

		const rooms = foundBuilding.rooms;
		const foundRoom = rooms.find((r) => r.id == roomID);
		if (!foundRoom) {
			res.status(404).json(Generate404Error("room", roomID));
			return;
		}

		foundBuilding.rooms = foundBuilding.rooms.filter((r) => !(r.id == roomID));
		await writeBuildingsToData(allBuildings);
		res.status(200).json(foundRoom);
}