// import request from 'supertest';
import { expect, assert } from 'chai';
// import sinon from 'sinon';
// import { ObjectId } from 'mongodb';
// import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
  
// import { app } from '../app.js';

import { verifyJWT } from './middleware.js';

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

// const testExistingUserEmail = process.env.TEST_USER_EXISTING_EMAIL;
// const testExistingUserId = process.env.TEST_USER_EXISTING_ID;
// const testExistingUserPassword = process.env.TEST_USER_EXISTING_PASSWORD;
// const testNewUserEmail = process.env.TEST_USER_NEW_EMAIL;
// const testNewUserPassword = process.env.TEST_USER_NEW_PASSWORD;

// const mockReq = (headers = {}) => {
//     return {
//       headers,
//     };
//   };

describe('Tests for Auth Middleware', function() {

    // const baseUri = '/auth';

    // const existingUserInfo = {
    //     email: testExistingUserEmail,
    //     password: testExistingUserPassword,
    // }

    // let newUserId;

    // // #############################################

    let validToken, invalidToken, expiredToken;
    let req, res, next;
  
    before(function() {
      // Generate a valid token
      validToken = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.COGNITO_APP_CLIENT_SECRET, { expiresIn: '1h' });
  
      // Generate an invalid token (using an incorrect secret)
      invalidToken = jwt.sign({ userId: '123', email: 'test@example.com' }, 'wrongsecret', { expiresIn: '1h' });
  
      // Generate an expired token
      expiredToken = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.COGNITO_APP_CLIENT_SECRET, { expiresIn: '-1h' });
    });


    beforeEach(function() {
        // Mock request and response objects for each test
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
        // Mock next function
        next = () => {};
    });


    // #############################################
    // middleware

    it('should block if the authorization header is not present', function() {
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: 'Unauthorized' });
    });

    it('should block if the auth token is invalid', function() {
        req.headers.authorization = `Bearer ${invalidToken}`;
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: 'Invalid token' });
    });

    it('should block if the auth token is expired', function() {
        req.headers.authorization = `Bearer ${expiredToken}`;
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: 'Invalid token' });
    });

    it('should set the user in the request if the token verification succeeds', function() {
        req.headers.authorization = `Bearer ${validToken}`;
        verifyJWT(req, res, next);
        
        // Since 'next' is a stub, we can't directly check if it was called here,
        // but absence of res.statusCode or res.body being set indicates it proceeded.
        expect(res).to.not.have.property('statusCode');
        expect(res).to.not.have.property('body');
        expect(req).to.have.property('user');
        expect(req.user).to.have.property('email', 'test@example.com');
    });

});