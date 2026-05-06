import express from "express";
import {
  changeLanguage,
  testPermission,
  uploadFile,
} from "../../../controllers/profileController";
import { auth } from "../../../middleware/auth";
import { upload } from "../../../middleware/uploadFile";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermission);
router.patch("/upload/profile", auth, upload.single("avatar"), uploadFile);
export default router;
