import { spawn } from "child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { APIGatewayEvent } from "aws-lambda";

const db = new DynamoDBClient({});
const s3 = new S3Client({});

export const handler = async (event: any) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['movie_funcs.py', event.operation, JSON.stringify(event)]);

        let result = '';
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ statusCode: 200, body: result });
            } else {
                reject({ statusCode: 500, body: `Python script exited with code ${code}` });
            }
        });
    });
};
