import { validateHeaderName } from "http";
import {
	Building,
	Comparator,
	Course,
	LogicalComparator,
	MField,
	MFieldComparator,
	NegationComparator,
	Room,
	SearchEBNFError,
	SearchRequestBody,
	Section,
	SField,
	SFieldComparator,
} from "./Types";
import { off } from "process";

// Takes the list of courses, and returns the list of courses
// where the courses have links to themselves and their sections
export function UpdateListOfCoursesLinks(courses: Course[]) {
	let filteredCourses = [];
	for (let i = 0; i < courses.length; i++) {
		const pushit = UpdateCourseLink(courses[i]);
		filteredCourses.push(pushit);
	}

	return filteredCourses;
}

// Takes a course, returns same course but with added self and section links
export function UpdateCourseLink(course: Course) {
	const self = `/api/v1/courses/${course.id}`;
	const sections = `/api/v1/courses/${course.id}/sections`;

	const courseToSend = {
		id: course.id,
		title: course.title,
		dept: course.dept,
		code: course.code,
		links: {
			self: self,
			sections: sections,
		},
	};

	return courseToSend;
}

// Returns the errorMessage for creating a course,
// Returns false if there is no error
export function CourseCreateError(body: any) {
	const errorMessage = {
		error: "Validation failed",
		fields: {} as any,
	};
	let isError = false;

	if (body.title == undefined) {
		errorMessage.fields["title"] = "required but missing";
		isError = true;
	} else if (!(typeof body.title === "string")) {
		errorMessage.fields["title"] = "expected a string";
		isError = true;
	}

	if (body.dept == undefined) {
		errorMessage.fields["dept"] = "required but missing";
		isError = true;
	} else if (!(typeof body.dept === "string")) {
		errorMessage.fields["dept"] = "expected a string";
		isError = true;
	}

	if (body.code == undefined) {
		errorMessage.fields["code"] = "required but missing";
		isError = true;
	} else if (!(typeof body.code === "string")) {
		errorMessage.fields["code"] = "expected a string";
		isError = true;
	}

	if (isError) {
		return errorMessage;
	}
	return isError;
}

// Takes the list of sections, and returns the list of sections
// where the sections have links to themselves and their course
export function UpdateListOfSectionsLinks(sections: Section[], course: Course) {
	let filteredCourses = [];
	for (let i = 0; i < sections.length; i++) {
		const pushit = UpdateSectionLink(sections[i], course);
		filteredCourses.push(pushit);
	}

	return filteredCourses;
}

// Takes a section, returns same section but with added self and course links
export function UpdateSectionLink(section: Section, course: Course) {
	const self = `/api/v1/courses/${course.id}/sections/${section.id}`;
	const courselink = `/api/v1/courses/${course.id}`;

	const courseToSend = {
		id: section.id,
		instructor: section.instructor,
		year: section.year,
		avg: section.avg,
		pass: section.pass,
		fail: section.fail,
		audit: section.audit,
		links: {
			self: self,
			course: courselink,
		},
	};

	return courseToSend;
}

