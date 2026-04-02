import express from "express";
import { getBuilding, getBuildings } from "../controllers/buildingController";
import { parsePagination } from "../middleware/parsePagination";

const router = express.Router();

router.get("/v2/buildings", parsePagination, getBuildings);

router.get("/v2/buildings/:buildingID", getBuilding);

router

export default router;
