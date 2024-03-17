import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, SignUpCommand  } from "@aws-sdk/client-cognito-identity-provider";

import { getSecretHash, blacklistToken  } from './utils.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
});

export const AUTH_MSG_NEW_PASSWORD_REQUIRED = 'New password required.';
export const AUTH_MSG_INVALID_CREDENTIALS = 'Invalid email or password';
export const AUTH_MSG_LOGGED_OUT = 'Successfully logged out';
export const AUTH_MSG_UNAUTHORIZED = 'Unauthorized';
export const AUTH_MSG_BAD_TOKEN = 'Invalid access token';
export const AUTH_MSG_GENERIC_LOGIN_FAILURE = 'Login failed';
export const AUTH_MSG_NO_SESSION = 'No active session';
export const AUTH_MSG_REGISTRATION_SUCCESS = 'User registration successful. Please check your email to confirm your account.';
export const AUTH_MSG_REGISTRATION_GENERIC_FAILURE = 'Error registering user.';
export const AUTH_MSG_REGISTRATION_BAD_EMAIL = 'Error registering user - Invalid email address.';
export const AUTH_MSG_REGISTRATION_ALREADY_REGISTERED = 'Error registering user -  An account with the given email already exists.';
export const AUTH_MSG_REGISTRATION_POOR_PASSWORD = 'Password did not conform with policy.';

// ###################################
// registration / sign up

export async function registerUser(req, res, _next) {
    const { email, password } = req.body;
    const secretHash = getSecretHash(email, process.env.COGNITO_APP_CLIENT_ID);

    const params = {
        ClientId: process.env.COGNITO_APP_CLIENT_ID,
        Username: email,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: [
            {
                Name: 'email',
                Value: email
            },
        ],
    };

    try {
        await cognitoClient.send(new SignUpCommand(params));
        res.status(200).send({ message: AUTH_MSG_REGISTRATION_SUCCESS });
    } catch (error) {
        console.error('Error registering user:', error);
        
        if (error.name === 'InvalidParameterException' && error.message.includes("Invalid email address format")) {
            return res.status(400).send({ message: AUTH_MSG_REGISTRATION_BAD_EMAIL });
        }

        if (error.name === 'UsernameExistsException') {
            return res.status(400).send({ message: AUTH_MSG_REGISTRATION_ALREADY_REGISTERED });
        }

        if (error.name === 'InvalidPasswordException') {
            return res.status(400).send({ message: AUTH_MSG_REGISTRATION_POOR_PASSWORD });
        }

        return res.status(500).send({ message: AUTH_MSG_REGISTRATION_GENERIC_FAILURE });
    }
}

// ###################################
// login

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
    const { email, password, newPassword } = req.body;
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
            res.status(401).send({ message: AUTH_MSG_GENERIC_LOGIN_FAILURE });
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
        await blacklistToken(token, req.user.exp);
        res.status(200).send({ message: AUTH_MSG_LOGGED_OUT });
    } else {
        res.status(400).send({ message: AUTH_MSG_NO_SESSION });
    }
}

// ###################################
// remove user / expunge

export async function removeUser(req, res, _next) {
}