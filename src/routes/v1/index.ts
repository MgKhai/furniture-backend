import express from "express";
import authRoutes from "../../routes/v1/auth/auth";
import adminRoutes from "./admin";
import profieRoutes from "./api";
import { auth } from "../../middleware/auth";
import { authorise } from "../../middleware/authorise";
import { maintenance } from "../../middleware/maintenance";

const router = express.Router();

// router.use("/api/v1", authRoutes);
// router.use("/api/v1/user", profieRoutes);
// router.use("/api/v1/admin", auth, authorise(true, "USER"), adminRoutes);

router.use("/api/v1", maintenance, authRoutes);
router.use("/api/v1/user", maintenance, auth, profieRoutes);
router.use("/api/v1/admin", auth, authorise(true, "USER"), adminRoutes);

export default router;
