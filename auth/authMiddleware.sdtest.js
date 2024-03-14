import request from 'supertest';
import { expect } from 'chai';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
  
import { app } from '../app.js';

import { verifyJWT } from './middleware.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

describe('Tests for Auth Middleware', function() {

    let validToken, invalidToken, expiredToken;
    let req, res, next;
    const protectedURI = '/auth/protectedTest';
    const authSuccessMessage = 'If you see this, you are authenticated';

    // #############################################

    before(function() {
        validToken = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.COGNITO_APP_CLIENT_SECRET, { expiresIn: '1h' });
        invalidToken = jwt.sign({ userId: '123', email: 'test@example.com' }, 'wrongsecret', { expiresIn: '1h' });
        expiredToken = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.COGNITO_APP_CLIENT_SECRET, { expiresIn: '-1h' });

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
        expect(res.body).to.deep.equal({ message: 'Unauthorized' });
    });

    it('should deny verification if the auth token is invalid', function() {
        req.headers.authorization = `Bearer ${invalidToken}`;
        verifyJWT(req, res, next);
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.deep.equal({ message: 'Invalid token' });
    });

    it('should deny verification if the auth token is expired', function() {
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

    // #############################################
    // middleware integration tests

    it('should block access without a token', async function() {
      const response = await request(app).get(protectedURI);
  
      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('Unauthorized');
    });
  
    it('should block access with an invalid token', async function() {
      const response = await request(app).get(protectedURI).set('Authorization', 'Bearer wrongtoken');
  
      expect(response.status).to.equal(401);
      expect(response.body.message).to.equal('Invalid token');
    });
  
    it('should allow access with a valid token', async function() {
      const response = await request(app).get(protectedURI).set('Authorization', `Bearer ${validToken}`);
  
      expect(response.status).to.equal(200);
      expect(response.body.message).to.equal(authSuccessMessage);
    });

});