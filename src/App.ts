import fs from "fs/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
//a
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

	const DATA_FILE = "data.json";

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

	async function writeData(data: any[]): Promise<void> {
		await fs.writeFile(
			DATA_FILE,
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

	return app;
}
