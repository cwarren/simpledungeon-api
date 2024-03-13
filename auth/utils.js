export const getUserByIdOrEmail = async (userIdOrEmail, cognito) => {
    try {
        const params = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID, // Replace with your Cognito User Pool ID
            Username: userIdOrEmail
        };
        const userData = await cognito.adminGetUser(params).promise();
        return userData;
    } catch (error) {
        console.error('Error getting user:', error);
        return {};
    }
};