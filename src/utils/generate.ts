import { randomBytes } from "crypto";
import { get } from "http";
import jwt from "jsonwebtoken";
import { getUserById } from "../services/authService";
import { checkUserIfNotExist } from "./auth";

export const generateOTP = () => {
  return (parseInt(randomBytes(3).toString("hex"), 16) % 900000) + 100000;
};

export const generateToken = () => {
  return randomBytes(32).toString("hex");
};
