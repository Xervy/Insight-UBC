import fs from "fs/promises";
import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Application, createApp } from "../src/App";
import { NOTFOUND } from "dns";

const {
	OK, // 200
	// Other common codes are:
	CREATED, // 201
	NO_CONTENT, // 204
	NOT_FOUND, // 404
	BAD_REQUEST, // 400
	UNPROCESSABLE_ENTITY, //422
} = StatusCodes;

// Do not change datadir
const datadir = "./data" as const;

describe("REST API v1", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("GET /api should respond with status OK and text 'App is running!'", async () => {
		const res = await request(app).get("/api");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.property("text", "App is running!");
	});

	it("GET /api/v1/courses - Expected: OK - Default", async () => {
		const res = await request(app).get("/api/v1/courses");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.deep.property("body", {
			"total": 0,
			"limit": 100,
			"offset": 0,
			"items": [],
		});
	});

	it("GET /api/v1/courses - Expected: OK - In Bounds", async () => {
		const res = await request(app).get("/api/v1/courses?limit=2000&offset=5");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.deep.property("body", {
			"total": 0,
			"limit": 2000,
			"offset": 5,
			"items": [],
		});
	});

	it("GET /api/v1/courses - Expected: OK - On Bounds", async () => {
		const resLow = await request(app).get("/api/v1/courses?limit=1&offset=0");
		expect(resLow).to.have.property("status", OK);
		expect(resLow).to.have.deep.property("body", {
			"total": 0,
			"limit": 1,
			"offset": 0,
			"items": [],
		});

		const resHi = await request(app).get("/api/v1/courses?limit=5000&offset=0");
		expect(resHi).to.have.property("status", OK);
		expect(resHi).to.have.deep.property("body", {
			"total": 0,
			"limit": 5000,
			"offset": 0,
			"items": [],
		});
	});

	it("GET /api/v1/courses - Bounds +1", async () => {
		const resLow = await request(app).get("/api/v1/courses?limit=2&offset=1");
		expect(resLow).to.have.property("status", OK);
		expect(resLow).to.have.deep.property("body", {
			"total": 0,
			"limit": 2,
			"offset": 1,
			"items": [],
		});

		const resHi = await request(app).get("/api/v1/courses?limit=5001&offset=1");
		expect(resHi).to.have.property("status", BAD_REQUEST);
		expect(resHi).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"limit": "expected an integer between 1 and 5000",
			}
		});
	});

	it("GET /api/v1/courses - Bounds -1", async () => {
		const resLow = await request(app).get("/api/v1/courses?limit=0&offset=-1");
		expect(resLow).to.have.property("status", BAD_REQUEST);
		expect(resLow).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"limit": "expected an integer between 1 and 5000",
				"offset": "expected an integer >= 0"
			}
		});

		const resHi = await request(app).get("/api/v1/courses?limit=4999&offset=-1");
		expect(resHi).to.have.property("status", BAD_REQUEST);
		expect(resHi).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"offset": "expected an integer >= 0",
			}
		});
	});

	it("GET /api/v1/courses/noCourse - Expected: 404 - No Course", async () => {
		const res = await request(app).get("/api/v1/courses/noCourse");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no course with id 'noCourse'",
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 201", async () => {
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		expect(res).to.have.property("status", CREATED);
		expect(res).to.have.deep.property("body", {
			"id": "cpsc310",
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310",
			"links": {
				"self": "/api/v1/courses/cpsc310",
				"sections": "/api/v1/courses/cpsc310/sections"
			}
		});

		const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
		expect(list).to.have.property("status", OK);
		expect(list).to.have.deep.property("body", {
			"total": 1,
			"limit": 2000,
			"offset": 0,
			"items": [{
				"id": "cpsc210",
				"title": "Software Construction",
				"dept": "Computer Science",
				"code": "210",
				"links": {
					"self": "/api/v1/courses/cpsc210",
					"sections": "/api/v1/courses/cpsc210/sections"
				}
			}],
		});

		const crs = await request(app).get("/api/v1/courses/cpsc310");
		expect(crs).to.have.property("status", OK);
		expect(crs).to.have.deep.property("body", {
			"id": "cpsc310",
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310",
			"links": {
				"self": "/api/v1/courses/cpsc310",
				"sections": "/api/v1/courses/cpsc310/sections"
			}
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 204", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		expect(res).to.have.property("status", NO_CONTENT);

		const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
		expect(list).to.have.property("status", OK);
		expect(list).to.have.deep.property("body", {
			"total": 1,
			"limit": 2000,
			"offset": 0,
			"items": [{
				"id": "cpsc210",
				"title": "Software Construction",
				"dept": "Computer Science",
				"code": "210",
				"links": {
					"self": "/api/v1/courses/cpsc210",
					"sections": "/api/v1/courses/cpsc210/sections"
				}
			}],
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Title Error", async () => {
		const non = await request(app).put("/api/v1/courses/cpsc310").send({
			"dept": "Computer Science",
			"code": "310"
		});
		expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(non).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"title": "required but missing",
			}
		});

		const num = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": 5,
			"dept": "Computer Science",
			"code": "310"
		});
		expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(num).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"title": "expected a string",
			}
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Dept Error", async () => {
		const non = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"code": "310"
		});
		expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(non).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"dept": "required but missing",
			}
		});

		const num = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": 5,
			"code": "310"
		});
		expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(num).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"dept": "expected a string",
			}
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Code Error", async () => {
		const non = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
		});
		expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(non).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"code": "required but missing",
			}
		});

		const num = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": 310
		});
		expect(num).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(num).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"code": "expected a string",
			}
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 422 - Mixed Error", async () => {
		const non = await request(app).put("/api/v1/courses/cpsc310").send({
			"dept": "Computer Science",
			"code": 310
		});
		expect(non).to.have.property("status", UNPROCESSABLE_ENTITY);
		expect(non).to.have.deep.property("body", {
			"error": "Validation failed",
			"fields": {
				"title": "required but missing",
				"code": "expected a string",
			}
		});
	});

	it("DELETE /api/v1/courses/none - Expected: 404", async () => {
		const res = await request(app).del("/api/v1/courses/none");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no course with id 'none'"
		});
	});

	it("DELETE /api/v1/courses/cpsc310 - Expected: 200", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		await request(app).put("/api/v1/courses/cpsc210").send({
			"title": "Software Construction",
			"dept": "Computer Science",
			"code": "210"
		});

		const res = await request(app).del("/api/v1/courses/none");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no course with id 'none'"
		});

		const init = await request(app).get("/api/v1/courses");
		expect(init).to.have.property("status", OK);
		expect(init).to.have.deep.property("body", {
			"total": 2,
			"limit": 100,
			"offset": 0,
			"items": [
				{
					"id": "cpsc210",
					"title": "Software Construction",
					"dept": "Computer Science",
					"code": "210",
					"links": {
						"self": "/api/v1/courses/cpsc210",
						"sections": "/api/v1/courses/cpsc210/sections"
					}
				},
				{
					"id": "cpsc310",
					"title": "Introduction to Software Engineering",
					"dept": "Computer Science",
					"code": "310",
					"links": {
						"self": "/api/v1/courses/cpsc310",
						"sections": "/api/v1/courses/cpsc310/sections"
					}
				}
			]
		});

		const todel = await request(app).del("/api/v1/courses/cpsc310");
		expect(todel).to.have.property("status", OK);
		expect(todel).to.have.deep.property("body", {
			"id": "cpsc310",
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310",
			"sections": 0
		});

		const check = await request(app).get("/api/v1/courses");
		expect(check).to.have.property("status", OK);
		expect(check).to.have.deep.property("body", {
			"total": 1,
			"limit": 100,
			"offset": 0,
			"items": [
				{
					"id": "cpsc210",
					"title": "Software Construction",
					"dept": "Computer Science",
					"code": "210",
					"links": {
						"self": "/api/v1/courses/cpsc210",
						"sections": "/api/v1/courses/cpsc210/sections"
					}
				}
			]
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Expected: 404", async () => {
		const res = await request(app).get("/api/v1/courses/cpsc310/sections");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no course with id 'cpsc310'"
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Expected: OK - Default", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const res = await request(app).get("/api/v1/courses/cpsc310/sections");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.deep.property("body", {
			"total": 0,
			"limit": 100,
			"offset": 0,
			"items": [],
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Expected: OK - In Bounds", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const res = await request(app).get("/api/v1/courses/cpsc310/sections?limit=2000&offset=5");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.deep.property("body", {
			"total": 0,
			"limit": 2000,
			"offset": 5,
			"items": [],
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Expected: OK - On Bounds", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=1&offset=0");
		expect(resLow).to.have.property("status", OK);
		expect(resLow).to.have.deep.property("body", {
			"total": 0,
			"limit": 1,
			"offset": 0,
			"items": [],
		});

		const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=5000&offset=0");
		expect(resHi).to.have.property("status", OK);
		expect(resHi).to.have.deep.property("body", {
			"total": 0,
			"limit": 5000,
			"offset": 0,
			"items": [],
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Bounds +1", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=2&offset=1");
		expect(resLow).to.have.property("status", OK);
		expect(resLow).to.have.deep.property("body", {
			"total": 0,
			"limit": 2,
			"offset": 1,
			"items": [],
		});

		const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=5001&offset=1");
		expect(resHi).to.have.property("status", BAD_REQUEST);
		expect(resHi).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"limit": "expected an integer between 1 and 5000",
			}
		});
	});

	it("GET /api/v1/courses/cpsc310/sections - Bounds -1", async () => {
		const resLow = await request(app).get("/api/v1/courses/cpsc310/sections?limit=0&offset=-1");
		expect(resLow).to.have.property("status", BAD_REQUEST);
		expect(resLow).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"limit": "expected an integer between 1 and 5000",
				"offset": "expected an integer >= 0"
			}
		});

		const resHi = await request(app).get("/api/v1/courses/cpsc310/sections?limit=4999&offset=-1");
		expect(resHi).to.have.property("status", BAD_REQUEST);
		expect(resHi).to.have.deep.property("body", {
			"error": "Invalid request parameters",
			"params": {
				"offset": "expected an integer >= 0",
			}
		});
	});

	it("GET /api/v1/courses/nothing/sections/none - Expected: 404 - No Course", async () => {
		const res = await request(app).get("/api/v1/courses/nothing/sections/none");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no course with id 'nothing'",
		});
	});

	it("GET /api/v1/courses/cpsc310/sections/none - Expected: 404 - No Section", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const res = await request(app).get("/api/v1/courses/cpsc310/sections/none");
		expect(res).to.have.property("status", NOT_FOUND);
		expect(res).to.have.deep.property("body", {
			"error": "Not found",
			"message": "no section with id 'none'",
		});
	});

	/*

	it("PUT /api/v1/courses/cpsc310 - Expected: 201", async () => {
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		expect(res).to.have.property("status", CREATED);
		expect(res).to.have.deep.property("body", {
			"id": "cpsc310",
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310",
			"links": {
				"self": "/api/v1/courses/cpsc310",
				"sections": "/api/v1/courses/cpsc310/sections"
			}
		});

		const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
		expect(list).to.have.property("status", OK);
		expect(list).to.have.deep.property("body", {
			"total": 1,
			"limit": 2000,
			"offset": 0,
			"items": [{
				"id": "cpsc210",
				"title": "Software Construction",
				"dept": "Computer Science",
				"code": "210",
				"links": {
					"self": "/api/v1/courses/cpsc210",
					"sections": "/api/v1/courses/cpsc210/sections"
				}
			}],
		});

		const crs = await request(app).get("/api/v1/courses/cpsc310");
		expect(crs).to.have.property("status", OK);
		expect(crs).to.have.deep.property("body", {
			"id": "cpsc310",
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310",
			"links": {
				"self": "/api/v1/courses/cpsc310",
				"sections": "/api/v1/courses/cpsc310/sections"
			}
		});
	});

	it("PUT /api/v1/courses/cpsc310 - Expected: 204", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			"title": "Introduction to Software Engineering",
			"dept": "Computer Science",
			"code": "310"
		});
		expect(res).to.have.property("status", NO_CONTENT);

		const list = await request(app).get("/api/v1/courses?limit=2000&offset=0");
		expect(list).to.have.property("status", OK);
		expect(list).to.have.deep.property("body", {
			"total": 1,
			"limit": 2000,
			"offset": 0,
			"items": [{
				"id": "cpsc210",
				"title": "Software Construction",
				"dept": "Computer Science",
				"code": "210",
				"links": {
					"self": "/api/v1/courses/cpsc210",
					"sections": "/api/v1/courses/cpsc210/sections"
				}
			}],
		});
	}); */

});
