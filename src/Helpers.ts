import { Course, Section } from "./Types";

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


// Checks the Request's body and returns the correct
// error message for EBNF (SC 400) in post("api/v1/search")
// Returns false if no error
// TODO: 
export function EBNFError(body: any) {
	const errorMes = { error: "Invalid query" };
	return;
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
		fields: {} as any
	};
	if (body.kind == undefined) {
		errorMes.fields["kind"] = "required but missing";
		isError = true;
	} else if (!(body.king == "course_offerings")) {
		errorMes.fields["kind"] = "expected to be course_offerings";
		isError = true;
	}

	if (body.query == undefined) {
		errorMes.fields["query"] = "required but missing";
		isError = true;
	} else if (!(typeof body.query == "object")) {
		errorMes.fields["kind"] = "expected an object";
		isError = true;
	}

	if (isError) return errorMes;
	return isError;
}