// mon tue thu: 9:30-12
import fs from "fs/promises";
import express from "express";
import cors from "cors";

import multer, { Field } from "multer";
import JSZip from "jszip";
import parse5 from "parse5";

import {
	Course,
	Section,
	Offering,
	Upload,
	UploadOfferingStats,
	SearchRequestBody,
	MFieldArrOffering,
	SFieldArrOffering,
	SearchEBNFError,
	Data,
	MFieldArrFacility,
	SFieldArrFacility,
	UploadFacilityStats,
	UploadStats,
	Building,
	Room,
} from "./Types";
import {
	OfferingFieldsForColumn,
	CourseCreateError,
	EBNFError,
	generateSectionID,
	SearchOfferings,
	SearchOfferingsValidationError,
	SectionCreateError,
	UpdateCourseLink,
	UpdateListOfCoursesLinks,
	UpdateListOfSectionsLinks,
	UpdateSectionLink,
	UpdateListOfBuildingsLinks,
	UpdateBuildingLink,
	BuildingCreateError,
	UpdateListOfRoomsLinks,
	UpdateRoomLink,
	RoomCreateError,
	SearchFacilitiesValidationError,
	FacilityFieldsForColumn,
	SearchFacilities,
	ParseBuildings as ParseBuildings,
	ParseRooms,
	Generate404Error,
	IsOfferingValid,
	DatasetValidation,
	IsZipValid,
	IsRecordValid,
	BulkUploadOfferings,
	MatchListLengthToLimit,
} from "./Helpers";
import { error } from "console";
import { read, readdir } from "fs";
import { off } from "process";
import { RetrieveAllQueryError } from "./utils/validation";
import { initFileStore, readPartOfData, writeBuildingsToData, writeCoursesToData } from "./storage/fileStore";

