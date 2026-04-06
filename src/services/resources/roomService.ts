import { Generate404Error, MatchListLengthToLimit, UpdateListOfRoomsLinks } from "../../Helpers";
import { getAllBuildings } from "../../repositories/buildingRepository";
import { InvalidRequestParameters } from "../../Types";
import { RESTfulError } from "../../utils/buildingTypes";
import { RetrieveAllQueryError } from "../../utils/validation";

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
        items: UpdateListOfRoomsLinks(roomsWithCorrectLength, foundBuilding)
    }
}