import { Router } from "express";
import { registerUser, login, logout, removeUser } from "./controller.js";
import { verifyJWT } from "./middleware.js";

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', login);
authRouter.post('/logout', verifyJWT, logout);
authRouter.post('/expunge', verifyJWT, removeUser);

export { authRouter };