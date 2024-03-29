import request from 'supertest';
import { expect, assert } from 'chai';
import dotenv from 'dotenv';
import { CognitoIdentityProviderClient, AdminSetUserPasswordCommand, AdminCreateUserCommand, AdminConfirmSignUpCommand, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";

import { app } from '../app.js';
import { verifyJWT } from './middleware.js';
import {
    AUTH_MSG_NEW_PASSWORD_REQUIRED,
    AUTH_MSG_INVALID_CREDENTIALS, 
    AUTH_MSG_LOGGED_OUT, 
    AUTH_MSG_UNAUTHORIZED,
    AUTH_MSG_REGISTRATION_SUCCESS,
    AUTH_MSG_REGISTRATION_GENERIC_FAILURE,
    AUTH_MSG_REGISTRATION_BAD_EMAIL,
    AUTH_MSG_REGISTRATION_ALREADY_REGISTERED,
    AUTH_MSG_REGISTRATION_POOR_PASSWORD,
    AUTH_MSG_USER_EXPUNGED,
} from "./controller.js";
import { getUserByIdOrEmail } from './utils.js';


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

async function removeCognitoUser(email) {
    try {
        await cognitoClient.send(new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: email,
        }));
    } catch (error) {
        console.error(`Failed to clean up test user ${email}:`, error);
    }
}

async function createAndConfirmUser(email, password) {
    const createUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS', // To prevent sending an invitation message to the user
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        }
      ],
    };
  
    try {
        const createUserResponse = await cognitoClient.send(new AdminCreateUserCommand(createUserParams));
        console.log('User created:', createUserResponse);

        // This makes the password permanent and moves the user out of FORCE_CHANGE_PASSWORD state
        // and as a side effect also means the email confirmation is handled (since in cognito it's
        // all a part of the same flow, I think)
        const setUserPasswordParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: email,
            Password: password,
            Permanent: true, 
        };
        await cognitoClient.send(new AdminSetUserPasswordCommand(setUserPasswordParams));
        console.log('User password set and user confirmed');
    } catch (error) {
        console.error('Error creating or setting password or confirming user:', error);
    }
}

// ###############################
// actual tests

describe('Integration Tests for Auth Controller', function() {
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

    const newUserInfo = {
        email: testNewUserEmail,
        password: testNewUserPassword,
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
    describe('Login Integration Test', function() {
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
    });


    // #############################################
    // logout
    describe('Logout Integration Test', function() {
        it('should disallow logout if the user is not logged in', async function() {
            const logoutResponse = await request(app)
                .post(`${baseUri}/logout`);
            expect(logoutResponse.status).to.equal(401);
            expect(logoutResponse.body.message).to.equal(AUTH_MSG_UNAUTHORIZED);
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
            expect(protectedResponse.body.message).to.equal(AUTH_MSG_UNAUTHORIZED);
        });
    });

    // #############################################
    // register

    describe('Register User Integration Test', function() {
        it('should allow an new user to register with a valid email address and password', async function() {
            const response = await request(app)
                .post(`${baseUri}/register`)
                .send({
                    email: testNewUserEmail,
                    password: testNewUserPassword,
                });

            expect(response.status).to.equal(200);
            expect(response.body.message).to.equal(AUTH_MSG_REGISTRATION_SUCCESS);

            const userInfo = await getUserByIdOrEmail(testNewUserEmail, cognitoClient);
            expect(userInfo.UserAttributes).to.satisfy((attributes) => 
                attributes.some(attr => attr.Name === 'email' && attr.Value === testNewUserEmail));

            await removeCognitoUser(testNewUserEmail);
        });

        it('should prevent an new user from registering with an invalid email', async function() {
            const response = await request(app)
                .post(`${baseUri}/register`)
                .send({
                    email: 'notAnEmail',
                    password: testNewUserPassword,
                });

            expect(response.status).to.equal(400);
            expect(response.body.message).to.equal(AUTH_MSG_REGISTRATION_BAD_EMAIL);
        });

        it('should prevent an new user from registering with a poor password', async function() {
            const response = await request(app)
                .post(`${baseUri}/register`)
                .send({
                    email: 'foo@example.com',
                    password: 'password',
                });

            expect(response.status).to.equal(400);
            expect(response.body.message).to.equal(AUTH_MSG_REGISTRATION_POOR_PASSWORD);
        });

        it('should prevent an new user from registering with an email that is already registered', async function() {
            const response = await request(app)
                .post(`${baseUri}/register`)
                .send({
                    email: testExistingUserEmail,
                    password: testNewUserPassword,
                });

            expect(response.status).to.equal(400);
            expect(response.body.message).to.equal(AUTH_MSG_REGISTRATION_ALREADY_REGISTERED);
        });
    });


    // #############################################
    // expunge
    describe('Expunge User Integration Test', function() {

        after(async function() {
            const newUserInfo = await getUserByIdOrEmail(testNewUserEmail, cognitoClient);
            if (newUserInfo) {
                removeCognitoUser(testNewUserEmail);
            }
        });

        it('should disallow user removal if the user is not logged in', async function() {
            const expungeResponse = await request(app)
                .post(`${baseUri}/expunge`);
            expect(expungeResponse.status).to.equal(401);
            expect(expungeResponse.body.message).to.equal(AUTH_MSG_UNAUTHORIZED);
        });

        it('should logout the user and remove their account', async function() {
            await createAndConfirmUser(testNewUserEmail, testNewUserPassword);

            const loginResponse = await request(app)
                .post(`${baseUri}/login`)
                .send(newUserInfo);
            expect(loginResponse.status).to.equal(200);
            expect(loginResponse.body.accessToken).to.exist;
        
            const expungeResponse = await request(app)
                .post(`${baseUri}/expunge`)
                .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
            expect(expungeResponse.status).to.equal(200);
            expect(expungeResponse.body.message).to.equal(AUTH_MSG_USER_EXPUNGED);

            const userInfo = await getUserByIdOrEmail(testNewUserEmail, cognitoClient);
            expect(userInfo).to.be.empty;
        });

        it.skip('should mark their application data for deletion due to user expunging', async function() {
            assert.fail('This test has not been implemented (waiting on user application data to exist)');
        });
    });

});