// Returns the errorMessage for creating a section,
// Returns false if there is no error
export function SectionCreateError(body: any) {
	const errorMessage = {
		error: "Validation failed",
		fields: {} as any,
	};
	let isError = false;

	if (body.instructor == undefined) {
		errorMessage.fields["instructor"] = "required but missing";
		isError = true;
	} else if (!(typeof body.instructor === "string")) {
		errorMessage.fields["instructor"] = "expected a string";
		isError = true;
	}

	if (body.year == undefined) {
		errorMessage.fields["year"] = "required but missing";
		isError = true;
	} else if (!(typeof body.year === "number")) {
		errorMessage.fields["year"] = "expected a number between 1900 and 2099";
		isError = true;
	} else if (body.year < 1900 || body.year > 2099 || !Number.isInteger(body.year)) {
		errorMessage.fields["year"] = "expected a number between 1900 and 2099";
		isError = true;
	}

	if (body.avg == undefined) {
		errorMessage.fields["avg"] = "required but missing";
		isError = true;
	} else if (!(typeof body.avg === "number")) {
		errorMessage.fields["avg"] = "expected a number between 0 and 100";
		isError = true;
	} else if (body.avg < 0 || body.avg > 100) {
		errorMessage.fields["avg"] = "expected a number between 0 and 100";
		isError = true;
	}

	if (body.pass == undefined) {
		errorMessage.fields["pass"] = "required but missing";
		isError = true;
	} else if (!(typeof body.pass === "number")) {
		errorMessage.fields["pass"] = "expected a number >= 0";
		isError = true;
	} else if (body.pass < 0 || !Number.isInteger(body.pass)) {
		errorMessage.fields["pass"] = "expected a number >= 0";
		isError = true;
	}

	if (body.fail == undefined) {
		errorMessage.fields["fail"] = "required but missing";
		isError = true;
	} else if (!(typeof body.fail === "number")) {
		errorMessage.fields["fail"] = "expected a number >= 0";
		isError = true;
	} else if (body.fail < 0 || !Number.isInteger(body.fail)) {
		errorMessage.fields["fail"] = "expected a number >= 0";
		isError = true;
	}

	if (body.audit == undefined) {
		errorMessage.fields["audit"] = "required but missing";
		isError = true;
	} else if (!(typeof body.audit === "number")) {
		errorMessage.fields["audit"] = "expected a number >= 0";
		isError = true;
	} else if (body.audit < 0 || !Number.isInteger(body.audit)) {
		errorMessage.fields["audit"] = "expected a number >= 0";
		isError = true;
	}

	if (isError) {
		return errorMessage;
	}
	return isError;
}

// Generates a unique id for bulk uploads
export function generateSectionID() {
	return Date.now();
}

// Formats Error Message for SC 400
// for Search
export function EBNFError(message: string) {
	const errorMes = {
		error: "Invalid query",
		message: message,
	};
	return errorMes;
}

// Check if body produces a 422 error
// return error message or false
export function SearchValidationError(body: any) {
	let isError = false;
	const errorMes = {
		error: "Validation failed",
		fields: {} as any,
	};

	if (!body) {
		errorMes.fields = {
			kind: "required but missing",
			query: "required but missing"
		}
		return errorMes;
	}

	if (body.kind == undefined) {
		errorMes.fields["kind"] = "required but missing";
		isError = true;
	} else if (!(body.kind == "course_offerings")) {
		errorMes.fields["kind"] = "expected to be course_offerings";
		isError = true;
	}

	if (body.query == undefined) {
		errorMes.fields["query"] = "required but missing";
		isError = true;
	} else if (!(typeof body.query == "object")) {
		errorMes.fields["query"] = "expected an object";
		isError = true;
	}

	if (isError) return errorMes;
	return isError;
}

function SearchAND(comparator: LogicalComparator, dataAsColumns: any[]): any[] {
	const fitsCriteria = [];
	const subComparators = comparator.AND!;
	if (subComparators.length <= 1) {
		throw new SearchEBNFError("AND must be a non-empty array of FILTER objects");
	}
	if (subComparators.some((cmp) => !isFilterObject(Object.keys(cmp)[0]))) {
		throw new SearchEBNFError("AND must be a non-empty array of FILTER objects");
	}
	const searchResults = subComparators.map((cmp) => Search(cmp, dataAsColumns));
	const indexer = searchResults.pop();
	// Look through the Offerings of One array from the 2D Array of searchResults
	// Filter through that array and the lamda function for filter is:
	// If you find any array from the rest of search Results that doesn't include the offering,
	// Return False
	const allMatches =
		indexer?.filter((offer) => {
			return !searchResults.some((otherSearch) => !otherSearch.includes(offer));
		}) || [];

	return allMatches;
}

