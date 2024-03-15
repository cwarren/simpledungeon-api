import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import jwksRsa from 'jwks-rsa';

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

    if (!accessToken) {
        return res.status(401).send({ message: 'Unauthorized' });
    }

    jwt.verify(accessToken, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Invalid access token' });
        }
        req.user = decoded;
        next();
    });
}
