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

describe('Integration Test for Auth Controller', function() {
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
    // login
    it.skip('should allow an existing user to login', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should prevent login for an existing user with an invalid password', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should prevent login for an invalid user', async function() {
        assert.fail('This test has not been implemented');
    });


    // #############################################
    // logout
    it.skip('should do nothing for logout if the user is not logged in', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should allow an existing logged user to logout', async function() {
        assert.fail('This test has not been implemented');
    });


    // #############################################
    // register
    it.skip('should allow an new user to register with a valid email address and password', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should prevent an new user from registering with an invalid email address', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should prevent an new user from registering with an invalid password', async function() {
        assert.fail('This test has not been implemented');
    });


    // #############################################
    // expunge
    it.skip('should do nothing for expunge if the user is not logged in', async function() {
        assert.fail('This test has not been implemented');
    });

    it.skip('should logout the user and remove their account', async function() {
        assert.fail('This test has not been implemented');
    });

});