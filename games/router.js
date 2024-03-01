import { Router } from "express";
import { getGames, createGame, getGameById } from "./controller.js";

const gamesRouter = Router();

gamesRouter.get('/', getGames);
gamesRouter.post('/', createGame);

gamesRouter.get('/:gameId', getGameById);

export { gamesRouter };