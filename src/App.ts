import fs from "fs/promises";
import express from "express";
import cors from "cors";

import multer from "multer";
import JSZip from "jszip";

import {
	Course,
	Section,
	Offering,
	Upload,
	UploadStats,
	SearchRequestBody,
	MFieldArr,
	SFieldArr,
	SearchEBNFError,
} from "./Types";
import {
	OfferingFieldsForColumn,
	CourseCreateError,
	EBNFError,
	generateSectionID,
	Search,
	SearchValidationError,
	SectionCreateError,
	TooLargeError,
	UpdateCourseLink,
	UpdateListOfCoursesLinks,
	UpdateListOfSectionsLinks,
	UpdateSectionLink,
} from "./Helpers";

/**
 * Express application.
 */
export type Application = ReturnType<typeof express>;

/**
 * Configuration options for the application.
 */
export type AppConfig = {
	/**
	 * The directory where application data will be stored enabling the application to persist data between restarts.
	 *
	 * @internal
	 * During autograding, the directory will be deleted as a means to reset the application data between tests.
	 */
	readonly datadir: string;
};

/**
 * Initializes the application.
 */
export async function createApp(config: AppConfig): Promise<Application> {
	const app = express();

	const { datadir } = config;

	const bulkUploads = [] as UploadStats[];

	// Ensure the data directory exists
	await fs.mkdir(datadir, { recursive: true });

	// Configure multer to store file contents in memory
	const upload = multer({ storage: multer.memoryStorage() });

	// Make files in ../frontend/public accessible at http://localhost:<port>/
	app.use(express.static("frontend/public"));

	// Register middleware to parse request before passing them to request handlers
	// Note: JSON parser must be place before raw parser because of wildcard matching done by raw parser below
	app.use(express.json());
	app.use(express.raw({ type: "application/*", limit: "10mb" }));
	app.use(cors());

	const DATA_FILE = datadir + "/data.json";

	// await fs.access(DATA_FILE).catch(async (_err) => {
	// 	await fs.writeFile(DATA_FILE, "[]", "utf-8");
	// });

	const UPLOAD_FILE = "uploadFile.json";

	// Basic message to verify REST API is available
	// You can see the message by going to http://localhost:<port>/api
	app.get("/api", (_req, res) => {
		res.send("App is running!");
	});

	async function readData(): Promise<Course[]> {
		try {
			const data = await fs.readFile(DATA_FILE, "utf-8");
			return JSON.parse(data) as Course[];
		} catch {
			return [];
		}
	}

	async function readUploads(): Promise<Upload[]> {
		try {
			const data = await fs.readFile(UPLOAD_FILE, "utf-8");
			return JSON.parse(data);
		} catch {
			return [];
		}
	}

	async function writeData(data: any[]): Promise<void> {
		await fs.writeFile(
			DATA_FILE,
			JSON.stringify(data, null, 2), // pretty format
			"utf-8"
		);
	}

	async function writeUpload(data: any[]): Promise<void> {
		await fs.writeFile(
			UPLOAD_FILE,
			JSON.stringify(data, null, 2), // pretty format
			"utf-8"
		);
	}

	function parseIntParam(value: unknown): number | null {
		if (value === undefined) return null;
		if (Array.isArray(value)) return null;
		const n = Number.parseInt(String(value), 10);
		return Number.isNaN(n) ? null : n;
	}

	// function isInt(n: unknown): n is number {
	// 	return typeof n === "number" && Number.isInteger(n);
	// }

	// function isNum(n: unknown): n is number {
	// 	return typeof n === "number" && Number.isFinite(n);
	// }

	function courseOffering(course: any): Offering | null {
		const required = [
			"id",
			"Course",
			"Title",
			"Professor",
			"Subject",
			"Section",
			"Year",
			"Avg",
			"Pass",
			"Fail",
			"Audit",
		] as const;
		for (const req of required) {
			if (!(req in course)) return null;
		}

		const id = Number(course.id);
		const Avg = Number(course.Avg);
		const Pass = Number(course.Pass);
		const Fail = Number(course.Fail);
		const Audit = Number(course.Audit);

		if (
			!Number.isFinite(id) ||
			typeof course.Course !== "string" ||
			typeof course.Title !== "string" ||
			typeof course.Professor !== "string" ||
			typeof course.Subject !== "string" ||
			typeof course.Section !== "string" ||
			typeof course.Year !== "string" ||
			!Number.isFinite(Avg) ||
			!Number.isFinite(Pass) ||
			!Number.isFinite(Fail) ||
			!Number.isFinite(Audit)
		) {
			return null;
		}

		return {
			id,
			Course: course.Course,
			Title: course.Title,
			Professor: course.Professor,
			Subject: course.Subject,
			Section: course.Section,
			Year: course.Year,
			Avg,
			Pass,
			Fail,
			Audit,
		};
	}

	//Retrieve a list of courses
	app.get("/api/v1/courses", async (req, res): Promise<void> => {
		const data = await readData();

		const errorMessage = {
			error: "Invalid request parameters",
			params: {} as any,
		};
		let isError = false;

		let limit = parseInt(req.query.limit as string);
		let offset = parseInt(req.query.offset as string);
		if (isNaN(limit)) {
			limit = 100;
		}
		if (limit < 1 || limit > 5000) {
			errorMessage.params["limit"] = "expected an integer between 1 and 5000";
			isError = true;
			// res.status(400).json({ error: "limit must be between 1 and 5000" });
			// return;
		}
		if (isNaN(offset)) {
			offset = 0;
		}

		if (offset < 0) {
			errorMessage.params["offset"] = "expected an integer >= 0";
			isError = true;
			// res.status(400).json({ error: "offset must be >= 0" });
			// return;
		}

		if (isError) {
			res.status(400).json(errorMessage);
			return;
		}

		const sort = [...data].sort((a, b) => a.id.localeCompare(b.id));
		let items = sort.slice(offset, offset + limit);
		let updatedLinks = UpdateListOfCoursesLinks(items);

		res.status(200).json({
			total: data.length,
			limit,
			offset,
			items: updatedLinks,
		});
	});

	//Retrieve a course
	app.get("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = await readData();
		const id = req.params.course;

		const course = data.find((c) => c.id === id);

		if (!course) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${id}'`,
			});
			return;
		}

		res.json({
			id: course.id,
			title: course.title,
			dept: course.dept,
			code: course.code,
			links: {
				self: `/api/v1/courses/${id}`,
				sections: `/api/v1/courses/${id}/sections`,
			},
		});
	});

	//Create or replace a course

	app.put("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const id = req.params.course;
		const body = req.body;

		const errorRes = CourseCreateError(body);
		if (!(typeof errorRes === "boolean")) {
			res.status(422).json(errorRes);
			return;
		}

		const data: Course[] = await readData();
		// const newCourse: Course = { id, title, dept, code, sections };

		const alreadyExists = data.find((crs) => crs.id == id);

		if (!alreadyExists) {
			let courseToPush = {
				id: id,
				title: body.title,
				dept: body.dept,
				code: body.code,
				sections: [],
			} as Course;
			data.push(courseToPush);
			await writeData(data);
			const cleanedCourse = UpdateCourseLink(courseToPush);
			res.status(201).json(cleanedCourse);
			return;
		}

		alreadyExists.title = body.title;
		alreadyExists.dept = body.dept;
		alreadyExists.code = body.code;
		alreadyExists.sections = [];
		await writeData(data);
		res.status(204).send();
	});

	//Remove a course
	app.delete("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = await readData();
		const id = req.params.course;
		const index = data.findIndex((c) => c.id === id);

		if (index === -1) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${id}'`,
			});
			return;
		}
		const courseDelete = data[index];
		data.splice(index, 1);
		await writeData(data);
		res.status(200).json({
			id: courseDelete.id,
			title: courseDelete.title,
			dept: courseDelete.dept,
			code: courseDelete.code,
			sections: courseDelete.sections.length,
		});
	});

	//Retrieve a list of sections for a course
	app.get("/api/v1/courses/:course/sections", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const id = req.params.course;

		const course = data.find((c) => c.id === id);

		if (!course) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${id}'`,
			});
			return;
		}

		const errorMessage = {
			error: "Invalid request parameters",
			params: {} as any,
		};
		let isError = false;

		let limit = parseInt(req.query.limit as string);
		let offset = parseInt(req.query.offset as string);

		if (isNaN(limit)) {
			limit = 100;
		}
		if (limit < 1 || limit > 5000) {
			errorMessage.params["limit"] = "expected an integer between 1 and 5000";
			isError = true;
			// res.status(400).json({ error: "limit must be between 1 and 5000" });
			// return;
		}
		if (isNaN(offset)) {
			offset = 0;
		}

		if (offset < 0) {
			errorMessage.params["offset"] = "expected an integer >= 0";
			isError = true;
			// res.status(400).json({ error: "offset must be >= 0" });
			// return;
		}

		if (isError) {
			res.status(400).json(errorMessage);
			return;
		}

		const sections: Section[] = Array.isArray(course.sections) ? course.sections : [];
		const sortedSection = [...sections].sort((a, b) =>
			String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
		);
		const items = sortedSection.slice(offset, offset + limit);

		let updatedLinks = UpdateListOfSectionsLinks(items, course);

		res.status(200).json({
			total: sections.length,
			limit,
			offset,
			items: updatedLinks,
		});
	});

	// Retrieve a section for a course
	app.get("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const courseId = req.params.course;
		const sectionId = req.params.section;

		const course = data.find((c) => c.id === courseId);

		if (!course) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${courseId}'`,
			});
			return;
		}

		const sections: Section[] = Array.isArray(course.sections) ? course.sections : [];
		const section = sections.find((s) => String(s.id) === sectionId);

		if (!section) {
			res.status(404).json({
				error: "Not found",
				message: `no section with id '${sectionId}'`,
			});
			return;
		}

		res.status(200).json({
			id: section.id,
			instructor: section.instructor,
			year: section.year,
			avg: section.avg,
			pass: section.pass,
			fail: section.fail,
			audit: section.audit,
			links: {
				self: `/api/v1/courses/${courseId}/sections/${sectionId}`,
				course: `/api/v1/courses/${courseId}`,
			},
		});
	});

	//Create or replace a section for a course
	app.put("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const courseId = req.params.course;
		const sectionId = req.params.section;
		const course = data.find((c) => c.id === courseId);
		const body = req.body;

		if (!course) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${courseId}'`,
			});
			return;
		}
		if (!Array.isArray(course.sections)) course.sections = [];

		const errorRes = SectionCreateError(body);
		if (!(typeof errorRes === "boolean")) {
			res.status(422).json(errorRes);
			return;
		}

		const alreadyExists = course.sections.find((section) => section.id == sectionId);
		if (alreadyExists) {
			// SC 204
			alreadyExists.instructor = body.instructor;
			alreadyExists.year = body.year;
			alreadyExists.avg = body.avg;
			alreadyExists.pass = body.pass;
			alreadyExists.fail = body.fail;
			alreadyExists.audit = body.audit;
			await writeData(data);
			res.status(204).send();
			return;
		}

		// SC 201
		const toPut = {
			id: sectionId,
			instructor: body.instructor,
			year: body.year,
			avg: body.avg,
			pass: body.pass,
			fail: body.fail,
			audit: body.audit,
		};
		course.sections.push(toPut);
		await writeData(data);
		const response = UpdateSectionLink(toPut, course);
		res.status(201).json(response);
	});

	//Remove a section from a course
	app.delete("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const courseId = req.params.course;
		const sectionId = req.params.section;

		const course = data.find((c) => String(c.id) === courseId);
		if (!course || !Array.isArray(course.sections)) {
			res.status(404).json({
				error: "Not found",
				message: `no course with id '${courseId}'`,
			});
			return;
		}

		const index = course.sections.findIndex((s) => String(s.id) === sectionId);

		if (index === -1) {
			res.status(404).json({
				error: "Not found",
				message: `no section with id '${sectionId}'`,
			});
			return;
		}
		const sectionDelete = course.sections[index];
		course.sections.splice(index, 1);
		await writeData(data);
		res.status(200).json(sectionDelete);
	});

	app.get("/api/v1/datasets/:dataset", async (req, res) => {
		const datasetID = req.params.dataset;
		let found = false;
		const foundUpload = bulkUploads.find((upload) => upload.id == datasetID);

		if (!foundUpload) {
			res.status(404).json({
				error: "Not found",
				message: `no dataset with id '${datasetID}'`,
			});
			return;
		}

		if (foundUpload.status == "processing") {
			res.status(200).json({
				id: datasetID,
				status: "processing",
				kind: "course_offerings",
				stats: {
					files_total: 0,
					files_processed: 0,
					files_skipped: 0,
					courses_seen: 0,
					courses_added: 0,
					courses_modified: 0,
					sections_seen: 0,
					sections_added: 0,
					sections_modified: 0,
				},
				message: "Processing in progress",
			});
			return;
		}
		if (foundUpload.status == "failed") {
			res.status(200).json({
				id: datasetID,
				status: "failed",
				kind: "course_offerings",
				stats: {
					files_total: 0,
					files_processed: 0,
					files_skipped: 0,
					courses_seen: 0,
					courses_added: 0,
					courses_modified: 0,
					sections_seen: 0,
					sections_added: 0,
					sections_modified: 0,
				},
				message: foundUpload.message,
			});
			return;
		}
		if (foundUpload!.status == "completed") {
			res.status(200).json({
				id: datasetID,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: foundUpload.files_total,
					files_processed: foundUpload.files_processed,
					files_skipped: foundUpload.files_skipped,
					courses_seen: foundUpload.courses_seen,
					courses_added: foundUpload.courses_added,
					courses_modified: foundUpload.courses_modified,
					sections_seen: foundUpload.sections_seen,
					sections_added: foundUpload.sections_added,
					sections_modified: foundUpload.sections_modified,
				},
				message: "Dataset processing complete",
			});
			return;
		}
	});

	app.post("/api/v1/datasets", upload.single("archive"), async (req, res) => {
		// SC 422
		let isError = false;
		const errorMes = {
			error: "Validation failed",
			fields: {} as any,
		};
		if (!req.body || !req.body.kind) {
			errorMes.fields["kind"] = "required but missing";
			isError = true;
		} else if (req.body.kind != "course_offerings") {
			errorMes.fields["kind"] = "expected to be course_offerings";
			isError = true;
		}

		if (!req.file) {
			errorMes.fields["archive"] = "required but missing";
			isError = true;
		} else if (req.file.size == 0) {
			errorMes.fields["archive"] = "expected non-empty file";
			isError = true;
		}

		if (isError) {
			res.status(422).json(errorMes);
			return;
		}

		const id = generateSectionID();
		res.status(202).json({
			id: id.toString(),
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		});

		const courses = await readData();

		const stats = {
			id: id.toString(),
			status: "processing",
			kind: req.body.kind,
			message: "Dataset accepted for processing",
			files_total: 0,
			files_processed: 0,
			files_skipped: 0,
			courses_seen: 0,
			courses_added: 0,
			courses_modified: 0,
			sections_seen: 0,
			sections_added: 0,
			sections_modified: 0,
		} as UploadStats;
		bulkUploads.push(stats);

		// const coursesToAdd = [] as Course[];

		// The file will be available as req.file
		// The zip content is in req.file.buffer
		const zipBuffer = req.file!.buffer;

		// CHECK IF ZIPBUFFER IS ACTUALLY A ZIP 	ASK POOKIE
		// if (!zipBuffer || zipBuffer.length < 4) {
		// 	// Not a Valid Zip
		// 	stats.status = "failed";
		// 	return;
		// }

		let zip;
		// Use JSZip to process the buffer
		try {
			zip = await JSZip.loadAsync(zipBuffer);
		} catch (e) {
			stats.status = "failed";
			stats.message = "Data is not in a valid zip format";
			return;
		}

		// CHECK FOR COURSES FOLDER
		const hasCoursesFolder = Object.keys(zip.files).some((filepath) => filepath.startsWith("courses/"));
		if (!hasCoursesFolder) {
			stats.status = "failed";
			stats.message = "Missing root courses directory";
			return;
		}

		// All files in courses
		const coursesFiles = Object.values(zip.files).filter(
			(file) => file.name.startsWith("courses/") && file.name !== "courses/" && !file.dir
		);

		for (const file of coursesFiles) {
			const fileContent = await file.async("string");
			stats.files_total += 1;
			let parsedFile;
			try {
				parsedFile = JSON.parse(fileContent);

				if (!parsedFile.result || !Array.isArray(parsedFile.result)) {
					stats.files_skipped += 1;
					continue;
				}
			} catch {
				stats.files_skipped += 1;
				continue; // YAY OR NAY?
			}
			stats.files_processed += 1;
			// JSON needs to have parameter 'result' which must be an array

			// record is each offering object in result
			for (const record of parsedFile.result) {
				// Check Database if Course already Exists
				// If So: Iterate through Sections to find if Section Exists, Determine if new Section or modify section
				// If not: Push the new course to the database
				const courseID = record.Subject + record.Course;
				const sectionID = record.id;
				let sectionWasAdded = false;

				if (
					record.id === undefined ||
					record.Course === undefined ||
					record.Title === undefined ||
					record.Professor === undefined ||
					record.Subject === undefined ||
					record.Section === undefined ||
					record.Year === undefined ||
					record.Avg === undefined ||
					record.Pass === undefined ||
					record.Fail === undefined ||
					record.Audit === undefined
				) {
					continue;
				} else if (
					!(
						typeof record.id === "number" &&
						typeof record.Course == "string" &&
						typeof record.Title == "string" &&
						typeof record.Professor == "string" &&
						typeof record.Subject == "string" &&
						typeof record.Section == "string" &&
						typeof record.Year == "string" &&
						typeof record.Avg == "number" &&
						typeof record.Pass == "number" &&
						typeof record.Fail == "number" &&
						typeof record.Audit == "number"
					)
				) {
					continue;
				}

				let sectionYear = Number(record.Year);
				if (record.Section == "overall") {
					sectionYear = 1900;
				}

				for (const course of courses) {
					if (course.id == courseID) {
						// Make Updates
						course.code = record.Course;
						course.dept = record.Subject;
						let mostRecent = true;

						for (const section of course.sections) {
							if (section.year >= sectionYear) {
								mostRecent = false;
								break;
							}
						}
						if (mostRecent) {
							course.title = record.Title;
						}

						// Check if Course already has Section
						// If No, Push Section to Course
						// If Yes, Update Section Parameters
						const alreadyHasSection = course.sections.find((section) => section.id == record.id);
						if (!alreadyHasSection) {
							course.sections.push({
								id: sectionID.toString(),
								instructor: record.Professor,
								year: sectionYear,
								avg: record.Avg,
								pass: record.Pass,
								fail: record.Fail,
								audit: record.Audit,
							});
							stats.sections_added += 1;
						} else {
							alreadyHasSection.instructor = record.Professor;
							if (record.Section == "overall") {
								alreadyHasSection.year = 1900;
							} else {
								alreadyHasSection.year = sectionYear;
							}
							alreadyHasSection.avg = record.Avg;
							alreadyHasSection.pass = record.Pass;
							alreadyHasSection.fail = record.Fail;
							alreadyHasSection.audit = record.Audit;

							stats.sections_modified += 1;
						}

						stats.courses_modified += 1;
						sectionWasAdded = true;
					}
				}
				// If the Course does not already exist, add it to jsonFile
				if (!sectionWasAdded) {
					courses.push({
						id: courseID,
						title: record.Title,
						dept: record.Subject,
						code: record.Course,
						sections: [
							{
								id: sectionID.toString(),
								instructor: record.Professor,
								year: sectionYear,
								avg: record.Avg,
								pass: record.Pass,
								fail: record.Fail,
								audit: record.Audit,
							},
						],
					});
					stats.courses_added += 1;
					stats.sections_added += 1;
				}
			}
		}
		stats.courses_seen = stats.courses_added + stats.courses_modified;
		stats.sections_seen = stats.sections_added + stats.sections_modified;
		// Write Json to file
		await writeData(courses);
		stats.status = "completed";
	});


	/*
	async function processDataset(dataId: string, zipBuffer: Buffer): Promise<void> {
		const datas = await readUploads();
		const data = datas.find((j) => j.id === dataId);
		if (!data) return;

		const stats = {
			files_total: 0,
			files_processed: 0,
			files_skipped: 0,
			courses_seen: 0,
			courses_added: 0,
			courses_modified: 0,
			sections_seen: 0,
			sections_added: 0,
			sections_modified: 0,
		}; //ChatGPT

		let zip: JSZip;
		try {
			zip = await JSZip().loadAsync(zipBuffer);
		} catch {
			data.status = "failed";
			data.stats = stats;
			await writeUpload(datas);
			return;
		} //ChatGPT

		const checkRoot = Object.keys(zip.files).some((name) => name.startsWith("courses/")); //ChatGPT
		if (!checkRoot) {
			data.status = "failed";
			data.stats = stats;
			await writeUpload(datas);
			return;
		}

		const courseName = Object.keys(zip.files).filter(
			(name) => name.startsWith("courses/") && !zip.files[name].dir && name.toLowerCase().endsWith(".json")
		);
		const offerings: Offering[] = [];
		stats.files_total = courseName.length;

		for (const name of courseName) {
			try {
				const text = await zip.files[name].async("string");
				const parsed = JSON.parse(text);
				if (!Array.isArray(parsed.result || !parsed)) {
					stats.files_skipped = stats.files_skipped + 1;
					continue;
				}
				stats.files_processed = stats.files_processed + 1;
				for (const result of parsed.result) {
					const offer = courseOffering(result);
					if (offer) offerings.push(offer);
				}
			} catch {
				stats.files_skipped = stats.files_skipped + 1;
			}
		}
		const courseData = await readData();
		const courseMap = new Map<string, Course>();
		for (const course of courseData) {
			courseMap.set(course.id, course);
		}

		for (const offer of offerings) {
			stats.courses_seen = stats.courses_seen + 1;
			const courseId = `${offer.Subject}${offer.Course}`; //ChatGPT
			const current = courseMap.get(courseId);

			if (!current) {
				const newCourse: Course = {
					id: courseId,
					code: offer.Course,
					dept: offer.Subject,
					title: offer.Title,
					sections: [],
				};
				courseMap.set(courseId, newCourse);
				courseData.push(newCourse);
				stats.courses_added = stats.courses_added + 1;
			} else {
				let updated = false;
				if (current.code != offer.Course) {
					current.code = offer.Course;
					updated = true;
				}

				if (current.dept != offer.Subject) {
					current.dept = offer.Subject;
					updated = true;
				}


	// 	const checkRoot = Object.keys(zip.files).some((name) => name.startsWith("courses/")); //ChatGPT
	// 	if (!checkRoot) {
	// 		data.status = "failed";
	// 		data.stats = stats;
	// 		await writeUpload(datas);
	// 		return;
	// 	}

	// 	const courseName = Object.keys(zip.files).filter(
	// 		(name) => name.startsWith("courses/") && !zip.files[name].dir && name.toLowerCase().endsWith(".json")
	// 	);
	// 	const offerings: Offering[] = [];
	// 	stats.files_total = courseName.length;

	// 	for (const name of courseName) {
	// 		try {
	// 			const text = await zip.files[name].async("string");
	// 			const parsed = JSON.parse(text);
	// 			if (!Array.isArray(parsed.result || !parsed)) {
	// 				stats.files_skipped = stats.files_skipped + 1;
	// 				continue;
	// 			}
	// 			stats.files_processed = stats.files_processed + 1;
	// 			for (const result of parsed.result) {
	// 				const offer = courseOffering(result);
	// 				if (offer) offerings.push(offer);
	// 			}
	// 		} catch {
	// 			stats.files_skipped = stats.files_skipped + 1;
	// 		}
	// 	}
	// 	const courseData = await readData();
	// 	const courseMap = new Map<string, Course>();
	// 	for (const course of courseData) {
	// 		courseMap.set(course.id, course);
	// 	}

	// 	for (const offer of offerings) {
	// 		stats.courses_seen = stats.courses_seen + 1;
	// 		const courseId = `${offer.Subject}${offer.Course}`; //ChatGPT
	// 		const current = courseMap.get(courseId);

	// 		if (!current) {
	// 			const newCourse: Course = {
	// 				id: courseId,
	// 				code: offer.Course,
	// 				dept: offer.Subject,
	// 				title: offer.Title,
	// 				sections: [],
	// 			};
	// 			courseMap.set(courseId, newCourse);
	// 			courseData.push(newCourse);
	// 			stats.courses_added = stats.courses_added + 1;
	// 		} else {
	// 			let updated = false;
	// 			if (current.code != offer.Course) {
	// 				current.code = offer.Course;
	// 				updated = true;
	// 			}

	// 			if (current.dept != offer.Subject) {
	// 				current.dept = offer.Subject;
	// 				updated = true;
	// 			}

	// 			if (current.title != offer.Title) {
	// 				current.title = offer.Title;
	// 				updated = true;
	// 			}

	// 			if (updated) stats.courses_modified = stats.courses_modified + 1;
	// 			if (!Array.isArray(current.sections)) current.sections = [];
	// 		}
	// 	}

	// 	for (const offer of offerings) {
	// 		stats.courses_seen = stats.courses_seen + 1;
	// 		const courseId = `${offer.Subject}${offer.Course}`;
	// 		const course = courseMap.get(courseId);
	// 		if (!course) continue;
	// 		if (!Array.isArray(course.sections)) course.sections = [];
	// 		const secId = String(offer.id);
	// 		const currSecId = course.sections.findIndex((s) => s.id === secId);
	// 		const newSection: Section = {
	// 			id: secId,
	// 			instructor: offer.Professor,
	// 			year: Number.isFinite(Number.parseInt(offer.Year, 10)) ? Number.parseInt(offer.Year, 10) : 1900,
	// 			avg: offer.Avg,
	// 			pass: offer.Pass,
	// 			fail: offer.Fail,
	// 			audit: offer.Audit,
	// 		};
	// 		if (currSecId === -1) {
	// 			course.sections.push(newSection);
	// 			stats.sections_added = stats.sections_added + 1;
	// 		} else {
	// 			const current = course.sections[currSecId];
	// 			const updated =
	// 				current.instructor !== newSection.instructor ||
	// 				current.year !== newSection.year ||
	// 				current.avg !== newSection.avg ||
	// 				current.pass !== newSection.pass ||
	// 				current.fail !== newSection.fail ||
	// 				current.audit !== newSection.audit;
	// 			if (updated) {
	// 				course.sections[currSecId] = newSection;
	// 				stats.sections_modified = stats.sections_modified + 1;
	// 			}
	// 		}
	// 	}
	// 	await writeData(courseData);


		await writeUpload(datas);
	}*/

	app.post("/api/v1/search", async (req, res) => {
		const data = await readData();
		const body = req.body as SearchRequestBody;

		// // SC 400
		// const isEBNF = EBNFError(body);
		// if (!(typeof isEBNF === "boolean")) {
		// 	res.status(400).json(isEBNF);
		// 	return;
		// }

		// // SC 413
		// const isTooLarge = TooLargeError();
		// if (!(typeof isTooLarge === "boolean")) {
		// 	res.status(413).json(isTooLarge);
		// 	return;
		// }

		// SC 422
		const validation = SearchValidationError(body);
		if (!(typeof validation === "boolean")) {
			res.status(422).json(validation);
			return;
		}

		// SC 200
		const where = body.query.WHERE;
		if (!where) {
			res.status(400).json(EBNFError("Missing WHERE"));
			return;
		}

		const options = body.query.OPTIONS;
		if (!options) {
			res.status(400).json(EBNFError("Missing OPTIONS"));
			return;
		}

		const columns = options.COLUMNS;
		if (columns && columns.length == 0) {
			res.status(400).json(EBNFError("Missing COLUMNS"));
			return;
		}

		const order = options.ORDER;
		if (order) {
			if (!columns.includes(order)) {
				res.status(400).json(EBNFError("ORDER must be a key in COLUMNS"));
				return;
			}
		}

		const whereKeys = Object.keys(where);
		if (whereKeys.length > 1) {
			res.status(400).json(EBNFError("WHERE must be an object with at most one FILTER"));
			return;
		}

		const optionKeys = Object.keys(options);
		if (!optionKeys.includes("COLUMNS")) {
			res.status(400).json(EBNFError("OPTIONS must be an object with COLUMNS and optional ORDER"));
			return;
		}

		if (columns.some((key) => !(MFieldArr.includes(key) || SFieldArr.includes(key)))) {
			res.status(400).json(EBNFError("Unknown key in COLUMNS"));
			return;
		}
		// Initial EBNF Error Check Complete

		const columnedData = OfferingFieldsForColumn(data, columns);


		try {
			const filteredCourses = Search(where, columnedData);
			if (filteredCourses.length > 5000) {
				res.status(413).json({
					error: "Too many results",
					message: "Query would return more than 5000 results",
					limit: 5000,
				});
				return;
			}

			if (order) {
				columnedData.sort((a: any, b: any) => {
					if (typeof a[order] == 'string') {
						return a[order].localeCompare(b[order]);
					} else if (typeof a[order] == 'number') {
						return a[order] - b[order];
					} else {
						return -1;
					}
				});
			}

			res.status(200).json(filteredCourses);
		} catch (e: any) {
			res.status(400).json(EBNFError((e as SearchEBNFError).message));
		}
	});

	app.get("/api/v2/buildings", async (req, res) => {
		const data = await readData();
	});


	return app;
}
