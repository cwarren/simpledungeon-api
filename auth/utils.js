import { AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from 'crypto';

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

export function getSecretHash(email, clientId) {
    const clientSecret = process.env.COGNITO_APP_CLIENT_SECRET;    
    const secretHash = createHmac('SHA256', clientSecret)
                          .update(email + clientId)
                          .digest('base64');
    return secretHash;
}

const tokenBlacklist = {};

export function blacklistToken(token) {
    tokenBlacklist[token] = true;
}

export function isBlacklistedToken(token) {
    return tokenBlacklist[token] === true;
}