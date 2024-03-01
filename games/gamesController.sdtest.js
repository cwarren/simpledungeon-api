import request from 'supertest';
import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

describe('Integration Test for Game Controller', function() {
  const baseUri = '/games';

  async function insertTestingGame(testingGameData) {
    const dbClient = getDb();
    const result = await dbClient.collection("gamestate").insertOne(testingGameData);
    return result.insertedId.toString();
  }

  // #############################################
  
  let insertedGameId;
  let existingGameId;

  const existingGameData = {
    name: 'TESTING: Retrieve by ID',
    version: "0.0.2",
    description: [[new Date(), "A game to test retrieval by ID"]]
  };

  before(async function() {
    existingGameId = await insertTestingGame(existingGameData);
  });

  // #############################################
  // create

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

  // #############################################
  // read

  it('should successfully retrieve an existing game by its ID', async function() {
    const readUri = `${baseUri}/${existingGameId}`;
    const response = await request(app)
      .get(readUri);

    expect(response.status).to.equal(200);
    expect(response.body).to.include({
      _id: existingGameId,
      name: existingGameData.name,
    });
  });

  it('should return 404 for a non-existent game ID', async function() {
    const nonExistentId = new ObjectId(); // Generate a new ObjectId that doesn't exist in the database
    const readUri = `${baseUri}/${nonExistentId.toString()}`;
    const response = await request(app)
      .get(readUri);

    expect(response.status).to.equal(404);
    expect(response.text).to.equal('Game not found');
  });

  it('should return 500 for an invalid game ID format', async function() {
    const invalidId = '123'; // An invalid ObjectId format
    const readUri = `${baseUri}/${invalidId}`;
    const response = await request(app)
      .get(readUri);

    expect(response.status).to.equal(500);
    expect(response.text).to.include('Failed to fetch game');
  });

  // #############################################
  // update

  // #############################################
  // delete


});
