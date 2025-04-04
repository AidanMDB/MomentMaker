import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import AdmZip from "adm-zip";
import { Readable } from "stream";

const s3Client = new S3Client();
const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.mp4'];


async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}



/**
 * 
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns
 */
async function getS3Object(bucket: string, key: string) {
    const params = {
        Bucket: bucket,
        Key: key
    };
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    return streamToBuffer(response.Body as any);
}

async function uploadToS3(key: string, body: Buffer) {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Body: body
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
}


export const handler: Handler = async (event) => {
    console.log('Event: ', event);
    
    const bucket = event.bucket;
    const key = event.key;
    
    const objectBuffer = await getS3Object(bucket, key);
    const zip = new AdmZip(objectBuffer);
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
        const fileName = zipEntry.entryName;

        for (const ext of allowedFileTypes) {
            if (fileName.endsWith(ext)) {
                uploadToS3(fileName, zipEntry.getData());
            }
        }
    }
};