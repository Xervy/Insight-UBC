import { getAllBuildings } from "../../repositories/buildingRepository";
import { RetrieveAllQueryError } from "../../utils/validation";
import { BuildingCreateError, Generate404Error, UpdateBuildingLink, UpdateListOfBuildingsLinks } from "../../Helpers";
import { writeBuildingsToData } from "../../storage/fileStore";
import { AlreadyExists } from "../../Types";
import { RESTfulError } from "../../utils/buildingTypes";

interface GetBuildingsParams {
	limit: number;
	offset: number;
}

export async function getBuildings(params: GetBuildingsParams) {
	const { limit, offset } = params;
	const queryErrorMessage = RetrieveAllQueryError(limit, offset);
	if (typeof queryErrorMessage !== "boolean") {
		throw new RESTfulError(400, "Invalid request parameters", queryErrorMessage);
	}

	const allBuildings = await getAllBuildings();
	const buildingsWithLinks = UpdateListOfBuildingsLinks(allBuildings);
	buildingsWithLinks.sort((a, b) => a.id.localeCompare(b.id));
	const items = buildingsWithLinks.slice(offset, offset + limit);

	return {
		total: allBuildings.length,
		limit,
		offset,
		items,
	};
}

export async function getBuilding(buildingID: string) {
	const allBuildings = await getAllBuildings();
	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}
	return UpdateBuildingLink(foundBuilding);
}

export async function putBuilding(body: any, buildingID: string) {
	const errorMessage = BuildingCreateError(body);
	if (!(typeof errorMessage === "boolean")) {
		throw new RESTfulError(422, "Validation failed", errorMessage);
	}

	const allBuildings = await getAllBuildings();
	const alreadyExists = allBuildings.find((b) => b.id == buildingID);
	if (alreadyExists) {
		alreadyExists.name = body.name;
		alreadyExists.address = body.address;
		alreadyExists.lat = body.lat;
		alreadyExists.lon = body.lon;
		alreadyExists.rooms = [];
		await writeBuildingsToData(allBuildings);
		throw new AlreadyExists("send 204");
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
	return UpdateBuildingLink(makeBuilding);
}

export async function deleteBuilding(buildingID: string) {
	const allBuildings = await getAllBuildings();
	const foundBuilding = allBuildings.find((b) => b.id == buildingID);
	if (!foundBuilding) {
		throw new RESTfulError(404, "Not found", Generate404Error("building", buildingID));
	}
	const allBuildingsUpdated = allBuildings.filter((b) => !(b.id == buildingID));
	await writeBuildingsToData(allBuildingsUpdated);
	const { rooms, ...rest } = foundBuilding;
	return {
		rooms: rooms.length,
		...rest,
	};
}
