import { errorCodes } from "../config/errorCodes";

export const checkUploadFile = (file: Express.Multer.File) => {
  if (!file) {
    const error: any = new Error("File upload failed");
    error.status = 409;
    error.errorCode = errorCodes.invalid;
    throw error;
  }
};
