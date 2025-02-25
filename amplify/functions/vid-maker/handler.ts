import { spawn } from "child_process";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { Readable } from "stream";

const db = new DynamoDBClient({});
const s3 = new S3Client({ region: "us-east-1" });

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const bucketName = "amplify-d1mzyzgpuskuft-ma-mediastoragebucket2b6d90-qdrepwmd6l9v";
    const fileKeys = event.queryStringParameters?.fileKeys;

    if (!fileKeys) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing fileKeys parameter" }),
        };
    }

    // Parse fileKeys as an array
    const keysArray = JSON.parse(fileKeys);
    if (!Array.isArray(keysArray) || keysArray.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid fileKeys parameter. Must be a JSON array." }),
        };
    }

    try {
        const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
            return new Promise((resolve, reject) => {
                const chunks: Uint8Array[] = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("end", () => resolve(Buffer.concat(chunks)));
                stream.on("error", reject);
            });
        };

        const files = await Promise.all(keysArray.map(async (fileKey) => {
            try {
                const command = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: fileKey,
                });
                
                const response = await s3.send(command);
                if (!response.Body) {
                    return { fileKey, error: "File not found" };
                }

                const fileBuffer = await streamToBuffer(response.Body as Readable);
                const fileBase64 = fileBuffer.toString("base64");
                const contentType = response.ContentType || "application/octet-stream";
                
                return { fileKey, contentType, data: fileBase64 };
            } catch (error) {
                console.error(`Error fetching file ${fileKey} from S3:`, error);
                return { fileKey, error: "Failed to fetch file" };
            }
        }));

        const file_data_array = files.map((file) => file.data);
        return new Promise((resolve, reject) => {
            const validFileDataArray = file_data_array.filter((data): data is string => data !== undefined);
            const pythonProcess = spawn('python', ['movie_funcs.py', ...validFileDataArray]);
    
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
    } catch (error) {
        console.error("Error processing files:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
