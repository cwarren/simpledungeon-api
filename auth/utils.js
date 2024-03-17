import { AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from 'crypto';
import { getDb }  from '../dbClient.js';

// #######################

export const getUserByIdOrEmail = async (userIdOrEmail, cognitoClient) => {
    try {
        const command = new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: userIdOrEmail,
        });
        const response = await cognitoClient.send(command);
        return response;
    } catch (error) {
        console.error("Error fetching user information:", error);
        return {};
    }
}

// #######################

export function generateRandomString(ofLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < ofLength; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// #######################

export function getSecretHash(email, clientId) {
    const clientSecret = process.env.COGNITO_APP_CLIENT_SECRET;    
    const secretHash = createHmac('SHA256', clientSecret)
                          .update(email + clientId)
                          .digest('base64');
    return secretHash;
}

// #######################

export async function blacklistToken(token, tokenExpiration) {
    const expiresAt = new Date(tokenExpiration * 1000); // JWT exp is in seconds
    const dbClient = getDb();
    await dbClient.collection("blacklistedTokens").insertOne({ token, expiresAt });
}

export async function isBlacklistedToken(token) {
    const dbClient = getDb();
    const tokenEntry = await dbClient.collection("blacklistedTokens").findOne({ token });
    return !!tokenEntry;
}
