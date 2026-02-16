import express from "express";
import { app } from "../../app";
import { healthCheck } from "../../controllers/healthController";
import { check } from "../../middleware/check";

const router = express.Router();

router.get("/check", check as any, healthCheck);

export default router;
