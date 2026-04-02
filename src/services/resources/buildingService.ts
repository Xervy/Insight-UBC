import { getAllBuildings } from "../../repositories/buildingRepository";
import { RetrieveAllQueryError } from "../../utils/validation";
import { UpdateListOfBuildingsLinks } from "../../Helpers";

interface GetBuildingsParams {
    limit: number;
    offset: number;
};

export async function getBuildings(params: GetBuildingsParams) {
    const { limit, offset } = params;
    const queryErrorMessage = RetrieveAllQueryError(limit, offset);
    if (typeof queryErrorMessage !== "boolean") {
			throw new Error("queryErrorMessage") //TODO
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
        }
}