import { Router } from "express";
import { getGames, createGame, getGameById, updateGame } from "./controller.js";

const gamesRouter = Router();

gamesRouter.get('/', getGames);
gamesRouter.post('/', createGame);
gamesRouter.put('/:gameId', updateGame);

gamesRouter.get('/:gameId', getGameById);

export { gamesRouter };