import express from "express";
import {
  changeLanguage,
  testPermission,
  uploadFile,
  uploadFileMultiple,
  uploadFileOptimize,
} from "../../../controllers/api/profileController";
import { auth } from "../../../middleware/auth";
import { upload, uploadMemory } from "../../../middleware/uploadFile";
import {
  getPost,
  getPostsByPagination,
} from "../../../controllers/api/postController";

const router = express.Router();

router.post("/change-language", changeLanguage);
router.get("/test-permission", auth, testPermission);
router.patch("/upload/profile", auth, upload.single("avatar"), uploadFile);
router.patch(
  "/upload/profile/optimize",
  auth,
  upload.single("avatar"),
  uploadFileOptimize
);
router.patch(
  "/upload/profile/multiple",
  auth,
  upload.array("avatars"),
  uploadFileMultiple
);

// posts
// router.get("/posts/:id", auth, getPost);
// router.get("/posts", auth, getPostsByPagination);
export default router;
