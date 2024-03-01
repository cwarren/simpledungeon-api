import { getDb }  from '../dbClient.js';
import { ObjectId } from 'mongodb';

export async function getGames(req, res, _next) {
    try {
        const dbClient = getDb();
        const gameStateCursor = await dbClient.collection("gamestate").find({});
        res.send(JSON.stringify(await gameStateCursor.toArray()));        
    } catch(e) {
        res.status(500).send('Failed to fetch games:'+ e);
    }
}

export async function createGame(req, res, _next) {
    if (!req.body.name) {
        res.status(400).send('Missing required field game name');
        return;
    }

    if (typeof req.body.name !== 'string' || req.body.name.length <= 1 || req.body.name.length > 96) {
        res.status(400).send('Game name must be a string of 2 to 96 characters');
        return;
    }

    try {
        const dbClient = getDb();
        const gamestateCollection = dbClient.collection("gamestate");
        
        const now = new Date();
        const newGameData = {
            name: req.body.name,
            created_at: now,
            updated_at: now,
            version: "0.0.2",
            description: [[now, "An adventurer heads out to seek their fortune..."]]

        };

        // Assuming req.body contains the game state object
        const result = await gamestateCollection.insertOne(newGameData);
        
        // Respond with the inserted document ID
        res.status(201).send({ insertedId: result.insertedId });
    } catch (e) {
        console.error('Failed to insert game state:', e);
        res.status(500).send('Failed to insert new game state: ' + e);
    }
}

export async function getGameById(req, res) {
    try {
        const dbClient = getDb();
        const { gameId } = req.params; 
        const game = await dbClient.collection("gamestate").findOne({ _id: new ObjectId(`${gameId}`) });

        if (game) {
            res.json(game);
        } else {
            res.status(404).send('Game not found');
        }
    } catch(e) {
        console.error('Failed to fetch game:', e);
        res.status(500).send('Failed to fetch game: ' + e);
    }
}