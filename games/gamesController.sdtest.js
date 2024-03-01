import request from 'supertest';
import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

describe('Integration Test for Game Creation', function() {
  let insertedGameId;

  after(async function() {
    // Clean up: delete the test game from the database
    if (insertedGameId) {
      const dbClient = getDb();
      await dbClient.collection("gamestate").deleteOne({ _id: insertedGameId });
    }
    await dbClose();
  });

  it('should create a new game with default values and validate its contents', async function() {
    const newGameName = 'TESTING:Dungeon Crawler';
    const response = await request(app)
      .post('/games')
      .send({ name: newGameName });

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('insertedId');

    insertedGameId = new ObjectId(`${response.body.insertedId}`);

    const dbClient = getDb();
    const insertedGame = await dbClient.collection("gamestate").findOne({ _id: insertedGameId });

    // console.log('Inserted game:');
    // console.dir(insertedGame);

    expect(insertedGame).to.include({
      name: newGameName,
      version: "0.0.2",
    });
    expect(insertedGame.description).to.be.an('array');
    expect(insertedGame.description[0]).to.be.an('array');
    expect(insertedGame.description[0].length).to.equal(2);

  });
});