function SearchOR(comparator: LogicalComparator, dataAsColumns: any[]): any[] {
	let fitsCriteria = [];
	const subComparators = comparator.OR!;
	if (subComparators.length <= 1) {
		throw new SearchEBNFError("OR must be a non-empty array of FILTER objects");
	}
	if (subComparators.some((cmp) => !isFilterObject(Object.keys(cmp)[0]))) {
		throw new SearchEBNFError("OR must be a non-empty array of FILTER objects");
	}
	const searchResults = subComparators.map((cmp) => Search(cmp, dataAsColumns));
	fitsCriteria = searchResults?.pop() || [];
	for (const offerList of searchResults) {
		for (const offer of offerList) {
			if (!fitsCriteria.includes(offer)) {
				fitsCriteria.push(offer);
			}
		}
	}
	return fitsCriteria;
}

function SearchMath(
	comparator: MFieldComparator,
	dataAsColumns: any[],
	operator: (fromData: number, fromRequest: number) => boolean,
	mathType: "LT" | "GT" | "EQ"
): any[] {
	// Exists because it was called from a switch case
	const cmp = comparator[mathType]!;
	const fitsCriteria = [];
	const allFields = Object.keys(cmp);
	if (allFields.length == 0 || allFields.length > 1) {
		throw new SearchEBNFError(`${mathType} must be an object with one mfield of type number`);
	}
	const fieldOfInterest = allFields[0];
	const valToCompare = cmp[fieldOfInterest]!; // Object.values(lt)[0];

	if (typeof valToCompare != 'number') {
		throw new SearchEBNFError(`${mathType} must be an object with one mfield of type number`);
	}
	for (const obj of dataAsColumns) {
		if (operator(obj[fieldOfInterest], valToCompare)) {
			fitsCriteria.push(obj);
		}
	}
	return fitsCriteria;
}

function SearchIS(comparator: SFieldComparator, dataAsColumns: any[]): any[] {
	const fitsCriteria = [];
	const is = (comparator as SFieldComparator).IS!;
	const allFields = Object.keys(is);
	if (allFields.length == 0 || allFields.length > 1) {
		throw new SearchEBNFError("IS must be an object with one sfield of type string");
	}

	const fieldOfInterest = allFields[0];
	const stringToMatch = is[fieldOfInterest]!;

	if (typeof stringToMatch != "string") {
		throw new SearchEBNFError("IS must be an object with one sfield of type string");
	}

	if (stringToMatch.includes("\*")) {
		const strLen = stringToMatch.length;
		if (stringToMatch.startsWith("\*") && stringToMatch.endsWith("\*")) {
			const minusWildcards = stringToMatch.substring(1, strLen - 2);
			for (const obj of dataAsColumns) {
				if (obj[fieldOfInterest].includes(minusWildcards)) {
					fitsCriteria.push(obj);
				}
			}
		} else if (stringToMatch.startsWith("\*")) {
			const minusWildcards = stringToMatch.substring(1);

			for (const obj of dataAsColumns) {
				if (obj[fieldOfInterest].endsWith(minusWildcards)) {
					fitsCriteria.push(obj);
				}
			}
		} else if (stringToMatch.endsWith("\*")) {
			const minusWildcards = stringToMatch.substring(0, strLen - 2);
			for (const obj of dataAsColumns) {
				if (obj[fieldOfInterest].startsWith(minusWildcards)) {
					fitsCriteria.push(obj);
				}
			}
		} else {
			throw new SearchEBNFError("IS asterisks can only be first or last character");
		}
	}
	for (const obj of dataAsColumns) {
		if (obj[fieldOfInterest] == stringToMatch) {
			fitsCriteria.push(obj);
		}
	}

	return fitsCriteria;
}

function SearchNOT(comparator: NegationComparator, dataAsColumns: any[]): any[] {
	const not = (comparator as NegationComparator).NOT!;
	const allFields = Object.keys(not);
	if (allFields.length == 0 || !isFilterObject(allFields[0]) || allFields.length > 1) {
		throw new SearchEBNFError("NOT must be a FILTER object");
	}
	const dontAdd = Search(not, dataAsColumns) as any[];
	const filtered = dataAsColumns.filter((offer) => !dontAdd.includes(offer));

	return filtered;
}

