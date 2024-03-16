import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";

import { getSecretHash, blacklistToken  } from './utils.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
});

// ###################################
// registration / sign up

export async function registerUser(req, res, _next) {
    const { email, password } = req.body;
    res.status(500).send({ message: 'User regsitration is not yet supported' });
    // const params = {
    //     Username: email,
    //     Password: password,
    //     UserPoolId: process.env.COGNITO_USER_POOL_ID,
    //     UserAttributes: [
    //         { Name: 'email', Value: email }
    //     ]
    // };

    // try {
    //     await cognito.signUp(params).promise();
    //     res.status(201).send({ message: 'User created successfully!' });
    // } catch (error) {
    //     console.error('Error creating user:', error);
    //     res.status(500).send({ message: 'Error creating user' });
    // }
}

// ###################################
// login

export const AUTH_MSG_NEW_PASSWORD_REQUIRED = 'New password required.';
export const AUTH_MSG_INVALID_CREDENTIALS = 'Invalid email or password';
export const AUTH_MSG_LOGGED_OUT = 'Successfully logged out';

async function handleChallengeNewPasswordRequired(authResult, email, newPassword, secretHash) {
    if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        if (!newPassword) {
            return AUTH_MSG_NEW_PASSWORD_REQUIRED;
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

        authResult = await cognitoClient.send(challengeResponseCommand);
    }
    return authResult;
}

export async function login(req, res, _next) {
    const { email, password, newPassword } = req.body; // Assume `newPassword` is provided if needed
    const secretHash = getSecretHash(email, process.env.COGNITO_APP_CLIENT_ID);

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
        let authResult = await cognitoClient.send(authCommand);
        
        authResult = await handleChallengeNewPasswordRequired(authResult, email, newPassword, secretHash);
        if (authResult === AUTH_MSG_NEW_PASSWORD_REQUIRED) {
            return res.status(400).send({ message: AUTH_MSG_NEW_PASSWORD_REQUIRED });
        }

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
        res.status(401).send({ message: AUTH_MSG_INVALID_CREDENTIALS });
    }
}

// ###################################
// logout

export async function logout(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && req.user) {
        blacklistToken(token);
        res.status(200).send({ message: 'Successfully logged out' });
    } else {
        res.status(400).send({ message: 'No active session' });
    }
}

// ###################################
// remove user / expunge

export async function removeUser(req, res, _next) {
}