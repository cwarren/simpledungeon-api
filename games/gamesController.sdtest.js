import request from 'supertest';
import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

describe('Integration Test for Game Creation', function() {
  const baseUri = '/games';

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
      .post(baseUri)
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

  it('should disallow names that are too short, too long, the wrong type, or missing', async function() {
    const testCases = [
      { name: '', expectedStatus: 400, description: 'Empty name' },
      { name: 'A', expectedStatus: 400, description: 'Too short name' },
      { name: 'x'.repeat(97), expectedStatus: 400, description: 'Too long name' },
      { name: 123, expectedStatus: 400, description: 'Wrong type (number)' },
      { name: null, expectedStatus: 400, description: 'Null name' },
      { name: undefined, expectedStatus: 400, description: 'Missing name' }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post(baseUri)
        .send('name' in testCase ? { name: testCase.name } : {});

      expect(response.status, `Test failed for case: ${testCase.description}`).to.equal(testCase.expectedStatus);
    }
  });
});
