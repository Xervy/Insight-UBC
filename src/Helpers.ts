import { validateHeaderName } from "http";
import {
	Comparator,
	Course,
	LogicalComparator,
	MField,
	MFieldComparator,
	NegationComparator,
	SearchEBNFError,
	SearchRequestBody,
	Section,
	SField,
	SFieldComparator,
} from "./Types";
import { off } from "process";

export function UpdateListOfCoursesLinks(courses: Course[]) {
	// const filteredCourses = foundOrg.courses.map((course: any) => {

	//     // Turns Sections into Links to the sections
	//     course = UpdateSectionLink(course, foundOrg)
	// });

	let filteredCourses = [];
	for (let i = 0; i < courses.length; i++) {
		const pushit = UpdateCourseLink(courses[i]);
		filteredCourses.push(pushit);
	}

	return filteredCourses;
}

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

export function UpdateListOfSectionsLinks(sections: Section[], course: Course) {
	let filteredCourses = [];
	for (let i = 0; i < sections.length; i++) {
		const pushit = UpdateSectionLink(sections[i], course);
		filteredCourses.push(pushit);
	}

	return filteredCourses;
}

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

export function generateSectionID() {
	return Date.now();
}

// Formats Error Message for SC 400
// TODO:
export function EBNFError(message: string) {
	const errorMes = {
		error: "Invalid query",
		message: message,
	};
	return errorMes;
}

// Checks if the result is too large, return error message or false if no error
// SC 413 in post("/api/v1/search")
// TODO:
export function TooLargeError() {
	return false;
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
// TODO
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

// a
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
