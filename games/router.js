import { Router } from "express";
import { getGames, createGame, getGameById, updateGameById, deleteGameById } from "./controller.js";

const gamesRouter = Router();

gamesRouter.get('/', getGames);
gamesRouter.post('/', createGame);

gamesRouter.put('/:gameId', updateGameById);

gamesRouter.get('/:gameId', getGameById);

gamesRouter.delete('/:gameId', deleteGameById);

export { gamesRouter };