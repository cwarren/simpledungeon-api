import { ObjectId } from 'mongodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
  
import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

import { getUserByIdOrEmail } from './utils.js';

import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from 'crypto';

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

// ###################################

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

// ###################################

export async function login(req, res, _next) {
    const { email, password, newPassword } = req.body; // Assume `newPassword` is provided if needed
    const clientSecret = process.env.COGNITO_APP_CLIENT_SECRET;
    const secretHash = createHmac('SHA256', clientSecret)
                          .update(email + process.env.COGNITO_APP_CLIENT_ID)
                          .digest('base64');

    const client = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION,
    });

    const authCommand = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: secretHash,
        },
    });

    try {
        let authResult = await client.send(authCommand);

        if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            if (!newPassword) {
                return res.status(400).send({ message: 'New password required.' });
            }

            const challengeResponseCommand = new RespondToAuthChallengeCommand({
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                ClientId: process.env.COGNITO_APP_CLIENT_ID,
                Session: authResult.Session,
                ChallengeResponses: {
                    USERNAME: email,
                    NEW_PASSWORD: newPassword,
                    SECRET_HASH: secretHash,
                },
            });

            authResult = await client.send(challengeResponseCommand);
        }

        // Continue with the authentication process...
        if (authResult.AuthenticationResult) {
            res.status(200).send({
                accessToken: authResult.AuthenticationResult.AccessToken,
                idToken: authResult.AuthenticationResult.IdToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken,
            });
        } else {
            console.error('No authentication result returned');
            res.status(401).send({ message: 'Login failed' });
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(401).send({ message: 'Invalid email or password' });
    }
}

// ###################################

export async function logout(req, res, _next) {
}

// ###################################

export async function removeUser(req, res, _next) {
}