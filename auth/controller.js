import { ObjectId } from 'mongodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
  
import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

import { getUserByIdOrEmail } from './utils.js';

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";


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

    const client = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION,
    });

    const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    });

    try {
        const { AuthenticationResult } = await client.send(command);
        res.status(200).send({
            accessToken: AuthenticationResult.AccessToken,
            idToken: AuthenticationResult.IdToken,
            refreshToken: AuthenticationResult.RefreshToken,
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        if (error.name === 'NotAuthorizedException') {
            res.status(401).send({ message: 'Invalid email or password' });
        } else {
            res.status(500).send({ message: 'An error occurred during login' });
        }
    }
}

// export async function login(req, res, _next) {
//     const { email, password } = req.body;

//     const params = {
//         AuthFlow: 'USER_PASSWORD_AUTH',
//         ClientId: process.env.COGNITO_USER_POOL_ID,
//         AuthParameters: {
//             USERNAME: email
//         }
//     };

//     try {
//         const data = await cognito.initiateAuth(params).promise();
//         res.status(200).send({ accessToken: data.AuthenticationResult.AccessToken });
//     } catch (error) {
//         console.error('Error logging in user:', error);
//         res.status(401).send({ message: 'Invalid email or password' });
//     }
// }

export async function logout(req, res, _next) {
}

export async function removeUser(req, res, _next) {
}