import buildingRoutes from "./routes/buildingRoutes";

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

	// const DATA_FILE = datadir + "/data.json";

	// await fs.access(DATA_FILE).catch(async (_err) => {
	// 	await fs.writeFile(
	// 		DATA_FILE,
	// 		JSON.stringify({
	// 			course_offerings: [],
	// 			facilities: [],
	// 		}),
	// 		"utf-8"
	// 	);
	// });
	await initFileStore(datadir);

	const UPLOAD_FILE = "uploadFile.json";

	// Basic message to verify REST API is available
	// You can see the message by going to http://localhost:<port>/api
	app.get("/api", (_req, res) => {
		res.send("App is running!");
	});

	app.get("/api/v1/courses", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];

		const errorMessage = {
			error: "Invalid request parameters",
			params: {} as any,
		};
		let isError = false;

		let limit = parseInt((req.query.limit as string) ?? 100);
		let offset = parseInt((req.query.offset as string) ?? 0);

		// SC 400
		const errorRes = RetrieveAllQueryError(limit, offset);
		if (!(typeof errorRes == "boolean")) {
			res.status(400).json(errorRes);
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

	app.get("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;

		const course = data.find((c) => c.id === courseID);

		if (!course) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}

		res.json({
			id: course.id,
			title: course.title,
			dept: course.dept,
			code: course.code,
			links: {
				self: `/api/v1/courses/${courseID}`,
				sections: `/api/v1/courses/${courseID}/sections`,
			},
		});
	});

	app.put("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const courseID = req.params.course;
		const body = req.body;

		const errorRes = CourseCreateError(body);
		if (!(typeof errorRes === "boolean")) {
			res.status(422).json(errorRes);
			return;
		}

		const data = (await readPartOfData("course_offerings")) as Course[];

		const alreadyExists = data.find((crs) => crs.id == courseID);

		if (!alreadyExists) {
			let courseToPush = {
				id: courseID,
				title: body.title,
				dept: body.dept,
				code: body.code,
				sections: [],
			} as Course;
			data.push(courseToPush);
			await writeCoursesToData(data);
			res.status(201).json(UpdateCourseLink(courseToPush));
			return;
		}

		alreadyExists.title = body.title;
		alreadyExists.dept = body.dept;
		alreadyExists.code = body.code;
		alreadyExists.sections = [];
		await writeCoursesToData(data);
		res.status(204).send();
	});

	app.delete("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;
		const index = data.findIndex((c) => c.id === courseID);

		if (index === -1) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}
		const courseDelete = data[index];
		data.splice(index, 1);
		await writeCoursesToData(data);
		res.status(200).json({
			id: courseDelete.id,
			title: courseDelete.title,
			dept: courseDelete.dept,
			code: courseDelete.code,
			sections: courseDelete.sections.length,
		});
	});

	app.get("/api/v1/courses/:course/sections", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;

		const course = data.find((c) => c.id === courseID);

		if (!course) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}

		let limit = parseInt((req.query.limit as string) ?? 100);
		let offset = parseInt((req.query.offset as string) ?? 0);

		// SC 400
		const errorRes = RetrieveAllQueryError(limit, offset);
		if (!(typeof errorRes == "boolean")) {
			res.status(400).json(errorRes);
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

	app.get("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;
		const sectionID = req.params.section;

		const course = data.find((c) => c.id === courseID);

		if (!course) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}

		const sections: Section[] = Array.isArray(course.sections) ? course.sections : [];
		const section = sections.find((s) => String(s.id) === sectionID);

		if (!section) {
			res.status(404).json(Generate404Error("section", sectionID));
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
				self: `/api/v1/courses/${courseID}/sections/${sectionID}`,
				course: `/api/v1/courses/${courseID}`,
			},
		});
	});

	app.put("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;
		const sectionID = req.params.section;
		const course = data.find((c) => c.id === courseID);
		const body = req.body;

		if (!course) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}
		if (!Array.isArray(course.sections)) course.sections = [];

		const errorRes = SectionCreateError(body);
		if (!(typeof errorRes === "boolean")) {
			res.status(422).json(errorRes);
			return;
		}

		const alreadyExists = course.sections.find((section) => section.id == sectionID);
		if (alreadyExists) {
			// SC 204
			alreadyExists.instructor = body.instructor;
			alreadyExists.year = body.year;
			alreadyExists.avg = body.avg;
			alreadyExists.pass = body.pass;
			alreadyExists.fail = body.fail;
			alreadyExists.audit = body.audit;
			await writeCoursesToData(data);
			res.status(204).send();
			return;
		}

		// SC 201
		const toPut = {
			id: sectionID,
			instructor: body.instructor,
			year: body.year,
			avg: body.avg,
			pass: body.pass,
			fail: body.fail,
			audit: body.audit,
		};
		course.sections.push(toPut);
		await writeCoursesToData(data);
		const response = UpdateSectionLink(toPut, course);
		res.status(201).json(response);
	});

	app.delete("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const courseID = req.params.course;
		const sectionID = req.params.section;

		const course = data.find((c) => String(c.id) === courseID);
		if (!course || !Array.isArray(course.sections)) {
			res.status(404).json(Generate404Error("course", courseID));
			return;
		}

		const index = course.sections.findIndex((s) => String(s.id) === sectionID);

		if (index === -1) {
			res.status(404).json(Generate404Error("section", sectionID));
			return;
		}
		const sectionDelete = course.sections[index];
		course.sections.splice(index, 1);
		await writeCoursesToData(data);
		res.status(200).json(sectionDelete);
	});

	app.get("/api/v1/datasets/:dataset", async (req, res) => {
		const datasetID = req.params.dataset;
		const foundUpload = bulkUploads.find((upload) => upload.id == datasetID);

		if (!foundUpload) {
			res.status(404).json(Generate404Error("dataset", datasetID));
			return;
		}
		res.status(200).json(foundUpload);
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

		const stats = {
			id: id.toString(),
			status: "processing",
			kind: req.body.kind,
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
		} as UploadOfferingStats;
		bulkUploads.push(stats);

		res.status(202).json({
			id: id.toString(),
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		});

		const courses = (await readPartOfData("course_offerings")) as Course[];

		// The file will be available as req.file
		// The zip content is in req.file.buffer
		const zipBuffer = req.file!.buffer;

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

		let files_total = 0; // files total
		let files_processed = 0; // files processed
		let files_skipped = 0; // files skipped
		let courses_seen = 0; // courses seen
		let courses_added = 0; // courses added
		let courses_modified = 0; // courses modified
		let sections_seen = 0; // sections seen
		let sections_added = 0; // added
		let sections_modifed = 0; // modified
		for (const file of coursesFiles) {
			const fileContent = await file.async("string");
			files_total += 1;
			let parsedFile;
			try {
				parsedFile = JSON.parse(fileContent);

				if (!parsedFile.result || !Array.isArray(parsedFile.result)) {
					files_skipped += 1;
					continue;
				}
			} catch {
				files_skipped += 1;
				continue; // YAY OR NAY?
			}
			files_processed += 1;
			// JSON needs to have parameter 'result' which must be an array

			// record is each offering object in result
			for (const record of parsedFile.result) {
				// Check Database if Course already Exists
				// If So: Iterate through Sections to find if Section Exists, Determine if new Section or modify section
				// If not: Push the new course to the database
				const courseID = record.Subject + record.Course;
				const sectionID = record.id;
				let sectionWasAdded = false;

				if (!IsOfferingValid) continue;

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
							sections_added += 1;
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

							sections_modifed += 1;
						}

						courses_modified += 1;
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
					courses_added += 1;
					sections_added += 1;
				}
			}
		}
		courses_seen = courses_added + courses_modified;
		sections_seen = sections_added + sections_modifed;
		// Write Json to file
		await writeCoursesToData(courses);
		stats.status = "completed";
		stats.stats = {
			files_total: files_total,
			files_processed: files_processed,
			files_skipped: files_skipped,
			courses_seen: courses_seen,
			courses_added: courses_added,
			courses_modified: courses_modified,
			sections_seen: sections_seen,
			sections_added: sections_added,
			sections_modified: sections_modifed,
		};
		stats.message = "Dataset processing complete";
	});

	app.post("/api/v1/search", async (req, res) => {
		const data = (await readPartOfData("course_offerings")) as Course[];
		const body = req.body as SearchRequestBody;

		// SC 422
		const validation = SearchOfferingsValidationError(body);
		if (!(typeof validation === "boolean")) {
			res.status(422).json(validation);
			return;
		}

		// SC 200
		const where = body.query.WHERE;
		if (where === undefined) {
			res.status(400).json(EBNFError("Missing WHERE"));
			return;
		}

		const options = body.query.OPTIONS;
		if (options === undefined) {
			res.status(400).json(EBNFError("Missing OPTIONS"));
			return;
		}

		const columns = options.COLUMNS;
		if (columns && columns.length == 0) {
			res.status(400).json(EBNFError("Missing COLUMNS"));
			return;
		}

		if (columns.some((key) => !(MFieldArrOffering.includes(key) || SFieldArrOffering.includes(key)))) {
			res.status(400).json(EBNFError("Unknown key in COLUMNS"));
			return;
		}

		const order = options.ORDER;
		if (order) {
			if (typeof order == "string") {
				if (!columns.includes(order)) {
					res.status(400).json(EBNFError("ORDER must be a key in COLUMNS"));
					return;
				}
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
		// Initial EBNF Error Check Complete
		let columnedData = [];
		try {
			columnedData = OfferingFieldsForColumn(data, columns);
		} catch (e: any) {
			res.status(400).json(EBNFError((e as SearchEBNFError).message));
			return;
		}

		try {
			const filteredCourses = SearchOfferings(where, columnedData);
			if (filteredCourses.length > 5000) {
				res.status(413).json({
					error: "Too many results",
					message: "Query would return more than 5000 results",
					limit: 5000,
				});
				return;
			}

			if (order && typeof order === "string") {
				filteredCourses.sort((a: any, b: any) => {
					if (typeof a[order] == "string") {
						return a[order].localeCompare(b[order]);
					} else if (typeof a[order] == "number") {
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
	app.use("/api/", buildingRoutes);

	app.get("/api/v2/buildings/:buildingID/rooms/:roomID", async (req, res) => {
		const allBuildings = (await readPartOfData("facilities")) as Building[];

		const buildingID = req.params.buildingID;
		const foundBuilding = allBuildings.find((b) => b.id == buildingID);
		if (!foundBuilding) {
			res.status(404).json(Generate404Error("building", buildingID));
			return;
		}

		const rooms = foundBuilding.rooms;
		const roomID = req.params.roomID;
		const foundRoom = rooms.find((r) => r.id == roomID);
		if (!foundRoom) {
			res.status(404).json(Generate404Error("room", roomID));
			return;
		}

		res.status(200).json(UpdateRoomLink(foundRoom, foundBuilding));
	});

	app.put("/api/v2/buildings/:buildingID/rooms/:roomID", async (req, res) => {
		const body = req.body;
		const buildingID = req.params.buildingID;

		// SC 422
		const errorMessage = RoomCreateError(body, buildingID);
		if (!(typeof errorMessage === "boolean")) {
			res.status(422).json(errorMessage);
			return;
		}

		const allBuildings = (await readPartOfData("facilities")) as Building[];

		// SC 404
		const foundBuilding = allBuildings.find((b) => b.id == buildingID);
		if (!foundBuilding) {
			res.status(404).json(Generate404Error("building", buildingID));
			return;
		}

		// SC 204
		const rooms = foundBuilding.rooms;
		const roomID = req.params.roomID;
		const foundRoom = rooms.find((r) => r.id == roomID);
		if (foundRoom) {
			foundRoom.number = body.number;
			foundRoom.type = body.type;
			foundRoom.furniture = body.furniture;
			foundRoom.href = body.href;
			foundRoom.seats = body.seats;

			await writeBuildingsToData(allBuildings);
			res.status(204).send();
			return;
		}
		// SC 201
		const roomToAdd = {
			id: roomID,
			building: body.building,
			number: body.number,
			type: body.type,
			furniture: body.furniture,
			href: body.href,
			seats: body.seats,
		} as Room;
		rooms.push(roomToAdd);
		await writeBuildingsToData(allBuildings);
		res.status(201).json(UpdateRoomLink(roomToAdd, foundBuilding));
	});

	app.delete("/api/v2/buildings/:buildingID/rooms/:roomID", async (req, res) => {
		const allBuildings = (await readPartOfData("facilities")) as Building[];

		const buildingID = req.params.buildingID;
		const roomID = req.params.roomID;

		// SC 404
		const foundBuilding = allBuildings.find((b) => b.id == buildingID);
		if (!foundBuilding) {
			res.status(404).json(Generate404Error("building", buildingID));
			return;
		}

		const rooms = foundBuilding.rooms;
		const foundRoom = rooms.find((r) => r.id == roomID);
		if (!foundRoom) {
			res.status(404).json(Generate404Error("room", roomID));
			return;
		}

		foundBuilding.rooms = foundBuilding.rooms.filter((r) => !(r.id == roomID));
		await writeBuildingsToData(allBuildings);
		res.status(200).json(foundRoom);
	});

	app.post("/api/v2/datasets", upload.single("archive"), async (req, res) => {
		// SC 422
		let errorMessage = DatasetValidation(req);
		if (typeof errorMessage !== "boolean") {
			res.status(422).json(errorMessage);
			return;
		}

		// SC 200
		const id = generateSectionID();

		if (req.body.kind == "course_offerings") {
			const statObject = {
				id: id.toString(),
				status: "processing",
				kind: req.body.kind,
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
			} as UploadOfferingStats;
			bulkUploads.push(statObject);

			// const stats = statObject.stats;

			res.status(202).json({
				id: id.toString(),
				status: "processing",
				kind: "course_offerings",
				message: "Dataset accepted for processing",
			});

			// The file will be available as req.file
			// The zip content is in req.file.buffer
			const zipBuffer = req.file!.buffer;
			let zip;

			try {
				zip = await IsZipValid(zipBuffer);
			} catch (e: any) {
				statObject.status = "failed";
				if (e instanceof SearchEBNFError) {
					statObject.message = e.message;
				} else {
					res.status(500).send("Oh Hell Nah, WTF happened");
				}
				return;
			}

			// All files in courses
			const coursesFiles = Object.values(zip.files).filter(
				(file) => file.name.startsWith("courses/") && file.name !== "courses/" && !file.dir
			);

			const OfferingsInData = (await readPartOfData("course_offerings")) as Course[];

			const offeringUpload = await BulkUploadOfferings(coursesFiles, OfferingsInData);
			const updatedOfferingsForData = offeringUpload.OfferingsInData;

			await writeCoursesToData(updatedOfferingsForData);
			statObject.stats = offeringUpload.stats;
			statObject.status = "completed";
			statObject.message = "Dataset processing complete";
		} else {
			// kind == "facilites"

			const statObject = {
				id: id.toString(),
				status: "processing",
				kind: "facilities",
				stats: {
					buildings_added: 0,
					buildings_modified: 0,
					rooms_added: 0,
					rooms_modified: 0,
				},
				message: "Processing in progress",
			} as UploadFacilityStats;
			bulkUploads.push(statObject);

			res.status(202).json({
				id: id.toString(),
				status: "processing",
				kind: "facilities",
				message: "Dataset accepted for processing",
			});

			const buildingsinData = (await readPartOfData("facilities")) as Building[];

			// Check for Valid Zip File
			const zipBuffer = req.file!.buffer;
			let zip;
			// Use JSZip to process the buffer
			try {
				zip = await JSZip.loadAsync(zipBuffer);
			} catch (e) {
				statObject.status = "failed";
				statObject.message = "Data is not in a valid zip format";
				return;
			}

			if (!zip.files["index.htm"]) {
				statObject.status = "failed";
				statObject.message = "Missing index.htm file";
				return;
			}

			type FieldsWeCanAccess = {
				nodeName: string;
				childNodes?: FieldsWeCanAccess[];
				attrs?: {
					name: string;
					value: string;
				}[];
				value?: string; // for #text
			};

			const htmlContent = await zip.files["index.htm"].async("string");
			const halfBuiltBuildings = ParseBuildings(htmlContent, statObject);
			const fullBuiltBuildings = [] as Building[];
			let rooms = [] as Room[];
			for (const bld of halfBuiltBuildings!) {
				const fileLink = bld.link.substring(2); // remove the "./"
				const roomHTML = await zip.files[fileLink].async("string");

				const halfBuiltRooms = ParseRooms(roomHTML, statObject);

				if (halfBuiltRooms) {
					for (const room of halfBuiltRooms) {
						rooms.push({
							id: `${bld.shortName}_${room.number}`,
							building: bld.shortName,
							number: room.number,
							type: room.type,
							furniture: room.furniture,
							href: room.href,
							seats: Number(room.seats),
						});
					}
				}
				const res = await fetch(`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team037/${bld.address}`);
				const { lat, lon } = (await res.json()) as any;
				if (!lat || !lon) {
					continue;
				}
				fullBuiltBuildings.push({
					id: bld.shortName,
					name: bld.fullname,
					address: bld.address,
					lat: lat,
					lon: lon,
					rooms: rooms,
				});
			}

			let ba = 0;
			// let bm = 0;
			// let ra = 0;
			// let rm = 0;
			for (const bld of fullBuiltBuildings) {
				const foundBuilding = buildingsinData.find((build) => build.id == bld.id);
				if (foundBuilding) {
					foundBuilding.id = bld.id;
					foundBuilding.name = bld.name;
					foundBuilding.address = bld.address;
					foundBuilding.lat = bld.lat;
					foundBuilding.lon = bld.lon;
					foundBuilding.rooms = bld.rooms;
					// bm += 1;
				} else {
					buildingsinData.push(bld);
					ba += 1;
				}
			}
			await writeBuildingsToData(buildingsinData);
			statObject.status = "completed";
			statObject.message = "Dataset processing complete";
			statObject.stats.buildings_added = ba;
		}
	});

	app.get("/api/v2/datasets/:dataset", async (req, res) => {
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
		res.status(200).json(foundUpload);
	});

	app.post("/api/v2/search", async (req, res) => {
		// SC 422
		const body = req.body as SearchRequestBody;
		const validation = SearchFacilitiesValidationError(body);
		if (!(typeof validation === "boolean")) {
			res.status(422).json(validation);
			return;
		}

		// SC 400
		const where = body.query.WHERE;
		if (where === undefined) {
			res.status(400).json(EBNFError("Missing WHERE"));
			return;
		}

		const options = body.query.OPTIONS;
		if (options === undefined) {
			res.status(400).json(EBNFError("Missing OPTIONS"));
			return;
		}

		const columns = options.COLUMNS;
		if (columns && columns.length == 0) {
			res.status(400).json(EBNFError("Missing COLUMNS"));
			return;
		}

		if (
			columns.some(
				(key) =>
					!(
						MFieldArrOffering.includes(key) ||
						SFieldArrOffering.includes(key) ||
						MFieldArrFacility.includes(key) ||
						SFieldArrFacility.includes(key)
					)
			)
		) {
			res.status(400).json(EBNFError("Unknown key in COLUMNS"));
			return;
		}

		const order = options.ORDER;
		if (order) {
			if (typeof order === "string") {
				if (!columns.includes(order)) {
					res.status(400).json(EBNFError("ORDER must be a key in COLUMNS"));
					return;
				}
			} else {
				for (const key of order.keys) {
					if (!columns.includes(key)) {
						res.status(400).json(EBNFError("All ORDER keys must be in COLUMNS"));
					}
				}
				if (!(order.dir == "UP" || order.dir == "DOWN")) {
					res.status(400).json(EBNFError("Invalid sort direction (must be UP or DOWN)"));
				}
			}
		}

		if (Object.keys(where).length > 1) {
			res.status(400).json(EBNFError("WHERE must be an object with at most one FILTER"));
		}

		const optionKeys = Object.keys(options);
		if (!optionKeys.includes("COLUMNS")) {
			res.status(400).json(EBNFError("OPTIONS must be an object with COLUMNS and optional ORDER"));
		}

		const transformations = body.query.TRANSFORMATIONS;
		if (transformations) {
			if (!transformations.GROUP) {
				res.status(400).json(EBNFError("Missing GROUP in TRANSFORMATIONS"));
				return;
			}
			if (!transformations.APPLY) {
				res.status(400).json(EBNFError("Missing APPLY in TRANSFORMATIONS"));
				return;
			}

			if (transformations.GROUP.length == 0) {
				res.status(400).json(EBNFError("GROUP must be a non-empty array"));
				return;
			}
			if (!Array.isArray(transformations.APPLY)) {
				res.status(400).json(EBNFError("APPLY must be an array"));
				return;
			}

			for (const g of transformations.GROUP) {
				if (!columns.includes(g)) {
					res.status(400).json(EBNFError("When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY"));
					return;
				}
			}
			for (const a of transformations.APPLY) {
				const requiredInColumns = Object.keys(a);
				for (const required of requiredInColumns) {
					if (!columns.includes(required)) {
						res.status(400).json(EBNFError("When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY"));
						return;
					}
				}
			}
		}

		if (body.kind == "course_offerings") {
			const courses = (await readPartOfData("course_offerings")) as Course[];

			let columnedCourses = [];
			try {
				columnedCourses = OfferingFieldsForColumn(courses, columns);
			} catch (e: any) {
				res.status(400).json((e as SearchEBNFError).message);
				return;
			}

			try {
				const filteredCourses = SearchOfferings(where, columnedCourses);
				if (filteredCourses.length > 5000) {
					res.status(413).json({
						error: "Too many results",
						message: "Query would return more than 5000 results",
						limit: 5000,
					});
					return;
				}

				// TODO: Ask Ben
				if (order) {
					if (typeof order == "string") {
						filteredCourses.sort((a: any, b: any) => {
							if (typeof a[order] == "string") {
								return a[order].localeCompare(b[order]);
							} else if (typeof a[order] == "number") {
								return a[order] - b[order];
							} else {
								return -1;
							}
						});
					} else {
						if (order.dir == "UP") {
							filteredCourses.sort((a: any, b: any) => {
								for (const key of order.keys) {
									let result = 0;
									if (typeof a[key] === "string" && typeof b[key] === "string") {
										result = a[key].localeCompare(b[key]);
									} else if (typeof a[key] === "number" && typeof b[key] === "number") {
										result = a[key] - b[key];
									}
									// No Tie breaker needed
									if (result !== 0) {
										return result;
									}
								}
								// Everything is tied, keep same order
								return 0;
							});
						} else {
							// order.dir == "DOWN" // Reversed Case
							filteredCourses.sort((a: any, b: any) => {
								for (const key of order.keys) {
									let result = 0;
									if (typeof a[key] === "string" && typeof b[key] === "string") {
										result = b[key].localeCompare(a[key]);
									} else if (typeof a[key] === "number" && typeof b[key] === "number") {
										result = b[key] - a[key];
									}
									// No Tie breaker needed
									if (result !== 0) {
										return result;
									}
								}
								// Everything is tied, keep same order
								return 0;
							});
						}
					}
				}

				res.status(200).json(filteredCourses);
			} catch (e: any) {
				res.status(400).json(EBNFError((e as SearchEBNFError).message));
				return;
			}
		} else if (body.kind == "facilities") {
			const buildings = (await readPartOfData("facilities")) as Building[];

			let columnedBuildings = [];
			try {
				columnedBuildings = FacilityFieldsForColumn(buildings, columns);
			} catch (e: any) {
				res.status(400).json((e as SearchEBNFError).message); // no mixing offering and facility fields
				return;
			}

			try {
				const filteredBuildings = SearchFacilities(where, columnedBuildings);
				if (filteredBuildings.length > 5000) {
					res.status(413).json({
						error: "Too many results",
						message: "Query would return more than 5000 results",
						limit: 5000,
					});
					return;
				}

				if (order) {
					if (typeof order == "string") {
						columnedBuildings.sort((a: any, b: any) => {
							if (typeof a[order] == "string") {
								return a[order].localeCompare(b[order]);
							} else if (typeof a[order] == "number") {
								return a[order] - b[order];
							} else {
								return -1;
							}
						});
					} else {
						if (order.dir == "UP") {
							columnedBuildings.sort((a: any, b: any) => {
								for (const key of order.keys) {
									let result = 0;
									if (typeof a[key] === "string" && typeof b[key] === "string") {
										result = a[key].localeCompare(b[key]);
									} else if (typeof a[key] === "number" && typeof b[key] === "number") {
										result = a[key] - b[key];
									}
									// No Tie breaker needed
									if (result !== 0) {
										return result;
									}
								}
								// Everything is tied, keep same order
								return 0;
							});
						} else {
							// order.dir == "DOWN" // Reversed Case
							columnedBuildings.sort((a: any, b: any) => {
								for (const key of order.keys) {
									let result = 0;
									if (typeof a[key] === "string" && typeof b[key] === "string") {
										result = b[key].localeCompare(a[key]);
									} else if (typeof a[key] === "number" && typeof b[key] === "number") {
										result = b[key] - a[key];
									}
									// No Tie breaker needed
									if (result !== 0) {
										return result;
									}
								}
								// Everything is tied, keep same order
								return 0;
							});
						}
					}
				}

				res.status(200).json(filteredBuildings);
			} catch (e: any) {
				res.status(400).json(EBNFError((e as SearchEBNFError).message));
			}
		} else {
			throw new Error("Why are you here? kind: offering/facility error");
		}
	});

	return app;
}
