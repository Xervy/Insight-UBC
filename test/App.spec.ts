import fs from "fs/promises";
import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Application, createApp } from "../src/App";

const {
	OK, // 200
	// Other common codes are:
	// CREATED, // 201
	// NO_CONTENT, // 204
	// NOT_FOUND, // 404
	BAD_REQUEST, // 400
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

	it("GET /api/v1/courses - Expected: OK - Bounds +1", async () => {
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
			}
		});
	});

	it("GET /api/v1/courses - Expected: OK - Bounds -1", async () => {
		const resLow = await request(app).get("/api/v1/courses?limit=0&offset=-1");
		expect(resLow).to.have.property("status", BAD_REQUEST);
		expect(resLow).to.have.deep.property("body", {
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
				offset: "expected an integer >= 0"
			}
		});

		const resHi = await request(app).get("/api/v1/courses?limit=4999&offset=-1");
		expect(resHi).to.have.property("status", BAD_REQUEST);
		expect(resHi).to.have.deep.property("body", {
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			}
		});
	});

});
