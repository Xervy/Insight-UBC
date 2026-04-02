import fs from "fs/promises";
import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Application, createApp } from "../src/App";
import { NOTFOUND } from "dns";
import path from "path";
import { access } from "fs";
import { defaultMaxListeners } from "events";

const {
	OK, // 200
	// Other common codes are:
	CREATED, // 201
	ACCEPTED, // 202
	NO_CONTENT, // 204
	NOT_FOUND, // 404
	BAD_REQUEST, // 400
	UNPROCESSABLE_ENTITY, //422
	REQUEST_TOO_LONG, //413
} = StatusCodes;

// Do not change datadir
const datadir = "./data" as const;

describe("REST API v1", function () {
	let app: Application;
	let idSet: Set<String>;
	let datadir = "./data";

	before(async () => {
		await fs.mkdir(datadir, { recursive: true });
	}); //ChatGPT

	beforeEach(async () => {
		app = await createApp({ datadir });
		idSet = new Set<String>();
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	describe("POST Datasets v1", async function () {
		it("POST /api/v1/datasets - Expected: 422 - Missing", async () => {
			const uploadRes = await request(app).post("/api/v1/datasets");
			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "required but missing",
					archive: "required but missing",
				},
			});
		});

		it("POST /api/v1/datasets - Expected: 422 - Expected Different", async () => {
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "yeet")
				.attach("archive", Buffer.alloc(0), "courses.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings",
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v1/datasets - Expected: 422 - Mixed", async () => {
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", Buffer.alloc(0), "courses.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v1/datasets - Expected: 202 - No Courses Folder", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/no_courses.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			expect(uploadRes).to.have.property("status", ACCEPTED);
			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
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
				message: "Missing root courses directory",
			});
		});

		it("POST /api/v1/datasets - Expected: 422 - Expected Different", async () => {
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "yeet")
				.attach("archive", Buffer.alloc(0), "courses.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings",
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v1/datasets - Expected: 422 - Mixed", async () => {
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", Buffer.alloc(0), "courses.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v1/datasets - Expected: 202 - No Courses Folder", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/no_courses.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			expect(uploadRes).to.have.property("status", ACCEPTED);
			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
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
				message: "Missing root courses directory",
			});
		});
	});

	describe("GET Datasets v1", async function () {
		it("GET /api/v1/datasets/none - Expected: 404", async () => {
			const res = await request(app).get("/api/v1/datasets/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no dataset with id 'none'",
			});
		});

		it("GET /api/v1/datasets/[uploadID] - Expected: 202", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/item1.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: 1,
					files_processed: 1,
					files_skipped: 0,
					courses_seen: 2,
					courses_added: 1,
					courses_modified: 1,
					sections_seen: 2,
					sections_added: 2,
					sections_modified: 0,
				},
				message: "Dataset processing complete",
			});
		});

		it("GET /api/v1/datasets/[uploadID] - Expected: 202 - 3 Files", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/3_files.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: 3,
					files_processed: 3,
					files_skipped: 0,
					courses_seen: 11,
					courses_added: 5,
					courses_modified: 6,
					sections_seen: 11,
					sections_added: 7,
					sections_modified: 4,
				},
				message: "Dataset processing complete",
			});
			const check = await request(app).get("/api/v1/courses");
			expect(check).to.have.property("status", OK);
			expect(check).to.have.deep.property("body", {
				total: 5,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "CPSC210",
						title: "Object Oriented Programming",
						dept: "CPSC",
						code: "210",
						links: {
							self: "/api/v1/courses/CPSC210",
							sections: "/api/v1/courses/CPSC210/sections",
						},
					},
					{
						id: "CPSC310",
						title: "Software Engineering",
						dept: "CPSC",
						code: "310",
						links: {
							self: "/api/v1/courses/CPSC310",
							sections: "/api/v1/courses/CPSC310/sections",
						},
					},
					{
						id: "MATH100",
						title: "Derivatives",
						dept: "MATH",
						code: "100",
						links: {
							self: "/api/v1/courses/MATH100",
							sections: "/api/v1/courses/MATH100/sections",
						},
					},
					{
						id: "MATH101",
						title: "Integrals",
						dept: "MATH",
						code: "101",
						links: {
							self: "/api/v1/courses/MATH101",
							sections: "/api/v1/courses/MATH101/sections",
						},
					},
					{
						id: "MATH112",
						title: "Algebra",
						dept: "MATH",
						code: "112",
						links: {
							self: "/api/v1/courses/MATH112",
							sections: "/api/v1/courses/MATH112/sections",
						},
					},
				],
			});
			const c310 = await request(app).get("/api/v1/courses/CPSC310/sections");
			expect(c310).to.have.property("status", OK);
			expect(c310).to.have.deep.property("body", {
				total: 2,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "0",
						instructor: "Nick Bradley",
						year: 2025,
						avg: 75,
						pass: 100,
						fail: 50,
						audit: 0,
						links: {
							self: "/api/v1/courses/CPSC310/sections/0",
							course: "/api/v1/courses/CPSC310",
						},
					},
					{
						id: "1",
						instructor: "Nick Bradley",
						year: 2025,
						avg: 77,
						pass: 120,
						fail: 40,
						audit: 10,
						links: {
							self: "/api/v1/courses/CPSC310/sections/1",
							course: "/api/v1/courses/CPSC310",
						},
					},
				],
			});

			const m112 = await request(app).get("/api/v1/courses/MATH112/sections");
			expect(m112).to.have.property("status", OK);
			expect(m112).to.have.deep.property("body", {
				total: 2,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "4",
						instructor: "Pee Dawg",
						year: 2021,
						avg: 90,
						pass: 166,
						fail: 10,
						audit: 2,
						links: {
							self: "/api/v1/courses/MATH112/sections/4",
							course: "/api/v1/courses/MATH112",
						},
					},
					{
						id: "5",
						instructor: "Pee Dawg",
						year: 2021,
						avg: 90,
						pass: 166,
						fail: 10,
						audit: 2,
						links: {
							self: "/api/v1/courses/MATH112/sections/5",
							course: "/api/v1/courses/MATH112",
						},
					},
				],
			});
		});

		it("GET /api/v1/datasets/none - Expected: 404", async () => {
			const res = await request(app).get("/api/v1/datasets/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no dataset with id 'none'",
			});
		});

		it("GET /api/v1/datasets/[uploadID] - Expected: 202", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/item1.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: 1,
					files_processed: 1,
					files_skipped: 0,
					courses_seen: 2,
					courses_added: 1,
					courses_modified: 1,
					sections_seen: 2,
					sections_added: 2,
					sections_modified: 0,
				},
				message: "Dataset processing complete",
			});
		});

		it("GET /api/v1/datasets/[uploadID] - Expected: 202 - 3 Files", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/3_files.zip"));
			const uploadRes = await request(app)
				.post("/api/v1/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			let res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v1/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: 3,
					files_processed: 3,
					files_skipped: 0,
					courses_seen: 11,
					courses_added: 5,
					courses_modified: 6,
					sections_seen: 11,
					sections_added: 7,
					sections_modified: 4,
				},
				message: "Dataset processing complete",
			});
		});
	});

	it("GET /api should respond with status OK and text 'App is running!'", async () => {
		const res = await request(app).get("/api");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.property("text", "App is running!");
	});

	describe("Courses", async function () {
		it("GET /api/v1/courses - Expected: OK - Default", async () => {
			const res = await request(app).get("/api/v1/courses");
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v1/courses - Expected: OK - In Bounds", async () => {
			const res = await request(app).get("/api/v1/courses?limit=2000&offset=5");
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 2000,
				offset: 5,
				items: [],
			});
		});

		it("GET /api/v1/courses - Expected: OK - On Bounds", async () => {
			const resLow = await request(app).get("/api/v1/courses?limit=1&offset=0");
			expect(resLow).to.have.property("status", OK);
			expect(resLow).to.have.deep.property("body", {
				total: 0,
				limit: 1,
				offset: 0,
				items: [],
			});

			const resHi = await request(app).get("/api/v1/courses?limit=5000&offset=0");
			expect(resHi).to.have.property("status", OK);
			expect(resHi).to.have.deep.property("body", {
				total: 0,
				limit: 5000,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v1/courses - Bounds +1", async () => {
			const resLow = await request(app).get("/api/v1/courses?limit=2&offset=1");
			expect(resLow).to.have.property("status", OK);
			expect(resLow).to.have.deep.property("body", {
				total: 0,
				limit: 2,
				offset: 1,
				items: [],
			});

			const resHi = await request(app).get("/api/v1/courses?limit=5001&offset=1");
			expect(resHi).to.have.property("status", BAD_REQUEST);
			expect(resHi).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
				},
			});
		});

		it("GET /api/v1/courses - Bounds -1", async () => {
			const resLow = await request(app).get("/api/v1/courses?limit=0&offset=-1");
			expect(resLow).to.have.property("status", BAD_REQUEST);
			expect(resLow).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
					offset: "expected an integer >= 0",
				},
			});

			const resHi = await request(app).get("/api/v1/courses?limit=4999&offset=-1");
			expect(resHi).to.have.property("status", BAD_REQUEST);
			expect(resHi).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					offset: "expected an integer >= 0",
				},
			});
		});

		it("GET /api/v1/courses/noCourse - Expected: 404 - No Course", async () => {
			const res = await request(app).get("/api/v1/courses/noCourse");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'noCourse'",
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 201", async () => {
			const res = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "cpsc310",
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
				links: {
					self: "/api/v1/courses/cpsc310",
					sections: "/api/v1/courses/cpsc310/sections",
				},
			});

			const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
			expect(list).to.have.property("status", OK);
			expect(list).to.have.deep.property("body", {
				total: 1,
				limit: 2000,
				offset: 0,
				items: [
					{
						id: "cpsc310",
						title: "Introduction to Software Engineering",
						dept: "Computer Science",
						code: "310",
						links: {
							self: "/api/v1/courses/cpsc310",
							sections: "/api/v1/courses/cpsc310/sections",
						},
					},
				],
			});

			const crs = await request(app).get("/api/v1/courses/cpsc310");
			expect(crs).to.have.property("status", OK);
			expect(crs).to.have.deep.property("body", {
				id: "cpsc310",
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
				links: {
					self: "/api/v1/courses/cpsc310",
					sections: "/api/v1/courses/cpsc310/sections",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 204", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const res = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			expect(res).to.have.property("status", NO_CONTENT);

			const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
			expect(list).to.have.property("status", OK);
			expect(list).to.have.deep.property("body", {
				total: 1,
				limit: 2000,
				offset: 0,
				items: [
					{
						id: "cpsc310",
						title: "Introduction to Software Engineering",
						dept: "Computer Science",
						code: "310",
						links: {
							self: "/api/v1/courses/cpsc310",
							sections: "/api/v1/courses/cpsc310/sections",
						},
					},
				],
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Title Error", async () => {
			const non = await request(app).put("/api/v1/courses/cpsc310").send({
				dept: "Computer Science",
				code: "310",
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					title: "required but missing",
				},
			});

			const num = await request(app).put("/api/v1/courses/cpsc310").send({
				title: 5,
				dept: "Computer Science",
				code: "310",
			});
			expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(num).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					title: "expected a string",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Dept Error", async () => {
			const non = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				code: "310",
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					dept: "required but missing",
				},
			});

			const num = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: 5,
				code: "310",
			});
			expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(num).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					dept: "expected a string",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Code Error", async () => {
			const non = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					code: "required but missing",
				},
			});

			const num = await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: 310,
			});
			expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(num).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					code: "expected a string",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Mixed Error", async () => {
			const non = await request(app).put("/api/v1/courses/cpsc310").send({
				dept: "Computer Science",
				code: 310,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					title: "required but missing",
					code: "expected a string",
				},
			});
		});

		it("DELETE /api/v1/courses/none - Expected: 404", async () => {
			const res = await request(app).del("/api/v1/courses/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'none'",
			});
		});

		it("DELETE /api/v1/courses/cpsc310 - Expected: 200", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			await request(app).put("/api/v1/courses/cpsc210").send({
				title: "Software Construction",
				dept: "Computer Science",
				code: "210",
			});

			const res = await request(app).del("/api/v1/courses/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'none'",
			});

			const init = await request(app).get("/api/v1/courses");
			expect(init).to.have.property("status", OK);
			expect(init).to.have.deep.property("body", {
				total: 2,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "cpsc210",
						title: "Software Construction",
						dept: "Computer Science",
						code: "210",
						links: {
							self: "/api/v1/courses/cpsc210",
							sections: "/api/v1/courses/cpsc210/sections",
						},
					},
					{
						id: "cpsc310",
						title: "Introduction to Software Engineering",
						dept: "Computer Science",
						code: "310",
						links: {
							self: "/api/v1/courses/cpsc310",
							sections: "/api/v1/courses/cpsc310/sections",
						},
					},
				],
			});

			const todel = await request(app).del("/api/v1/courses/cpsc310");
			expect(todel).to.have.property("status", OK);
			expect(todel).to.have.deep.property("body", {
				id: "cpsc310",
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
				sections: 0,
			});

			const check = await request(app).get("/api/v1/courses");
			expect(check).to.have.property("status", OK);
			expect(check).to.have.deep.property("body", {
				total: 1,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "cpsc210",
						title: "Software Construction",
						dept: "Computer Science",
						code: "210",
						links: {
							self: "/api/v1/courses/cpsc210",
							sections: "/api/v1/courses/cpsc210/sections",
						},
					},
				],
			});
		});
	});

	describe("SECTIONS", async function () {
		it("GET /api/v1/courses/cpsc310/sections - Expected: 404", async () => {
			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'cpsc310'",
			});
		});

		it("GET /api/v1/courses/cpsc310/sections - Expected: OK - Default", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v1/courses/cpsc310/sections - Expected: OK - In Bounds", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const res = await request(app).get("/api/v1/courses/cpsc310/sections?limit=2000&offset=5");
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 2000,
				offset: 5,
				items: [],
			});
		});

		it("GET /api/v1/courses/cpsc310/sections - Expected: OK - On Bounds", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=1&offset=0");
			expect(resLow).to.have.property("status", OK);
			expect(resLow).to.have.deep.property("body", {
				total: 0,
				limit: 1,
				offset: 0,
				items: [],
			});

			const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=5000&offset=0");
			expect(resHi).to.have.property("status", OK);
			expect(resHi).to.have.deep.property("body", {
				total: 0,
				limit: 5000,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v1/courses/cpsc310/sections - Bounds +1", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=2&offset=1");
			expect(resLow).to.have.property("status", OK);
			expect(resLow).to.have.deep.property("body", {
				total: 0,
				limit: 2,
				offset: 1,
				items: [],
			});

			const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=5001&offset=1");
			expect(resHi).to.have.property("status", BAD_REQUEST);
			expect(resHi).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
				},
			});
		});

		it("GET /api/v1/courses/cpsc310/sections - Bounds -1", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=0&offset=-1");
			expect(resLow).to.have.property("status", BAD_REQUEST);
			expect(resLow).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
					offset: "expected an integer >= 0",
				},
			});

			const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=4999&offset=-1");
			expect(resHi).to.have.property("status", BAD_REQUEST);
			expect(resHi).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					offset: "expected an integer >= 0",
				},
			});
		});

		it("GET /api/v1/courses/nothing/sections/none - Expected: 404 - No Course", async () => {
			const res = await request(app).get("/api/v1/courses/nothing/sections/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'nothing'",
			});
		});

		it("GET /api/v1/courses/cpsc310/sections/none - Expected: 404 - No Section", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const res = await request(app).get("/api/v1/courses/cpsc310/sections/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no section with id 'none'",
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected: 404 - No Course", async () => {
			const res = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'cpsc310'",
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected: 201 - Multiple", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			const res = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "21w201",
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
				links: {
					self: "/api/v1/courses/cpsc310/sections/21w201",
					course: "/api/v1/courses/cpsc310",
				},
			});

			const list = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(list).to.have.property("status", OK);
			expect(list).to.have.deep.property("body", {
				total: 1,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "21w201",
						instructor: "holmes, reid",
						year: 2021,
						avg: 76.4,
						pass: 167,
						fail: 3,
						audit: 1,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w201",
							course: "/api/v1/courses/cpsc310",
						},
					},
				],
			});

			const crs = await request(app).get("/api/v1/courses/cpsc310/sections/21w201");
			expect(crs).to.have.property("status", OK);
			expect(crs).to.have.deep.property("body", {
				id: "21w201",
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
				links: {
					self: "/api/v1/courses/cpsc310/sections/21w201",
					course: "/api/v1/courses/cpsc310",
				},
			});

			// Second Put
			await request(app).put("/api/v1/courses/cpsc310/sections/21w202").send({
				instructor: "bradley, nick",
				year: 2021,
				avg: 77.1,
				pass: 172,
				fail: 1,
				audit: 0,
			});
			const list2 = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(list2).to.have.property("status", OK);
			expect(list2).to.have.deep.property("body", {
				total: 2,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "21w201",
						instructor: "holmes, reid",
						year: 2021,
						avg: 76.4,
						pass: 167,
						fail: 3,
						audit: 1,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w201",
							course: "/api/v1/courses/cpsc310",
						},
					},
					{
						id: "21w202",
						instructor: "bradley, nick",
						year: 2021,
						avg: 77.1,
						pass: 172,
						fail: 1,
						audit: 0,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w202",
							course: "/api/v1/courses/cpsc310",
						},
					},
				],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected: 204", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			const res = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(res).to.have.property("status", NO_CONTENT);

			const list = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(list).to.have.property("status", OK);
			expect(list).to.have.deep.property("body", {
				total: 1,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "21w201",
						instructor: "holmes, reid",
						year: 2021,
						avg: 76.4,
						pass: 167,
						fail: 3,
						audit: 1,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w201",
							course: "/api/v1/courses/cpsc310",
						},
					},
				],
			});

			const crs = await request(app).get("/api/v1/courses/cpsc310/sections/21w201");
			expect(crs).to.have.property("status", OK);
			expect(crs).to.have.deep.property("body", {
				id: "21w201",
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
				links: {
					self: "/api/v1/courses/cpsc310/sections/21w201",
					course: "/api/v1/courses/cpsc310",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Instructor Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					instructor: "required but missing",
				},
			});

			const bad = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: 5,
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(bad).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(bad).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					instructor: "expected a string",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Year Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					year: "required but missing",
				},
			});

			const badL = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 1899,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(badL).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(badL).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					year: "expected a number between 1900 and 2099",
				},
			});

			const badH = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2100,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(badH).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(badH).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					year: "expected a number between 1900 and 2099",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Avg Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					avg: "required but missing",
				},
			});

			const badL = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: -1,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(badL).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(badL).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					avg: "expected a number between 0 and 100",
				},
			});

			const badH = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 101,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			expect(badH).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(badH).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					avg: "expected a number between 0 and 100",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Pass Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				fail: 3,
				audit: 1,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					pass: "required but missing",
				},
			});

			const bad = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: -1,
				fail: 3,
				audit: 1,
			});
			expect(bad).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(bad).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					pass: "expected a number >= 0",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Fail Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				audit: 1,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					fail: "required but missing",
				},
			});

			const bad = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: -1,
				audit: 1,
			});
			expect(bad).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(bad).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					fail: "expected a number >= 0",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Audit Error", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const non = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
			});
			expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(non).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					audit: "required but missing",
				},
			});

			const bad = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: -1,
			});
			expect(bad).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(bad).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					audit: "expected a number >= 0",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 422 - Mixed", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const mix = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: 0,
				avg: 105,
				pass: -5,
				fail: 34,
			});
			expect(mix).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(mix).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					instructor: "expected a string",
					year: "required but missing",
					avg: "expected a number between 0 and 100",
					pass: "expected a number >= 0",
					audit: "required but missing",
				},
			});
		});

		it("PUT /api/v1/courses/cpsc310/sections/21w201 - Expected 201 - On Bounds", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const lo = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 1900,
				avg: 0,
				pass: 0,
				fail: 0,
				audit: 0,
			});
			expect(lo).to.have.property("status", CREATED);
			expect(lo).to.have.deep.property("body", {
				id: "21w201",
				instructor: "holmes, reid",
				year: 1900,
				avg: 0,
				pass: 0,
				fail: 0,
				audit: 0,
				links: {
					self: "/api/v1/courses/cpsc310/sections/21w201",
					course: "/api/v1/courses/cpsc310",
				},
			});

			const hi = await request(app).put("/api/v1/courses/cpsc310/sections/21w202").send({
				instructor: "bradley, nick",
				year: 2099,
				avg: 100,
				pass: 1,
				fail: 1,
				audit: 1,
			});
			expect(hi).to.have.property("status", CREATED);
			expect(hi).to.have.deep.property("body", {
				id: "21w202",
				instructor: "bradley, nick",
				year: 2099,
				avg: 100,
				pass: 1,
				fail: 1,
				audit: 1,
				links: {
					self: "/api/v1/courses/cpsc310/sections/21w202",
					course: "/api/v1/courses/cpsc310",
				},
			});

			const res = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(res).to.have.deep.property("body", {
				total: 2,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "21w201",
						instructor: "holmes, reid",
						year: 1900,
						avg: 0,
						pass: 0,
						fail: 0,
						audit: 0,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w201",
							course: "/api/v1/courses/cpsc310",
						},
					},
					{
						id: "21w202",
						instructor: "bradley, nick",
						year: 2099,
						avg: 100,
						pass: 1,
						fail: 1,
						audit: 1,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w202",
							course: "/api/v1/courses/cpsc310",
						},
					},
				],
			});
		});

		it("DELETE /api/v1/courses/[course]/sections/[section] - Expected: 404 - No Course/Section", async () => {
			const res = await request(app).del("/api/v1/courses/cpsc310/sections/21w201");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no course with id 'cpsc310'",
			});

			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});

			const next = await request(app).del("/api/v1/courses/cpsc310/sections/21w201");
			expect(next).to.have.property("status", NOT_FOUND);
			expect(next).to.have.deep.property("body", {
				error: "Not found",
				message: "no section with id '21w201'",
			});
		});

		it("DELETE /api/v1/courses/cpsc310/sections/[section] - Expected 200", async () => {
			await request(app).put("/api/v1/courses/cpsc310").send({
				title: "Introduction to Software Engineering",
				dept: "Computer Science",
				code: "310",
			});
			await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});
			await request(app).put("/api/v1/courses/cpsc310/sections/21w202").send({
				instructor: "bradley, nick",
				year: 2021,
				avg: 77.1,
				pass: 172,
				fail: 1,
				audit: 0,
			});

			const res = await request(app).del("/api/v1/courses/cpsc310/sections/21w201");
			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				id: "21w201",
				instructor: "holmes, reid",
				year: 2021,
				avg: 76.4,
				pass: 167,
				fail: 3,
				audit: 1,
			});

			const list = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(list).to.have.deep.property("body", {
				total: 1,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "21w202",
						instructor: "bradley, nick",
						year: 2021,
						avg: 77.1,
						pass: 172,
						fail: 1,
						audit: 0,
						links: {
							self: "/api/v1/courses/cpsc310/sections/21w202",
							course: "/api/v1/courses/cpsc310",
						},
					},
				],
			});

			const res2 = await request(app).del("/api/v1/courses/cpsc310/sections/21w202");
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: "21w202",
				instructor: "bradley, nick",
				year: 2021,
				avg: 77.1,
				pass: 172,
				fail: 1,
				audit: 0,
			});

			const list2 = await request(app).get("/api/v1/courses/cpsc310/sections");
			expect(list2).to.have.deep.property("body", {
				total: 0,
				limit: 100,
				offset: 0,
				items: [],
			});
		});
	});

	describe("SEARCH v1", async function () {
		it("POST /api/v1/search - Expected: 422 - Invalid kind field", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "invalid_course",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["dept", "avg"],
							ORDER: "year",
						},
					},
				});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings",
				},
			});
		});

		//Search missing query field
		it("POST /api/v1/search - Expected: 422 -  missing query field", async () => {
			const res = await request(app).post("/api/v1/search").send({
				kind: "course_offerings",
			});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					query: "required but missing",
				},
			});
		});

		//Search invalid query field
		it("POST /api/v1/search - Expected: 422 -  invalid query field", async () => {
			const res = await request(app).post("/api/v1/search").send({
				kind: "course_offerings",
				WHERE: {},
				query: "invalid",
			});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					query: "expected an object",
				},
			});
		});

		//Search too many results
		// it("POST /api/v1/search - Expected: 413 -  too many results", async () => {
		// 	type Offering = {
		// 		dept: string;
		// 		avg: number;
		// 		pass: number;
		// 		fail: number;
		// 		audit: number;
		// 		year: number;
		// 		instructor: string;
		// 	};
		// 	const lotsOfCourses: Offering[] = Array.from({ length: 5001 }, (_, i) => ({
		// 		dept: "cpsc",
		// 		code: String(100 + (i % 50)),
		// 		title: "Computer Science",
		// 		instructor: "Bob",
		// 		year: 2021,
		// 		avg: 50,
		// 		pass: 20,
		// 		fail: 19,
		// 		audit: 0,
		// 	}));

		// 	const res = await request(app)
		// 		.post("/api/v1/search")
		// 		.send({
		// 			kind: "course_offerings",
		// 			query: {
		// 				WHERE: {},
		// 				OPTIONS: {
		// 					COLUMNS: ["dept"],
		// 					ORDER: "year",
		// 				},
		// 			},
		// 		});

		// 	expect(res).to.have.property("status", REQUEST_TOO_LONG);
		// 	expect(res).to.have.deep.property("body", {
		// 		error: "Too many results",
		// 		message: "Query would return more than 5000 results",
		// 		limit: 5000,
		// 	});
		// });

		//Search max results
		// it("POST /api/v1/search - Expected: 200 -  max results", async () => {
		// 	type Offering = {
		// 		dept: string;
		// 		avg: number;
		// 		pass: number;
		// 		fail: number;
		// 		audit: number;
		// 		year: number;
		// 		instructor: string;
		// 	};
		// 	const lotsOfCourses: Offering[] = Array.from({ length: 5000 }, (_, i) => ({
		// 		dept: "cpsc",
		// 		code: String(100 + (i % 50)),
		// 		title: "Computer Science",
		// 		instructor: "Bob",
		// 		year: 2021,
		// 		avg: 50,
		// 		pass: 20,
		// 		fail: 19,
		// 		audit: 0,
		// 	}));

		// 	await fs.writeFile(
		// 		datadir,
		// 		JSON.stringify(lotsOfCourses, null, 2), // pretty format
		// 		"utf-8"
		// 	);

		// 	const res = await request(app)
		// 		.post("/api/v1/search")
		// 		.send({
		// 			kind: "course_offerings",
		// 			WHERE: {},
		// 			query: {
		// 				OPTIONS: {
		// 					COLUMNS: ["dept", "code", "title", "instructor", "avg", "pass", "fail", "audit", "year"],
		// 					ORDER: "avg",
		// 				},
		// 			},
		// 		});

		// 	expect(res).to.have.property("status", OK);
		// 	expect(res).to.have.deep.property("body", { lotsOfCourses });
		// 	expect(res).to.be.an("array");
		// 	expect(res.body.length).to.equal(5000);
		// });

		//Search missing WHERE
		it("POST /api/v1/search - Expected: 400 -  Missing WHERE", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "course_offerings",
					query: {
						OPTIONS: {
							COLUMNS: ["dept"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "Missing WHERE",
			});
		});

		//Search missing COLUMNS key
		it("POST /api/v1/search - Expected: 400 -  Missing COLUMNS key", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["invalid"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "Unknown key in COLUMNS",
			});
		});

		//Search invalid ORDER
		it("POST /api/v1/search - Expected: 400 -  Invalid ORDER", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["dept"],
							ORDER: "invalid",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "ORDER must be a key in COLUMNS",
			});
		});

		//Basic query simple
		it("POST /api/v1/search - Expected: 200 -  Basic Query", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {
							GT: { avg: 80 },
						},
						OPTIONS: {
							COLUMNS: ["dept", "avg"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", OK);
			expect(res.body).to.be.an("array");
			for (const row of res.body) {
				expect(row).to.have.all.keys("dept", "avg");
				expect(row.avg).to.be.greaterThan(80);
			}
			for (let i = 1; i < res.body.length; i++) {
				expect(res.body[i].avg).to.be.at.least(res.body[i - 1].avg);
			}
		});

		//Complex query
		it("POST /api/v1/search - Expected: 200 -  Complex Query", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {
							OR: [
								{
									AND: [
										{
											GT: {
												avg: 90,
											},
										},
										{
											IS: {
												dept: "adhe",
											},
										},
									],
								},
								{
									EQ: {
										avg: 95,
									},
								},
							],
						},
						OPTIONS: {
							COLUMNS: ["dept", "avg", "year"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", OK);
			expect(res.body).to.be.an("array");
			for (const row of res.body) {
				expect(row).to.have.all.keys("dept", "avg", "year");
				if (row.dept === "adhe") {
					expect(row.avg).to.be.greaterThan(90);
				} else {
					expect(row.avg).to.be.equal(95);
				}
			}
			for (let i = 1; i < res.body.length; i++) {
				expect(res.body[i].avg).to.be.at.least(res.body[i - 1].avg);
			}
		});

		it("POST /api/v1/search - Expected: 422 - Invalid kind field", async () => {
			const res = await request(app)
				.post("/api/v1/search")
				.send({
					kind: "invalid_course",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["dept", "avg"],
							ORDER: "year",
						},
					},
				});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings",
				},
			});
		});
	});

	describe("BUILDINGS", async function () {
		it("PUT /api/v2/buildings/{builing} - Expected: 422", async () => {
			const res = await request(app).put("/api/v2/buildings/DMP").send({
				address: "6245 Agronomy Road V6T 1Z4",
				lat: "abc",
				lon: -123.24807,
			});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					name: "required but missing",
					lat: "expected a number",
				},
			});
		});

		it("PUT /api/v2/buildings/{builing} - Expected: 201 - add new building", async () => {
			const res = await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "DMP",
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
				links: {
					self: "/api/v2/buildings/DMP",
					rooms: "/api/v2/buildings/DMP/rooms",
				},
			});

			const check = await request(app).get("/api/v2/buildings/DMP");
			expect(check).to.have.property("status", OK);
			expect(check).to.have.deep.property("body", {
				id: "DMP",
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
				links: {
					self: "/api/v2/buildings/DMP",
					rooms: "/api/v2/buildings/DMP/rooms",
				},
			});

			const check2 = await request(app).get("/api/v2/buildings");
			expect(check2).to.have.property("status", OK);
			expect(check2).to.have.deep.property("body", {
				total: 1,
				limit: 100,
				offset: 0,
				items: [
					{
						id: "DMP",
						name: "Hugh Dempster Pavilion",
						address: "6245 Agronomy Road V6T 1Z4",
						lat: 49.26125,
						lon: -123.24807,
						links: {
							self: "/api/v2/buildings/DMP",
							rooms: "/api/v2/buildings/DMP/rooms",
						},
					},
				],
			});
		});

		it("PUT /api/v2/buildings/{builing} - Expected: 204 - update building", async () => {
			const res = await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "DMP",
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
				links: {
					self: "/api/v2/buildings/DMP",
					rooms: "/api/v2/buildings/DMP/rooms",
				},
			});

			const room = await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion Updated",
				address: "6245 TEST Road V6T 1Z4",
				lat: 50.26125,
				lon: -100.24807,
			});

			expect(room).to.have.property("status", NO_CONTENT);
		});

		it("DELETE /api/v2/buildings/{builing} - Expected: 404", async () => {
			const res = await request(app).del("/api/v2/buildings/DMP");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no building with id 'DMP'",
			});
		});

		it("DELETE /api/v2/buildings/{builing} - Expected: 200", async () => {
			const res = await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "DMP",
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
				links: {
					self: "/api/v2/buildings/DMP",
					rooms: "/api/v2/buildings/DMP/rooms",
				},
			});

			const deleted = await request(app).del("/api/v2/buildings/DMP");
			expect(deleted).to.have.property("status", OK);
			expect(deleted).to.have.deep.property("body", {
				id: "DMP",
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
				rooms: 0,
			});
		});
	});

	describe("ROOMS", async function () {
		it("GET /api/v2/buildings/{builing}/rooms - Expected: 404 - no building", async () => {
			const res = await request(app).get("/api/v2/buildings/DMP?limit=2000&offset=0");

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no building with id 'DMP'",
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 400 - invalid offset", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=2000&offset=-1");

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					offset: "expected an integer >= 0",
				},
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 400 - invalid limit 5001", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=5001&offset=1");

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
				},
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 400 - invalid limit 0", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=0&offset=1");

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid request parameters",
				params: {
					limit: "expected an integer between 1 and 5000",
				},
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 200 put1room get1room ", async () => {
			await request(app).put("/api/v2/buildings/DMP/").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=1&offset=0");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 1,
				limit: 1,
				offset: 0,
				items: [
					{
						id: "DMP_101",
						building: "DMP",
						number: "101",
						type: "Open Design General Purpose",
						furniture: "Classroom-Movable Tables & Chairs",
						href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
						seats: 40,
						links: {
							self: "/api/v2/buildings/DMP/rooms/DMP_101",
							building: "/api/v2/buildings/DMP",
						},
					},
				],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms- Expected: 200 - post2room get1room", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
				building: "DMP",
				number: "201",
				type: "Small Group",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
				seats: 25,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=1&offset=0");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 1,
				limit: 1,
				offset: 0,
				items: [
					{
						id: "DMP_101",
						building: "DMP",
						number: "101",
						type: "Open Design General Purpose",
						furniture: "Classroom-Movable Tables & Chairs",
						href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
						seats: 40,
						links: {
							self: "/api/v2/buildings/DMP/rooms/DMP_101",
							building: "/api/v2/buildings/DMP",
						},
					},
				],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 200 - post2room get2room", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
				building: "DMP",
				number: "201",
				type: "Small Group",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
				seats: 25,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=2&offset=0");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 2,
				limit: 2,
				offset: 0,
				items: [
					{
						id: "DMP_101",
						building: "DMP",
						number: "101",
						type: "Open Design General Purpose",
						furniture: "Classroom-Movable Tables & Chairs",
						href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
						seats: 40,
						links: {
							self: "/api/v2/buildings/DMP/rooms/DMP_101",
							building: "/api/v2/buildings/DMP",
						},
					},

					{
						id: "DMP_201",
						building: "DMP",
						number: "201",
						type: "Small Group",
						furniture: "Classroom-Movable Tables & Chairs",
						href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
						seats: 25,
						links: {
							self: "/api/v2/buildings/DMP/rooms/DMP_201",
							building: "/api/v2/buildings/DMP",
						},
					},
				],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 200 - on bound limit", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});
			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=5000&offset=0");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 5000,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 200 - on bound limit", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});
			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=1&offset=1");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 1,
				offset: 1,
				items: [],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms - Expected: 200 - on bound offset", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});
			const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=2000&offset=0");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				total: 0,
				limit: 2000,
				offset: 0,
				items: [],
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms/{room} - Expected: 404 - no building", async () => {
			const res = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_101");

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no building with id 'DMP'",
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms/{room} - Expected: 404 - no room", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_201");

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no room with id 'DMP_201'",
			});
		});

		it("GET /api/v2/buildings/{builing}/rooms/{room} - Expected: 200 ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_101");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				id: "DMP_101",
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
				links: {
					self: "/api/v2/buildings/DMP/rooms/DMP_101",
					building: "/api/v2/buildings/DMP",
				},
			});
		});

		it("PUT /api/v2/buildings/{builing}/rooms/{room} - Expected: 422 ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			const res = await request(app).put("/api/v2/buildings/DMP/rooms/TEST_101").send({
				building: "TEST",
				number: 101,
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: -1,
			});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					building: "must match parent building in path",
					number: "expected a string",
					type: "required but missing",
					seats: "expected a number >= 0",
				},
			});
		});

		it("PUT /api/v2/buildings/{builing}/rooms/{room} - Expected: 404 ", async () => {
			const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no building with id 'DMP'",
			});
		});

		it("PUT /api/v2/buildings/{builing}/rooms/{room} - Expected: 201 - create room ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			expect(res).to.have.property("status", CREATED);
			expect(res).to.have.deep.property("body", {
				id: "DMP_101",
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
				links: {
					self: "/api/v2/buildings/DMP/rooms/DMP_101",
					building: "/api/v2/buildings/DMP",
				},
			});
		});

		it("PUT /api/v2/buildings/{builing}/rooms/{room} - Expected: 204 - update room ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Updated info",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 50,
			});

			expect(res).to.have.property("status", NO_CONTENT);
		});

		it("DELETE /api/v2/buildings/{builing}/rooms/{room} - Expected: 404 - no building ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).del("/api/v2/buildings/TEST/rooms/DMP_101");

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no building with id 'TEST'",
			});
		});

		it("DELETE /api/v2/buildings/{builing}/rooms/{room} - Expected: 404 - no room ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).del("/api/v2/buildings/DMP/rooms/TEST_101");

			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no room with id 'TEST_101'",
			});
		});

		it("DELETE /api/v2/buildings/{builing}/rooms/{room} - Expected: 200  ", async () => {
			await request(app).put("/api/v2/buildings/DMP").send({
				name: "Hugh Dempster Pavilion",
				address: "6245 Agronomy Road V6T 1Z4",
				lat: 49.26125,
				lon: -123.24807,
			});

			await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});

			const res = await request(app).del("/api/v2/buildings/DMP/rooms/DMP_101");

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", {
				id: "DMP_101",
				building: "DMP",
				number: "101",
				type: "Open Design General Purpose",
				furniture: "Classroom-Movable Tables & Chairs",
				href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
				seats: 40,
			});
			const check = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_101");
			expect(check).to.have.property("status", NOT_FOUND);
		});
	});

	describe("POST Datasets v2", async function () {
		it("POST /api/v2/datasets - Expected: 422 - Missing", async () => {
			const uploadRes = await request(app).post("/api/v2/datasets");
			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "required but missing",
					archive: "required but missing",
				},
			});
		});

		it("POST /api/v2/datasets - Expected: 422 - Expected Different", async () => {
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "invalid")
				.attach("archive", Buffer.alloc(0), "empty.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings or facilities",
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v2/datasets - Expected: 422 - Mixed", async () => {
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "course_offerings")
				.attach("archive", Buffer.alloc(0), "empty.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v2/datasets - Expected: 422 - Mixed", async () => {
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "facilities")
				.attach("archive", Buffer.alloc(0), "empty.zip");

			expect(uploadRes).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(uploadRes).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					archive: "expected non-empty file",
				},
			});
		});

		it("POST /api/v2/datasets - Expected: 202 - No Courses Folder", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/no_courses.zip"));
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			expect(uploadRes).to.have.property("status", ACCEPTED);
			let res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
					status: "processing",
					kind: "course_offerings",
					stats: {
						courses_added: 0,
						courses_modified: 0,
						courses_seen: 0,
						files_processed: 0,
						files_skipped: 0,
						files_total: 0,
						sections_added: 0,
						sections_modified: 0,
						sections_seen: 0,
					},
					message: "Processing in progress",
				});
				res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "failed",
				kind: "course_offerings",
				stats: {
					courses_added: 0,
					courses_modified: 0,
					courses_seen: 0,
					files_processed: 0,
					files_skipped: 0,
					files_total: 0,
					sections_added: 0,
					sections_modified: 0,
					sections_seen: 0,
				},
				message: "Missing root courses directory",
			});
		});

		it("POST /api/v2/datasets - Expected: 202 - No Facilities Folder", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/no_facilities.zip"));
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "facilities")
				.attach("archive", datasetBuffer, "buildings.zip");

			expect(uploadRes).to.have.property("status", ACCEPTED);
			let res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
					status: "processing",
					kind: "facilities",
					stats: {
						buildings_added: 0,
						buildings_modified: 0,
						rooms_added: 0,
						rooms_modified: 0,
					},
					message: "Processing in progress",
				});
				res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "failed",
				kind: "facilities",
				stats: {
					buildings_added: 0,
					buildings_modified: 0,
					rooms_added: 0,
					rooms_modified: 0,
				},
				message: "Missing index.htm file",
			});
		});

		it("POST /api/v2/datasets - Expected: 202", async () => {});
	});

	describe("GET Datasets v2", async function () {
		it("GET /api/v2/datasets/none - Expected: 404", async () => {
			const res = await request(app).get("/api/v1/datasets/none");
			expect(res).to.have.property("status", NOT_FOUND);
			expect(res).to.have.deep.property("body", {
				error: "Not found",
				message: "no dataset with id 'none'",
			});
		});

		it("GET /api/v2/datasets/[bleh] - Expected 202 - campus.zip", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/campus.zip"));
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "facilities")
				.attach("archive", datasetBuffer, "campus.zip");

			let yippeee = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			while (yippeee.body.status == "processing") {
				yippeee = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			}
			expect(yippeee).to.have.property("status", OK);
			expect(yippeee.body.stats).to.have.property("buildings_added", 74);
		});

		it("GET /api/v2/datasets/[uploadID] - Expected: 202", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/item1.zip"));
			const uploadRes = await request(app)
				.post("/api/v2/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");

			let res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			while (res.body.status == "processing") {
				expect(res).to.have.property("status", OK);
				expect(res).to.have.deep.property("body", {
					id: uploadRes.body.id,
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
				res = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			}
			const res2 = await request(app).get(`/api/v2/datasets/${uploadRes.body.id}`);
			expect(res2).to.have.property("status", OK);
			expect(res2).to.have.deep.property("body", {
				id: uploadRes.body.id,
				status: "completed",
				kind: "course_offerings",
				stats: {
					files_total: 1,
					files_processed: 1,
					files_skipped: 0,
					courses_seen: 2,
					courses_added: 1,
					courses_modified: 1,
					sections_seen: 2,
					sections_added: 2,
					sections_modified: 0,
				},
				message: "Dataset processing complete",
			});
		});

		it("GET /api/v2/datasets/[uploadID] - Expected: 202 - 3 Files", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/3_files.zip"));
			const uploadRes = await request(app)
				.post("/ap1/v2/datasets")
				.field("kind", "course_offerings")
				.attach("archive", datasetBuffer, "courses.zip");
		});
	});

	describe("SEARCH v2", async function () {
		it("POST /api/v2/search - Expected: 422 - Invalid kind field", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					query: {
						WHERE: {
							GT: {
								seats: 350,
							},
						},
						OPTIONS: {
							COLUMNS: ["building", "number", "seats"],
							ORDER: ["seats"],
						},
					},
				});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "required but missing",
				},
			});
		});

		it("POST /api/v2/search - Expected: 422 - Invalid kind field", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "invalid_facilities",
					query: {
						WHERE: {
							GT: {
								seats: 350,
							},
						},
						OPTIONS: {
							COLUMNS: ["building", "number", "seats"],
							ORDER: ["seats"],
						},
					},
				});

			expect(res).to.have.property("status", UNPROCESSABLE_ENTITY);
			expect(res).to.have.deep.property("body", {
				error: "Validation failed",
				fields: {
					kind: "expected to be course_offerings or facilities",
				},
			});
		});

		it("POST /api/v2/search - Expected: 400 -  Missing WHERE", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "course_offerings",
					query: {
						OPTIONS: {
							COLUMNS: ["dept"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "Missing WHERE",
			});
		});

		it("POST /api/v2/search - Expected: 400 -  Missing COLUMNS key", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["invalid"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "Unknown key in COLUMNS",
			});
		});

		it("POST /api/v2/search - Expected: 400 -  Invalid ORDER", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {},
						OPTIONS: {
							COLUMNS: ["dept"],
							ORDER: "invalid",
						},
					},
				});

			expect(res).to.have.property("status", BAD_REQUEST);
			expect(res).to.have.deep.property("body", {
				error: "Invalid query",
				message: "ORDER must be a key in COLUMNS",
			});
		});

		it("POST /api/v2/search - Expected: 200 -  Basic Query", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {
							GT: { avg: 80 },
						},
						OPTIONS: {
							COLUMNS: ["dept", "avg"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", OK);
			expect(res.body).to.be.an("array");
			for (const row of res.body) {
				expect(row).to.have.all.keys("dept", "avg");
				expect(row.avg).to.be.greaterThan(80);
			}
			for (let i = 1; i < res.body.length; i++) {
				expect(res.body[i].avg).to.be.at.least(res.body[i - 1].avg);
			}
		});

		it("POST /api/v2/search - Expected: 200 -  Complex Query", async () => {
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "course_offerings",
					query: {
						WHERE: {
							OR: [
								{
									AND: [
										{
											GT: {
												avg: 90,
											},
										},
										{
											IS: {
												dept: "adhe",
											},
										},
									],
								},
								{
									EQ: {
										avg: 95,
									},
								},
							],
						},
						OPTIONS: {
							COLUMNS: ["dept", "avg", "year"],
							ORDER: "avg",
						},
					},
				});

			expect(res).to.have.property("status", OK);
			expect(res.body).to.be.an("array");
			for (const row of res.body) {
				expect(row).to.have.all.keys("dept", "avg", "year");
				if (row.dept === "adhe") {
					expect(row.avg).to.be.greaterThan(90);
				} else {
					expect(row.avg).to.be.equal(95);
				}
			}
			for (let i = 1; i < res.body.length; i++) {
				expect(res.body[i].avg).to.be.at.least(res.body[i - 1].avg);
			}
		});

		it("POST /api/v2/search - Expected: 200 -  Simple on Campus", async () => {
			const datasetBuffer = await fs.readFile(path.resolve(__dirname, "test_data/campus.zip"));
			await request(app)
				.post("/api/v2/datasets")
				.field("kind", "facilities")
				.attach("archive", datasetBuffer, "campus.zip");
			const res = await request(app)
				.post("/api/v2/search")
				.send({
					kind: "facilities",
					query: {
						WHERE: {
							OR: [
								{
									AND: [
										{
											GT: {
												lat: 0,
											},
										},
										{
											IS: {
												furniture: "*a*",
											},
										},
									],
								},
								{
									EQ: {
										seats: 300,
									},
								},
							],
						},
						OPTIONS: {
							COLUMNS: ["seats", "furniture", "lat"],
							ORDER: "lat",
						},
					},
				});

			expect(res).to.have.property("status", OK);
			expect(res).to.have.deep.property("body", []);
		});
	});
});
