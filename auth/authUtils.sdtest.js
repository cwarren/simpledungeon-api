import { expect } from 'chai';
import dotenv from 'dotenv';
  
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

import { getUserByIdOrEmail } from './utils.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
});

const testExistingUserEmail = process.env.TEST_USER_EXISTING_EMAIL;
const testExistingUserId = process.env.TEST_USER_EXISTING_ID;

describe('Test for Auth Utils', function() {

    // #############################################

    before(async function() {
    });

    after(async function() {
    });


    // #############################################
    // util
    it('should get an existing user by id', async function() {
        const userData = await getUserByIdOrEmail(testExistingUserId, cognitoClient);
        expect(userData.Username).to.equal(testExistingUserId);
    });

    it('should get an existing user by email', async function() {
        const userData = await getUserByIdOrEmail(testExistingUserEmail, cognitoClient);
        expect(userData.Username).to.equal(testExistingUserId);
    });

    it('should get an empty result for a non-existing user', async function() {
        const userData = await getUserByIdOrEmail('blahblahblah', cognitoClient);
        expect(Object.keys(userData)).to.be.empty;
    });
});