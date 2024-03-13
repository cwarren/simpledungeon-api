import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { gamesRouter } from "./games/router.js";
import { authRouter } from "./auth/router.js";

import { dbConnect, dbClose, getDb }  from './dbClient.js';

const app = express();

await dbConnect();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

//-------------------------
// simple status endpoints

app.get('/', (req, res) => {
  res.send('simpledungeon-api');
});

app.get('/aliveapi', (req, res) => {
    res.send('simpledungeon API is alive');
});

app.get('/alivedb', async (req, res) => {
    try {
        const dbClient = getDb();
        await dbClient.command({ ping: 1 });
        res.send('simpledungeon DB is alive');
    } catch (error) {
        console.error('Failed to ping DB:', error);
        res.status(500).send('Failed to connect to simpledungeon DB');
    } 
});

//-------------------------
// actual API endpoints

app.use(`/games`, gamesRouter);
app.use(`/auth`, authRouter);

//-------------------------
// last layer of error handling

app.use(
    ( error, req, res, next) => {
      if (typeof error === "string") {
        return res.status(500).json({ error });
      }
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message, cause: error.cause });
      }
      return res.status(500).json({ error: "Unknown error" });
    }
  );

//-------------------------
// Graceful shutdown

process.on('SIGINT', async () => {
    await dbClose();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await dbClose();
    process.exit(0);
});

export { app };