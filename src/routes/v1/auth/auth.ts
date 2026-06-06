import express, { RequestHandler } from "express";
import {
  confirmPassword,
  login,
  logout,
  register,
  verifyOtp,
  forgetPassword,
  verifyForgetOtp,
  resetPassword,
  authCheck,
} from "../../../controllers/authController";
import { Request, Response, NextFunction } from "express";
import { auth } from "../../../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/confirm-password", confirmPassword);
router.post("/login", login);
router.post("/logout", logout);

router.post("/forget-password", forgetPassword);
router.post("/verify-forget-otp", verifyForgetOtp);
router.post("/reset-password", resetPassword);
router.get("/auth-check", auth, authCheck as RequestHandler);

router.get("/testing", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ message: "it is okay" });
});

export default router;
