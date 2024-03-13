import { ObjectId } from 'mongodb';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
  
import { app } from '../app.js';
import { getDb, dbClose } from '../dbClient.js';

import { getUserByIdOrEmail } from './utils.js';

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
}

export async function login(req, res, _next) {
}

export async function logout(req, res, _next) {
}

export async function removeUser(req, res, _next) {
}