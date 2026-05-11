import express from "express";
import { getAllUsers } from "../../../controllers/admin/userController";
import { setMaintenance } from "../../../controllers/admin/serviceController";
import { upload } from "../../../middleware/uploadFile";
import {
  createPost,
  deletePost,
  updatePost,
} from "../../../controllers/admin/postController";

const router = express.Router();

router.get("/users", getAllUsers);
router.post("/maintenance", setMaintenance);

// CRUD posts
router.post("/posts", upload.single("image"), createPost);
router.patch("/posts", upload.single("image"), updatePost);
router.delete("/posts/:id", deletePost);

export default router;
