import { expect } from 'chai';
import dotenv from 'dotenv';
  
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

import { getUserByIdOrEmail, getSecretHash } from './utils.js';

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
    // getUserByIdOrEmail
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

    // #############################################
    // getSecretHash

    describe('getSecretHash function', function() {
        const mockedCorrectHash = 'lAXzot9xIkpYTjsh+pXkJzSPxDjEbMIMXgtAHQX04T4=';

        beforeEach(function() {
            process.env.COGNITO_APP_CLIENT_SECRET = 'mockSecret';
            process.env.COGNITO_APP_CLIENT_ID = 'mockClientId';
        });

        it('should generate the correct hash for known inputs', function() {
            const email = 'test@example.com';
            const clientId = process.env.COGNITO_APP_CLIENT_ID;
            const expectedHash = mockedCorrectHash;

            const result = getSecretHash(email, clientId);

            expect(result).to.equal(expectedHash);
        });

        it('should produce different hashes for different emails', function() {
            const email1 = 'test@example.com';
            const email2 = 'another@example.com';
            const clientId = process.env.COGNITO_APP_CLIENT_ID;

            const hash1 = getSecretHash(email1, clientId);
            const hash2 = getSecretHash(email2, clientId);

            expect(hash1).to.not.equal(hash2);
        });

        it('should be consistent for the same input', function() {
            const email = 'consistent@example.com';
            const clientId = process.env.COGNITO_APP_CLIENT_ID;

            const hash1 = getSecretHash(email, clientId);
            const hash2 = getSecretHash(email, clientId);

            expect(hash1).to.equal(hash2);
        });
    });

});