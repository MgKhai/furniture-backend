import express from "express";
import {
  changeLanguage,
  testPermission,
} from "../../../controllers/profileController";
import { auth } from "../../../middleware/auth";
import { permission } from "process";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermission);

export default router;
