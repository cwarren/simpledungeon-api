import { ObjectId } from 'mongodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
  
import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

import { getUserByIdOrEmail } from './utils.js';

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

export async function registerUser(req, res, _next) {
    const { email, password } = req.body;

    const params = {
        Username: email,
        Password: password,
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        UserAttributes: [
            { Name: 'email', Value: email }
        ]
    };

    try {
        await cognito.signUp(params).promise();
        res.status(201).send({ message: 'User created successfully!' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({ message: 'Error creating user' });
    }
}

export async function login(req, res, _next) {
    const { email, password } = req.body;

    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: 'YOUR_COGNITO_USER_POOL_CLIENT_ID',
        AuthParameters: {
            USERNAME: email
        }
    };

    try {
        const data = await cognito.initiateAuth(params).promise();
        res.status(200).send({ accessToken: data.AuthenticationResult.AccessToken });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(401).send({ message: 'Invalid email or password' });
    }
}

export async function logout(req, res, _next) {
}

export async function removeUser(req, res, _next) {
}