import express from "express";
import {
  confirmPassword,
  register,
  verifyOtp,
} from "../../../controllers/authController";
import { Request, Response, NextFunction } from "express";
const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/confirm-password", confirmPassword);

router.get("/testing", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ message: "it is okay" });
});

export default router;
