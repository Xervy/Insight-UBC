import {
	Generate404Error,
	MatchListLengthToLimit,
	RoomCreateError,
	UpdateListOfRoomsLinks,
	UpdateRoomLink,
} from "../../Helpers";
import { getAllBuildings } from "../../repositories/buildingRepository";
import { readPartOfData, writeBuildingsToData } from "../../storage/fileStore";
import { AlreadyExists, Building, Room } from "../../Types";
import { RESTfulError } from "../../utils/buildingTypes";
import { RetrieveAllQueryError } from "../../utils/validation";
import { Request } from "express";

interface GetBuildingsParams {
	limit: number;
	offset: number;
}

export async function getRooms(params: GetBuildingsParams, buildingID: string) {
	const { limit, offset } = params;
	const queryErrorMessage = RetrieveAllQueryError(limit, offset);
	if (typeof queryErrorMessage !== "boolean") {
		throw new RESTfulError(400, "Invalid request parameters", queryErrorMessage);
	}

	const allBuildings = await getAllBuildings();

	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}
	foundBuilding.rooms.sort((a, b) => a.id.localeCompare(b.id));
	const roomsWithCorrectLength = MatchListLengthToLimit(foundBuilding.rooms, limit);
	return {
		total: roomsWithCorrectLength.length,
		limit,
		offset,
		items: UpdateListOfRoomsLinks(roomsWithCorrectLength, foundBuilding),
	};
}

export async function getRoom(buildingID: string, roomID: string) {
	const allBuildings = (await readPartOfData("facilities")) as Building[];
	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}

	const rooms = foundBuilding.rooms;
	const foundRoom = rooms.find((r) => r.id == roomID);
	if (!foundRoom) {
		throw new RESTfulError(404, "Not found", Generate404Error("room", roomID));
	}
	return UpdateRoomLink(foundRoom, foundBuilding);
}

export async function putRoom(req: Request) {
	const body = req.body;
	const buildingID = req.params.buildingID;

	const errorMessage = RoomCreateError(body, buildingID);
	if (!(typeof errorMessage === "boolean")) {
		throw new RESTfulError(422, "Validation failed", errorMessage);
	}

	const allBuildings = (await readPartOfData("facilities")) as Building[];

	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}

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
		throw new AlreadyExists("Updated");
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
	return UpdateRoomLink(roomToAdd, foundBuilding);
}

export async function deleteRoom(req: Request) {
	const allBuildings = (await readPartOfData("facilities")) as Building[];
	const buildingID = req.params.buildingID;
	const roomID = req.params.roomID;

	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}

	const rooms = foundBuilding.rooms;
	const foundRoom = rooms.find((r) => r.id == roomID);
	if (!foundRoom) {
		throw new RESTfulError(404, "Not found", Generate404Error("room", roomID));
	}

	foundBuilding.rooms = foundBuilding.rooms.filter((r) => !(r.id == roomID));
	await writeBuildingsToData(allBuildings);
	return foundRoom;
}