function isFilterObject(str: string) {
	const acceptableNotValues = ["AND", "OR", "IS", "LT", "GT", "EQ", "NOT"];
	return acceptableNotValues.includes(str);
}

// Given a comparator, return the filtered list of courses
// that match what the comparator asked for
export function Search(comparator: Comparator, dataAsColumns: any[]): any[] {
	if (Object.keys(comparator).length == 0) {
		return dataAsColumns;
	}

	const cmp = Object.keys(comparator);
	switch (cmp[0]) {
		case "AND":
			return SearchAND(comparator as LogicalComparator, dataAsColumns);
		case "OR":
			return SearchOR(comparator as LogicalComparator, dataAsColumns);
		case "LT":
			return SearchMath(comparator as MFieldComparator, dataAsColumns, (a, b) => a < b, "LT");
		case "GT":
			return SearchMath(comparator as MFieldComparator, dataAsColumns, (a, b) => a > b, "GT");
		case "EQ":
			return SearchMath(comparator as MFieldComparator, dataAsColumns, (a, b) => a == b, "EQ");
		case "IS":
			return SearchIS(comparator as SFieldComparator, dataAsColumns);
		case "NOT":
			return SearchNOT(comparator as NegationComparator, dataAsColumns);
		default:
			// TODO
			throw new Error("oh no, not supposed to get here");
	}
}

// Turns the list of Courses into just a list of objects with the fields in columns
// and returns it (Doesnt change original list)
export function OfferingFieldsForColumn(data: Course[], columns: (SField & MField)[]) {
	const cleanedData = [];
	for (const course of data) {
		for (const section of course.sections) {
			let toPush = {} as any;
			for (const col of columns) {
				switch (col) {
					case "title":
					case "dept":
					case "code":
						toPush[col] = course[col];
						break;
					case "instructor":
					case "year":
					case "avg":
					case "pass":
					case "fail":
					case "audit":
						toPush[col] = section[col];
						break;
				}
			}
			cleanedData.push(toPush);
		}
	}
	return cleanedData;
}

// Takes a list of buildings and returns the list of buildings without
// the parameter "rooms", instead it has a "links" parameter to itself and rooms 
export function UpdateListOfBuildingsLinks(buildings: Building[]) {
	// return buildings.map((building) => {
	// 	UpdateBuildingLink(building);
	// });									My Attempt to Make Ben Happy

	const buildingsWithLinks = [];
	for (let i = 0; i < buildings.length; i++) {
		const updatedBuilding = UpdateBuildingLink(buildings[i]);
		buildingsWithLinks.push(updatedBuilding);
	}
	return buildingsWithLinks;
}

// Takes a building and returns it with links to self and rooms
// Instead of a list of Rooms
export function UpdateBuildingLink(building: Building) {
	const self = `/api/v2/buildings/${building.id}`;
	const rooms = `/api/v2/buildings/${building.id}/rooms`;
	return {
		id: building.id,
		name: building.name,
		address: building.address,
		lat: building.lat,
		lon: building.lon,
		links: {
			self: self,
			rooms: rooms
		}
	};
}

export function UpdateListOfRoomsLinks(rooms: Room[], building: Building) {
	const roomsWithLinks = [];
	for (let i = 0; i < rooms.length; i++) {
		const updatedRoom = UpdateRoomLink(rooms[i], building);
		roomsWithLinks.push(updatedRoom);
	}
	return roomsWithLinks;
}

export function UpdateRoomLink(room: Room, bld: Building) {
	const self = `/api/v2/buildings/${bld.id}/rooms/${room.id}`;
	const buildingLink = `/api/v2/buildings/${bld.id}`;
	return {
		id: room.id,
		building: room.building,
		number: room.number,
		type: room.type,
		furniture: room.furniture,
		href: room.href,
		seats: room.seats,
		links: {
			self: self,
			building: buildingLink
		}
	};
}

