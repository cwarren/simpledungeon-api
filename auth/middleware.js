import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

export function verifyJWT (req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
  
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
  
    try {
        jwt.verify(token, process.env.COGNITO_APP_CLIENT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).send({ message: 'Invalid token' });
            }
            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Error verifying JWT:', error);
        return res.status(500).send({ message: 'Internal server error' });
    }
};
