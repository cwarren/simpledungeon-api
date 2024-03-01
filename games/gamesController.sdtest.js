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

  // {"_id": ObjectId("4d512b45cc9374271b02ec4f")}
  async function deleteTestingGame(testingGameIdString) {
    if (testingGameIdString) {
      const dbClient = getDb();
      const result = await dbClient.collection("gamestate").deleteOne({"_id": new ObjectId(`${testingGameIdString}`)});
      console.log('delete result:');
      console.dir(result);
      return result;
    }
  }

  // #############################################
  
  let insertedGameIdString;
  let existingGameIdString;

  const existingGameData = {
    name: 'TESTING: Existing Game ID',
    version: "0.0.2",
    description: [[new Date(), "A game to test"]]
  };

  before(async function() {
    existingGameIdString = await insertTestingGame(existingGameData);
  });

  after(async function() {
    await deleteTestingGame(insertedGameIdString);
    await deleteTestingGame(existingGameIdString);
    await dbClose();
  });

  // #############################################
  // create

  it('should create a new game with default values and validate its contents', async function() {
    const newGameName = 'TESTING:Dungeon Crawler';
    const response = await request(app)
      .post(baseUri)
      .send({ name: newGameName });

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('insertedId');

    insertedGameIdString =`${response.body.insertedId}`;

    const dbClient = getDb();
    const insertedGame = await dbClient.collection("gamestate").findOne({ _id: new ObjectId(insertedGameIdString) });

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
    const readUri = `${baseUri}/${existingGameIdString}`;
    const response = await request(app)
      .get(readUri);

    expect(response.status).to.equal(200);
    expect(response.body).to.include({
      _id: existingGameIdString,
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

  it('should successfully update an existing game', async function() {
    const insertTestingGameData = {
      name: 'TESTING: Update Game',
      version: "0.0.2",
      description: [[new Date(), "A game to test updates"]]
    }
    const gameToUpdateIdString = await insertTestingGame(insertTestingGameData);
    try {
      const updateUri = `${baseUri}/${gameToUpdateIdString}`;
      const updateData = {
        name: 'TESTING: Updated Game Name',
        description: [[new Date(), "A game to test updating"]]
      };
      const response = await request(app)
        .put(updateUri)
        .send(updateData); // Ensure to send the updateData in the request
  
      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(gameToUpdateIdString);
      expect(response.body.name).to.equal(insertTestingGameData.name);
      expect(response.body.description).to.equal(insertTestingGameData.description);

    } finally {
      // Cleanup code to delete the testing game; this will run even if the test fails
      await deleteTestingGame(gameToUpdateIdString);
    }
  });

  // #############################################
  // delete


});
