import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

console.log(process.env.API_KEY);

const app = express();
const port = 3000;

app.listen(port, () => {
    console.log(`Port ${port} is up and running!`)
})
