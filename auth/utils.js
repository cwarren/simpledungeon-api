import { AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

export const getUserByIdOrEmail = async (userIdOrEmail, cognitoClient) => {
    try {
        const command = new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID, // Replace with your user pool ID
            Username: userIdOrEmail, // The username of the user you want to get information about
        });
        const response = await cognitoClient.send(command);
        return response;
    } catch (error) {
        console.error("Error fetching user information:", error);
        return {};
    }
}