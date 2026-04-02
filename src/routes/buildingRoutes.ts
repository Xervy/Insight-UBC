import express from "express";
import { getBuildings } from "../controllers/buildingController";
import { parsePagination } from "../middleware/parsePagination";

const router = express.Router();

router.get("/api/v2/buildings", parsePagination, getBuildings);

export default router;