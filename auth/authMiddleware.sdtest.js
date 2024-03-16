import request from 'supertest';
import { expect } from 'chai';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getSecretHash } from './utils.js';
import { AUTH_MSG_UNAUTHORIZED, AUTH_MSG_BAD_TOKEN } from './controller.js';
  
import { app } from '../app.js';

import { verifyJWT } from './middleware.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}


const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

async function getTokensForTestUser() {
  const secretHash = getSecretHash(process.env.TEST_USER_EXISTING_EMAIL, process.env.COGNITO_APP_CLIENT_ID);
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_APP_CLIENT_ID,
    AuthParameters: {
      USERNAME: process.env.TEST_USER_EXISTING_EMAIL,
      PASSWORD: process.env.TEST_USER_EXISTING_PASSWORD,
      SECRET_HASH: secretHash,
    },
  });

  try {
    const { AuthenticationResult } = await cognitoClient.send(command);
    return {
      validToken: AuthenticationResult.IdToken,
      invalidToken: 'some-invalid-token',
      expiredToken: 'some-expired-token',
    };
  } catch (error) {
    console.error('Error acquiring test user tokens:', error);
    return null;
  }
}

describe('Tests for Auth Middleware', function() {

    let tokens = { validToken: '', invalidToken: '', expiredToken: '' };
    let req, res, next;
    const protectedURI = '/auth/protectedTest';
    const authSuccessMessage = 'If you see this, you are authenticated';

    // #############################################

    before(async function() {
        this.timeout(10000); // Increase timeout if needed, as token fetching can take time
        tokens = await getTokensForTestUser();
        if (!tokens) {
            throw new Error('Failed to acquire tokens for tests');
        }
        app.get(protectedURI, verifyJWT, (req, res) => {
          res.json({ message: authSuccessMessage });
        });
    });

    beforeEach(function() {
        req = { headers: {} };
        res = {
          status: function(code) {
            this.statusCode = code;
            return this;
          },
          send: function(body) {
            this.body = body;
            return this;
          }
        };
        next = () => {};
    });


    // #############################################
    // middleware unit tests

    it('should deny verification if the authorization header is not present', function() {
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: AUTH_MSG_UNAUTHORIZED });
    });

    it('should deny verification if the auth token is invalid', function() {
        req.headers.authorization = `Bearer ${tokens.invalidToken}`;
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: AUTH_MSG_BAD_TOKEN });
    });

    it('should deny verification if the auth token is expired', function() {
        req.headers.authorization = `Bearer ${tokens.expiredToken}`;
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: AUTH_MSG_BAD_TOKEN });
    });

    it('should set the user in the request if the token verification succeeds', async function() {
        req.headers.authorization = `Bearer ${tokens.validToken}`;
      
        await new Promise((resolve, reject) => {
            const nextModified = () => {
                resolve();
            };
    
            verifyJWT(req, res, nextModified);
        });
        
        // Since 'next' is a stub, we can't directly check if it was called here,
        // but absence of res.statusCode or res.body being set indicates it proceeded.
        expect(res).to.not.have.property('statusCode');
        expect(res).to.not.have.property('body');
        expect(req).to.have.property('user');
        expect(req.user).to.have.property('email', process.env.TEST_USER_EXISTING_EMAIL);
    });

    // #############################################
    // middleware integration tests

    it('should block access without a token', async function() {
      const response = await request(app).get(protectedURI);
  
      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal(AUTH_MSG_UNAUTHORIZED);
    });
  
    it('should block access with an invalid token', async function() {
      const response = await request(app).get(protectedURI).set('Authorization', 'Bearer wrongtoken');
  
      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal(AUTH_MSG_BAD_TOKEN);
    });

    it('should allow access with a valid token', async function() {
      const response = await request(app).get(protectedURI).set('Authorization', `Bearer ${tokens.validToken}`);
  
      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal(authSuccessMessage);
    });

});