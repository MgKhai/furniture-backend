import express from "express";
import { changeLanguage } from "../../controllers/profileController";

const router = express.Router();

router.post("/change-language", changeLanguage);

export default router;
