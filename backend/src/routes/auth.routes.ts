import { Router } from "express";
import { login, verify } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", login);           // POST /api/auth/login
router.get("/verify", protect, verify); // GET  /api/auth/verify (protected)

export default router;