import { readPartOfData } from "../storage/fileStore";
import { Building } from "../Types"

export async function getAllBuildings(): Promise<Building[]> {
    return (await readPartOfData("facilities")) as Building[];
}