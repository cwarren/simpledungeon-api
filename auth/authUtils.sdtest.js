import request from 'supertest';
import { expect, assert } from 'chai';
import { ObjectId } from 'mongodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
  
import { app } from '../app.js';
// import { getDb, dbClose } from '../dbClient.js';

import { getUserByIdOrEmail } from './utils.js';
import { registerUser, login, logout, removeUser } from "./controller.js";

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
const cognito = new AWS.CognitoIdentityServiceProvider();

const testExistingUserEmail = process.env.TEST_USER_EXISTING_EMAIL;
const testExistingUserId = process.env.TEST_USER_EXISTING_ID;
const testExistingUserPassword = process.env.TEST_USER_EXISTING_PASSWORD;
const testNewUserEmail = process.env.TEST_USER_NEW_EMAIL;
const testNewUserPassword = process.env.TEST_USER_NEW_PASSWORD;

describe('Test for Auth Utils', function() {
    const baseUri = '/auth';

    const existingUserInfo = {
        email: testExistingUserEmail,
        password: testExistingUserPassword,
    }

    let newUserId;

    // #############################################

    before(async function() {
    });

    after(async function() {
        // await dbClose();
    });


    // #############################################
    // util
    it('should get an existing user by id', async function() {
        const userData = await getUserByIdOrEmail(testExistingUserId, cognito);
        expect(userData.Username).to.equal(testExistingUserId);
    });

    it('should get an existing user by email', async function() {
        const userData = await getUserByIdOrEmail(testExistingUserEmail, cognito);
        expect(userData.Username).to.equal(testExistingUserId);
    });

    it('should get an empty result for a non-existing user', async function() {
        const userData = await getUserByIdOrEmail('blahblahblah', cognito);
        expect(Object.keys(userData)).to.be.empty;
    });
});