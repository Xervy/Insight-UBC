import { Course } from "./Types";

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
