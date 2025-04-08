import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import AdmZip from "adm-zip";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client();
const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.mp4'];
const userID = "user1";

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


// Do security and file size checks

export const handler: Handler = async (event) => {
    console.log('Event: ', event);
    
    const bucket = event.bucket;
    const key = event.key;
    
    const objectBuffer = await getS3Object(bucket, key);
    const zip = new AdmZip(objectBuffer);
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
        const fileName = zipEntry.entryName;
        const fileExtension = fileName.split('.').pop();
        
        if (fileExtension === 'jpg' || 'jpeg' || 'png') {
            const fileBuffer = zipEntry.getData();
            const newKey = `user-media/${userID}/image/${uuidv4()}.${fileExtension}`;
            await uploadToS3(newKey, fileBuffer);
            console.log(`Uploaded image: ${newKey}`);
        }
        else if (fileExtension === 'mp4' || 'mov' || 'avi' || 'mkv') {
            const fileBuffer = zipEntry.getData();
            const newKey = `user-media/${userID}/video/${uuidv4()}.${fileExtension}`;
            await uploadToS3(newKey, fileBuffer);
            console.log(`Uploaded video: ${newKey}`);
        }
        else if (fileExtension === 'mp3' || 'mpeg') {
            const fileBuffer = zipEntry.getData();
            const newKey = `user-media/${userID}/audio/${uuidv4()}.${fileExtension}`;
            await uploadToS3(newKey, fileBuffer);
            console.log(`Uploaded audio: ${newKey}`);
        }
    }
};