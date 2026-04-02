import fs from "fs/promises";
import path from "path";
import { Building, Course } from "../Types";

let DATA_FILE: string;

export type Data = {
	course_offerings: any[];
	facilities: any[];
};

// 👇 called once from app.ts
export async function initFileStore(datadir: string) {
	await fs.mkdir(datadir, { recursive: true });

	DATA_FILE = path.join(datadir, "data.json");

	try {
		await fs.access(DATA_FILE);
	} catch {
		await fs.writeFile(
			DATA_FILE,
			JSON.stringify({
				course_offerings: [],
				facilities: [],
			}),
			"utf-8"
		);
	}
}

export async function writeCoursesToData(courses: Course[]): Promise<void> {
	const data = await readWholeData();
	const buildings = data.facilities;
	const newData = {
		course_offerings: courses,
		facilities: buildings,
	};
	await fs.writeFile(
		DATA_FILE,
		JSON.stringify(newData, null, 2), // pretty format
		"utf-8"
	);
}

export async function writeBuildingsToData(buildings: Building[]): Promise<void> {
	const data = await readWholeData();
	const courses = data.course_offerings;
	const newData = {
		course_offerings: courses,
		facilities: buildings,
	};
	await fs.writeFile(
		DATA_FILE,
		JSON.stringify(newData, null, 2), // pretty format
		"utf-8"
	);
}

export async function readWholeData(): Promise<Data> {
	const file = await fs.readFile(DATA_FILE, "utf-8");
	return JSON.parse(file) as Data;
}

type Kind = "course_offerings" | "facilities";
export async function readPartOfData(kind: Kind): Promise<Course[] | Building[]> {
	const data = await readWholeData();
	switch (kind) {
		case "course_offerings":
			return data.course_offerings;
		case "facilities":
			return data.facilities;
	}
}
