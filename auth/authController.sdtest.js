import request from 'supertest';
import { expect, assert } from 'chai';
import dotenv from 'dotenv';
import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
  
import { app } from '../app.js';
import { verifyJWT } from './middleware.js';
import { AUTH_MSG_NEW_PASSWORD_REQUIRED, AUTH_MSG_INVALID_CREDENTIALS, AUTH_MSG_LOGGED_OUT } from "./controller.js";

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

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

    const protectedURI = '/auth/protectedTest';
    const authSuccessMessage = 'If you see this, you are authenticated';

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
        app.get(protectedURI, verifyJWT, (req, res) => {
            res.json({ message: authSuccessMessage });
        });
    });

    after(async function() {
        await resetNeedsNewPwUserState();
    });


    // #############################################
    // login
    it('should login successfully with correct credentials', async function() {
        this.timeout(10000); // Increase timeout to 10 seconds for this test, since actual auth may take longer than the default 2 seconds mocha uses
        const response = await request(app)
            .post(`${baseUri}/login`)
            .send(existingUserInfo);

        expect(response.status).to.equal(200);
        expect(response.body.accessToken).to.exist;
        expect(response.body.idToken).to.exist;
        expect(response.body.refreshToken).to.exist;
    });

    it('should allow access to protected endpoint once logged in', async function() {
        this.timeout(10000); // Increase timeout to 10 seconds for this test, since actual auth may take longer than the default 2 seconds mocha uses
        
        let protectedResponse = await request(app).get(protectedURI);
        expect(protectedResponse.status).to.equal(401);

        const loginResponse = await request(app)
            .post(`${baseUri}/login`)
            .send(existingUserInfo);

        protectedResponse = await request(app).get(protectedURI).set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        expect(protectedResponse.status).to.equal(200);
        expect(protectedResponse.body.message).to.equal(authSuccessMessage);      
    });

    it('should require a new password for NEW_PASSWORD_REQUIRED challenge', async () => {
        await resetNeedsNewPwUserState();

        const response = await request(app)
          .post(`${baseUri}/login`)
          .send(needsNewPwUserInfo);
      
        expect(response.status).to.equal(400);
        expect(response.body.message).to.equal(AUTH_MSG_NEW_PASSWORD_REQUIRED);
    });

    it('should handle NEW_PASSWORD_REQUIRED challenge', async () => {
        this.timeout(10000); // Increase timeout to 10 seconds for this test, since actual auth may take longer than the default 2 seconds mocha uses
        await resetNeedsNewPwUserState();

        const loginResponse = await request(app)
            .post(`${baseUri}/login`)
            .send(needsNewPwUserInfo);
        
        expect(loginResponse.status).to.equal(400);
        expect(loginResponse.body.message).to.equal(AUTH_MSG_NEW_PASSWORD_REQUIRED);
        
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
        expect(response.body.message).to.equal(AUTH_MSG_INVALID_CREDENTIALS);
    });

    it('should not login with incorrect credentials - bad user', async function() {
        const response = await request(app)
            .post(`${baseUri}/login`)
            .send({ email: 'nonexistentuser@example.com', password: 'somePassword' });

        expect(response.status).to.equal(401);
        expect(response.body.message).to.equal(AUTH_MSG_INVALID_CREDENTIALS);
    });


    // #############################################
    // logout
    it('should disallow logout if the user is not logged in', async function() {
        const logoutResponse = await request(app)
            .post(`${baseUri}/logout`);
        expect(logoutResponse.status).to.equal(401);
        expect(logoutResponse.body.message).to.equal('Unauthorized');
    });

    it('should allow an existing logged user to logout', async function() {
        const loginResponse = await request(app)
            .post(`${baseUri}/login`)
            .send(existingUserInfo);
        expect(loginResponse.status).to.equal(200);
        expect(loginResponse.body.accessToken).to.exist;
    
        const logoutResponse = await request(app)
            .post(`${baseUri}/logout`)
            .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        expect(logoutResponse.status).to.equal(200);
        expect(logoutResponse.body.message).to.equal(AUTH_MSG_LOGGED_OUT);
    });

    it('should disallow access a protected endpoint after logout', async function() {
        const loginResponse = await request(app)
            .post(`${baseUri}/login`)
            .send(existingUserInfo);
        expect(loginResponse.status).to.equal(200);

        let protectedResponse = await request(app).get(protectedURI).set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        expect(protectedResponse.status).to.equal(200);

        const logoutResponse = await request(app)
            .post(`${baseUri}/logout`)
            .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        expect(logoutResponse.status).to.equal(200);
        
        protectedResponse = await request(app).get(protectedURI).set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        expect(protectedResponse.status).to.equal(401);
        expect(protectedResponse.body.message).to.equal('Unauthorized');
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