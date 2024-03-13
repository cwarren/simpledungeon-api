import { Router } from "express";
import { registerUser, login, logout, removeUser } from "./controller.js";

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/expunge', removeUser);

export { authRouter };