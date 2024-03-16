import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import jwksRsa from 'jwks-rsa';
import { isBlacklistedToken } from './utils.js';
import { AUTH_MSG_UNAUTHORIZED, AUTH_MSG_BAD_TOKEN } from './controller.js';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const jwksUri = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const client = jwksRsa({
  jwksUri: jwksUri,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}
  
export function verifyJWT(req, res, next) {
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (!accessToken || isBlacklistedToken(accessToken)) {
        return res.status(401).send({ message: AUTH_MSG_UNAUTHORIZED });
    }

    // AWS Cognito tokens are signed by AWS, and cannot use a simple shared secret to 
    // verify them. Instead, use AWS's public keys (retrieved through getKey) to verify
    // the tokens. AWS Cognito typically uses RS256 (RSA signature with SHA-256) as the
    // signing algorithm for its tokens.
    jwt.verify(accessToken, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: AUTH_MSG_BAD_TOKEN });
        }
        req.user = decoded;
        next();
    });
}
