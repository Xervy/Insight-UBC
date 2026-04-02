import express from "express";
import { deleteBuilding, getBuilding, getBuildings, putBuilding } from "../controllers/buildingController";
import { parsePagination } from "../middleware/parsePagination";

const router = express.Router();

router.get("/v2/buildings", parsePagination, getBuildings);

router.get("/v2/buildings/:buildingID", getBuilding);

router.put("/v2/buildings/:buildingID", putBuilding);

router.delete("/v2/buildings/:buildingID", deleteBuilding);

export default router;
