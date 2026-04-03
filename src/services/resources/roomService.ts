import { MatchListLengthToLimit, UpdateListOfRoomsLinks } from "../../Helpers";
import { getAllBuildings } from "../../repositories/buildingRepository";
import { InvalidRequestParameters, NotFoundError } from "../../Types";
import { RetrieveAllQueryError } from "../../utils/validation";

interface GetBuildingsParams {
    limit: number;
    offset: number;
}

export async function getRooms(params: GetBuildingsParams, buildingID: string) {
    const { limit, offset } = params;
    const queryErrorMessage = RetrieveAllQueryError(limit, offset);
    if (typeof queryErrorMessage !== "boolean") {
        throw new InvalidRequestParameters("invalid request parameters");
    }

    const allBuildings = await getAllBuildings();

    const foundBuilding = allBuildings.find((b) => b.id == buildingID);
    if (!foundBuilding) {
        throw new NotFoundError("404");
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