// returns the error message for when query is incorrect for retrieving
// courses, sections, buildings, rooms. Returns false if no error
export function RetrieveAllQueryError(limit: any, offset: any) {
	const errorMessage = {
			error: "Invalid request parameters",
			params: {} as any,
		};
		let isError = false;

		if (isNaN(limit)) {
			limit = 100;
		}
		if (limit < 1 || limit > 5000) {
			errorMessage.params["limit"] = "expected an integer between 1 and 5000";
			isError = true;
		}
		if (isNaN(offset)) {
			offset = 0;
		}
		if (offset < 0) {
			errorMessage.params["offset"] = "expected an integer >= 0";
			isError = true;
		}

		if (isError) {
			return errorMessage;
		}
		return isError;
}

// Returns the validation errorMessage for creating a building,
// Returns false if there is no error
export function BuildingCreateError(body: any) {
	const errorMessage = {
		error: "Validation failed",
		fields: {} as any,
	}
	let isError = false;

	if (body.name == undefined) {
		errorMessage.fields["name"] = "required but missing";
		isError = true;
	} else if (!(typeof body.name === "string")) {
		errorMessage.fields["name"] = "expected a string";
		isError = true;
	}

	if (body.address == undefined) {
		errorMessage.fields["address"] = "required but missing";
		isError = true;
	} else if (!(typeof body.address === "string")) {
		errorMessage.fields["address"] = "expected a string";
		isError = true;
	}

	if (body.lat == undefined) {
		errorMessage.fields["lat"] = "required but missing";
		isError = true;
	} else if (!(typeof body.lat === "string")) {
		errorMessage.fields["lat"] = "expected a number";
		isError = true;
	}

	if (body.lon == undefined) {
		errorMessage.fields["lon"] = "required but missing";
		isError = true;
	} else if (!(typeof body.lon === "string")) {
		errorMessage.fields["lon"] = "expected a number";
		isError = true;
	}

	if (isError) {
		return errorMessage;
	}
	return isError;
}

export function RoomCreateError(body: any, buildingID: string) {
	const errorMessage = {
		error: "Validation failed",
		fields: {} as any,
	}
	let isError = false;

	if (body.building == undefined) {
		errorMessage.fields["building"] = "required but missing";
		isError = true;
	} else if (!(typeof body.building === "string")) {
		errorMessage.fields["building"] = "expected a string";
		isError = true;
	} else if (!(body.building == buildingID)) {
		errorMessage.fields["building"] = "must match parent building in path";
		isError = true;
	}

	if (body.number == undefined) {
		errorMessage.fields["number"] = "required but missing";
		isError = true;
	} else if (!(typeof body.number === "string")) {
		errorMessage.fields["number"] = "expected a string";
		isError = true;
	}

	if (body.type == undefined) {
		errorMessage.fields["type"] = "required but missing";
		isError = true;
	} else if (!(typeof body.type === "string")) {
		errorMessage.fields["type"] = "expected a string";
		isError = true;
	}

	if (body.furniture == undefined) {
		errorMessage.fields["furniture"] = "required but missing";
		isError = true;
	} else if (!(typeof body.furniture === "string")) {
		errorMessage.fields["furniture"] = "expected a string";
		isError = true;
	}

	if (body.href == undefined) {
		errorMessage.fields["href"] = "required but missing";
		isError = true;
	} else if (!(typeof body.href === "string")) {
		errorMessage.fields["href"] = "expected a string";
		isError = true;
	}

	if (body.seats == undefined) {
		errorMessage.fields["seats"] = "required but missing";
		isError = true;
	} else if (!(typeof body.seats === "number") || body.seats < 0) {
		errorMessage.fields["seats"] = "expected a number >= 0";
		isError = true;
	}

	if (isError) {
		return errorMessage;
	}
	return isError;
}