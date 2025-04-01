import { spawn } from "child_process";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { uploadData } from 'aws-amplify/storage';
import fs from "fs";
import { join, basename } from "path";
import { pipeline } from "stream";
import { promisify } from "util";

const pipe = promisify(pipeline);

const s3Client = new S3Client({ region: "us-east-1" });

const BUCKET_NAME = "amplify-d1mzyzgpuskuft-ma-mediastoragebucket2b6d90-qdrepwmd6l9v";

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

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

    await downloadAllMediaFromS3();

    return new Promise((resolve, reject) => {
        const validFileDataArray = keysArray.filter((data): data is string => data !== undefined);
        const pythonProcess = spawn('python', ['movie_funcs.py', ...validFileDataArray]);

        let result = '';
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                return reject({ statusCode: 500, body: `Python script exited with code ${code}` });
            }

            let file: Buffer | null = null;
            if (result.length > 0) {
                file = readVideoFile(result);
                if (!file) {
                    console.error("Error reading video file:", result);
                    return reject({ statusCode: 500, body: "Error reading final moment video file" });
                }

                try {
                    await uploadData({
                        path: `user-media/moments/${result}`,
                        data: file,
                        options: {
                            bucket: 'MediaStorage',
                            metadata: {
                                fileType: `video/mp4`,
                                userID: `user1`
                            }
                        }
                    });

                    console.log("Moment uploaded to S3 successfully!");
                } catch (error) {
                    console.log("Error uploading moment to S3:", error);
                    return reject({ statusCode: 500, body: "Error uploading moment to S3" });
                }
            }

            resolve({ statusCode: 200, body: result });
        });
    });
};

function readVideoFile(filePath: string): Buffer | null {
    try {
        const data = fs.readFileSync(filePath);
        console.log(`Video file read: ${filePath}`);
        return data;
    } catch (error) {
        console.error(`Error reading video file: ${error}`);
        return null;
    }
}

/**
 * Downloads all media files from an S3 bucket to a specified local directory.
 * @param bucketName - The name of the S3 bucket.
 * @param localSavePath - The local directory where files will be saved.
 */
export async function downloadAllMediaFromS3() {
    try {
      // List all objects in the bucket
      const listCommand = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
      const listResponse = await s3Client.send(listCommand);
  
      if (!listResponse.Contents) {
        console.log("No files found in the bucket.");
        return;
      }
  
      for (const file of listResponse.Contents) {
        if (!file.Key) continue; // Skip if the key is undefined
  
        console.log(`Downloading: ${file.Key}`);

        const fileName = basename(file.Key); // Get only the file name (remove any folder structure)
        const filePath = join("./", fileName); 
  
        // Get the file from S3
        const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key });
        const { Body } = await s3Client.send(getCommand);
  
        if (Body) {
          const writeStream = fs.createWriteStream(filePath);
          await pipe(Body as NodeJS.ReadableStream, writeStream);
          console.log(`Saved: ${filePath}`);
        }
      }
    } catch (error) {
      console.error("Error downloading files:", error);
    }
}
  


