import {MongoClient, ServerApiVersion} from 'mongodb';
import dotenv from 'dotenv';

if(process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
} else {
    dotenv.config();
}

const dbUser = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;
const uri = `mongodb+srv://${dbUser}:${dbPassword}@${dbHost}/?retryWrites=true&w=majority&appName=simpledungeon`;

// console.log('=================');
// console.dir(process.env);
// console.log(`Connecting to mongodb ${dbName} at ${dbHost} using uri ${uri}`);

const client = new MongoClient(uri, {
    serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
    }
});

let mongodbclient;

export async function dbConnect() {
    try {
        await client.connect();
        mongodbclient = client.db(dbName);
        console.log(`Connected successfully to mongodb ${dbName}`);
    } catch (e) {
        console.error(`Could not connect to mongodb ${dbName}`, e);
    }
}

export async function dbClose() {
    await client.close();
    console.log(`Disconnected from mongodb ${dbName}`);
}

export function getDb() {
    return mongodbclient;
}
