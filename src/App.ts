import fs from "fs/promises";
import express from "express";
import cors from "cors";

import multer from "multer";
import JSZip from "jszip";

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

	type Course = {
		id: string;
		title: string;
		dept: string;
		code: string;
		sections?: Section[];
		[k: string]: any;
	};

	type Section = {
		id: string;
		instructor: string;
		year: number;
		avg: number;
		pass: number;
		fail: number;
		audit: number;
		[k: string]: any;
	};

	type Offering = {
		id: number;
		Course: string;
		Title: string;
		Professor: string;
		Subject: string;
		Section: string;
		Year: string;
		Avg: number;
		Pass: number;
		Fail: number;
		Audit: number;
	};
	type Upload = {
		id: string;
		status: "processing" | "completed" | "failed";
		kind: string;
		stats?: Record<string, number>;
		message?: string;
	};

	const DATA_FILE = "data.json";

	const UPLOAD_FILE = "uploadFile.json";

	// Basic message to verify REST API is available
	// You can see the message by going to http://localhost:<port>/api
	app.get("/api", (_req, res) => {
		res.send("App is running!");
	});

	async function readData(): Promise<Course[]> {
		try {
			const data = await fs.readFile(DATA_FILE, "utf-8");
			return JSON.parse(data);
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

	function isInt(n: unknown): n is number {
		return typeof n === "number" && Number.isInteger(n);
	}

	function isNum(n: unknown): n is number {
		return typeof n === "number" && Number.isFinite(n);
	}

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
		let limit = parseInt(req.query.limit as string);
		let offset = parseInt(req.query.offset as string);
		if (isNaN(limit)) {
			limit = 100;
		}
		if (limit < 1 || limit > 5000) {
			res.status(400).json({ error: "limit must be between 1 and 5000" });
			return;
		}
		if (isNaN(offset)) {
			offset = 0;
		}

		if (offset < 0) {
			res.status(400).json({ error: "offset must be >= 0" });
			return;
		}

		const sort = [...data].sort((a, b) => a.id.localeCompare(b.id));
		const items = sort.slice(offset, offset + limit);

		res.json({
			total: data.length,
			limit,
			offset,
			items,
		});
	});

	//Retrieve a course
	app.get("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = await readData();
		const id = req.params.course;

		const course = data.find((c) => c.id === id);

		if (!course) {
			res.status(404).json({ error: "Course not found" });
			return;
		}

		res.json({
			...course,
			links: {
				self: `/api/v1/courses/${id}`,
				sections: `/api/v1/courses/${id}/sections`,
			},
		});
	});

	//Create or replace a course

	app.put("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const id = req.params.course;

		const { title, dept, code } = req.body ?? {};
		if (typeof title !== "string" || typeof dept !== "string" || typeof code !== "string") {
			res.status(422).json({ error: "title, dept, and code are required and must be strings" });
			return;
		}
		const data: Course[] = await readData();
		const newCourse: Course = { id, title, dept, code };
		const index = data.findIndex((c) => c.id === id);

		if (index === -1) {
			data.push(newCourse);
			await writeData(data);

			res.status(201).json({
				...newCourse,
				links: {
					self: `/api/v1/courses/${id}`,
					sections: `/api/v1/courses/${id}/sections`,
				},
			});
			return;
		}
		data[index] = newCourse;
		await writeData(data);

		res.status(204).send();
	});

	//Remove a course
	app.delete("/api/v1/courses/:course", async (req, res): Promise<void> => {
		const data = await readData();
		const id = req.params.course;
		const index = data.findIndex((c) => c.id === id);

		if (index === -1) {
			res.status(404).json({ error: "Course not found" });
			return;
		}
		const courseDelete = data[index];
		data.splice(index, 1);
		await writeData(data);
		res.status(200).json(courseDelete);
	});

	//Retrieve a list of sections for a course
	app.get("/api/v1/courses/:course/sections", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const id = req.params.course;

		const course = data.find((c) => c.id === id);

		if (!course) {
			res.status(404).json({ error: "Course not found" });
			return;
		}

		const limitParsed = parseIntParam(req.query.limit);
		const offsetParsed = parseIntParam(req.query.offset);

		const limit = limitParsed ?? 100;
		const offset = offsetParsed ?? 0;
		if (limit < 1 || limit > 5000 || offset < 0) {
			res.status(400).json({ error: "Invalid request parameters" });
			return;
		}

		const sections: Section[] = Array.isArray(course.sections) ? course.sections : [];
		const sortedSection = [...sections].sort((a, b) =>
			String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
		);
		const items = sortedSection.slice(offset, offset + limit);

		res.status(200).json({
			total: sections.length,
			limit,
			offset,
			items,
		});
	});

	// Retrieve a section for a course
	app.get("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const courseId = req.params.course;
		const sectionId = req.params.section;

		const course = data.find((c) => c.id === courseId);

		if (!course) {
			res.status(404).json({ error: "Course not found" });
			return;
		}

		const sections: Section[] = Array.isArray(course.sections) ? course.sections : [];
		const section = sections.find((s) => String(s.id) === sectionId);

		if (!section) {
			res.status(404).json({ error: "Not found" });
			return;
		}

		res.status(200).json({
			...section,
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

		if (!course) {
			res.status(404).json({ error: "Course not found" });
			return;
		}
		if (!Array.isArray(course.sections)) course.sections = [];

		const { instructor, year, avg, pass, fail, audit } = req.body ?? {};
		const yearCheck = isInt(year) && /^(19|20)\d{2}$/.test(String(year));
		const avgCheck = isNum(avg) && avg >= 0 && avg <= 100;
		const check = (x: unknown) => isInt(x) && x >= 0;
		if (
			typeof instructor != "string" ||
			instructor.length === 0 ||
			!yearCheck ||
			!avgCheck ||
			!check(pass) ||
			!check(fail) ||
			!check(audit)
		) {
			res.status(422).json({ error: "Validation failed" });
			return;
		}

		const newSection: Section = { id: sectionId, instructor, year, avg, pass, fail, audit };

		const index = course.sections.findIndex((s) => String(s.id) === sectionId);
		if (index === -1) {
			course.sections.push(newSection);
			await writeData(data);
			res.status(201).json({
				...newSection,
				links: {
					self: `/api/v1/courses/${courseId}/sections/${sectionId}`,
					course: `/api/v1/courses/${courseId}`,
				},
			});
			return;
		}
		course.sections[index] = newSection;
		await writeData(data);
		res.status(204).send();
	});

	//Remove a section from a course
	app.delete("/api/v1/courses/:course/sections/:section", async (req, res): Promise<void> => {
		const data: Course[] = await readData();
		const courseId = req.params.course;
		const sectionId = req.params.section;

		const course = data.find((c) => String(c.id) === courseId);
		if (!course || !Array.isArray(course.sections)) {
			res.status(404).json({ error: "Not found" });
			return;
		}

		const index = data.findIndex((s) => String(s.id) === sectionId);

		if (index === -1) {
			res.status(404).json({ error: "Not found" });
			return;
		}
		const sectionDelete = course.sections[index];
		course.sections.splice(index, 1);
		await writeData(data);
		res.status(200).json(sectionDelete);
	});

	//Retrieve upload statistics
	app.get("/api/v1/datasets/:id", async (req, res): Promise<void> => {
		const id = req.params.id;
		const datas = await readUploads();
		const data = datas.find((j) => j.id === id);

		if (!data) {
			res.status(404).json({ error: "Not found", message: "no dataset with id 'upload_12345'" });
			return;
		}

		res.status(200).json(data);
	});

	app.post("/api/v1/datasets", upload.single("archive"), async (req, res): Promise<void> => {
		const kind = req.body.kind;
		if (kind !== "course_offerings" || !req.file) {
			res.status(422).json({ error: "Validation failed" });
			return;
		}
		const dataId = `upload_${Date.now()}_${Math.random().toString(16).slice(2)}`; //ChatGPT
		const data: Upload = {
			id: dataId,
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		};

		const datas = await readUploads();
		datas.push(data);
		await writeUpload(datas);

		res.status(202).json(data);

		setImmediate(() => processDataset(dataId, req.file!.buffer).catch(() => void 0)); //ChatGPT
	});

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

				if (current.title != offer.Title) {
					current.title = offer.Title;
					updated = true;
				}

				if (updated) stats.courses_modified = stats.courses_modified + 1;
				if (!Array.isArray(current.sections)) current.sections = [];
			}
		}

		for (const offer of offerings) {
			stats.courses_seen = stats.courses_seen + 1;
			const courseId = `${offer.Subject}${offer.Course}`;
			const course = courseMap.get(courseId);
			if (!course) continue;
			if (!Array.isArray(course.sections)) course.sections = [];
			const secId = String(offer.id);
			const currSecId = course.sections.findIndex((s) => s.id === secId);
			const newSection: Section = {
				id: secId,
				instructor: offer.Professor,
				year: Number.isFinite(Number.parseInt(offer.Year, 10)) ? Number.parseInt(offer.Year, 10) : 1900,
				avg: offer.Avg,
				pass: offer.Pass,
				fail: offer.Fail,
				audit: offer.Audit,
			};
			if (currSecId === -1) {
				course.sections.push(newSection);
				stats.sections_added = stats.sections_added + 1;
			} else {
				const current = course.sections[currSecId];
				const updated =
					current.instructor !== newSection.instructor ||
					current.year !== newSection.year ||
					current.avg !== newSection.avg ||
					current.pass !== newSection.pass ||
					current.fail !== newSection.fail ||
					current.audit !== newSection.audit;
				if (updated) {
					course.sections[currSecId] = newSection;
					stats.sections_modified = stats.sections_modified + 1;
				}
			}
		}
		await writeData(courseData);

		data.status = "completed";
		data.stats = stats;
		data.message = "Dataset processing complete";

		await writeUpload(datas);
	}
	return app;
}
