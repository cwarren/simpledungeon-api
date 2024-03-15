import request from 'supertest';
import { expect, assert } from 'chai';
// import { ObjectId } from 'mongodb';
// import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
  
import { app } from '../app.js';
// import { getDb, dbClose } from '../dbClient.js';

// import { getUserByIdOrEmail } from './utils.js';
// import { registerUser, login, logout, removeUser } from "./controller.js";



if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

// AWS.config.update({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION
//   });
// const cognito = new AWS.CognitoIdentityServiceProvider();


const userPoolId = process.env.COGNITO_USER_POOL_ID;
const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
});


const testExistingUserEmail = process.env.TEST_USER_EXISTING_EMAIL;
const testExistingUserPassword = process.env.TEST_USER_EXISTING_PASSWORD;

const testNeedsNewPwUserEmail = process.env.TEST_USER_NEEDS_NEW_PW_EMAIL;
const testNeedsNewPwUserPassword = process.env.TEST_USER_NEEDS_NEW_PW_PASSWORD;

const testNewUserEmail = process.env.TEST_USER_NEW_EMAIL;
const testNewUserPassword = process.env.TEST_USER_NEW_PASSWORD;

// ###############################
// supporting functions

async function resetNeedsNewPwUserState() {
    try {
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: testNeedsNewPwUserEmail,
        Password: testNeedsNewPwUserPassword, 
        Permanent: false, // The user will be required to change the password on next login
      }));
  
      console.log("Test user state reset successfully.");
    } catch (error) {
      console.error("Failed to reset test user state:", error);
    }
}

// ###############################
// actual tests

describe('Integration Test for Auth Controller', function() {
    const baseUri = '/auth';

    const existingUserInfo = {
        email: testExistingUserEmail,
        password: testExistingUserPassword,
    }

    const needsNewPwUserInfo = {
        email: testNeedsNewPwUserEmail,
        password: testNeedsNewPwUserPassword,
    }

    let newUserId;

    // #############################################

    before(async function() {
    });

    after(async function() {
        await resetNeedsNewPwUserState();
    });


    // #############################################
    // login
    it('should login successfully with correct credentials', async function() {
        this.timeout(10000); // Increase timeout to 10 seconds for this test, since actual auth may take longer
        const response = await request(app)
            .post(`${baseUri}/login`)
            .send(existingUserInfo);

            expect(response.status).to.equal(200);
            expect(response.body.accessToken).to.exist;
            expect(response.body.idToken).to.exist;
            expect(response.body.refreshToken).to.exist;
    });

    it('should require a new password for NEW_PASSWORD_REQUIRED challenge', async () => {
        await resetNeedsNewPwUserState();

        const response = await request(app)
          .post(`${baseUri}/login`)
          .send(needsNewPwUserInfo);
      
        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal('New password required.');
    });

    it('should handle NEW_PASSWORD_REQUIRED challenge', async () => {
        await resetNeedsNewPwUserState();

        const loginResponse = await request(app)
            .post(`${baseUri}/login`)
            .send(needsNewPwUserInfo);
        
        expect(loginResponse.status).to.equal(400);
        expect(loginResponse.body.message).to.equal('New password required.');
        
        const newPasswordResponse = await request(app)
            .post(`${baseUri}/login`)
            .send({ ...needsNewPwUserInfo, newPassword: 'newSecurePassword!123' });
        
        expect(newPasswordResponse.status).to.equal(200);
        expect(newPasswordResponse.body).to.have.property('accessToken');
    });

    it('should not login with incorrect credentials - bad password', async function() {
        const response = await request(app)
            .post(`${baseUri}/login`)
            .send({ ...existingUserInfo, password: 'wrongPassword' });

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal('Invalid email or password');
    });

    it('should not login with incorrect credentials - bad user', async function() {
        const response = await request(app)
            .post(`${baseUri}/login`)
            .send({ email: 'nonexistentuser@example.com', password: 'somePassword' });

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal('Invalid email or password');
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