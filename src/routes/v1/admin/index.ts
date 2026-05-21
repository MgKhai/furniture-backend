import express from "express";
import { getAllUsers } from "../../../controllers/admin/userController";
import { setMaintenance } from "../../../controllers/admin/serviceController";
import { upload } from "../../../middleware/uploadFile";
import {
  createPost,
  deletePost,
  updatePost,
} from "../../../controllers/admin/postController";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "../../../controllers/admin/productController";

const router = express.Router();

router.get("/users", getAllUsers);
router.post("/maintenance", setMaintenance);

// CRUD posts
router.post("/posts", upload.single("image"), createPost);
router.patch("/posts", upload.single("image"), updatePost);
router.delete("/posts", deletePost);

// CRUD products
router.post("/products", upload.array("image", 4), createProduct);
// router.patch("/products", upload.array("image", 4), updateProduct);
// router.delete("/products", deleteProduct);
// router.post("/products", createNewProduct);

export default router;
