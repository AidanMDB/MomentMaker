import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import AdmZip from "adm-zip";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client();
//const allowedFileTypes = ['.jpg', '.jpeg', '.png', '.mp4'];
const userID = "user1";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'mpeg'];

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
    return streamToBuffer(response.Body as Readable);
}

/**
 * Uploads a file to S3
 * @param key - S3 object key
 * @param body - File content as Buffer
 */
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

        if (zipEntry.isDirectory) {
            continue; // Skip directories
        }
        

        const fileName = zipEntry.entryName;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        if (fileExtension === undefined) {
            console.log(`File ${fileName} has no extension.`);
            continue; // Skip files without an extension
        }

        if (zipEntry.header.size > MAX_FILE_SIZE) {
            console.log(`File ${fileName} exceeds the maximum size of ${MAX_FILE_SIZE} bytes.`);
            continue; // Skip files that exceed the maximum size
        }

        let fileTypeFolder: string = ''
        if (IMAGE_EXTENSIONS.includes(fileExtension)) {
            fileTypeFolder = 'image';
        }
        else if (VIDEO_EXTENSIONS.includes(fileExtension)) {
            fileTypeFolder = 'video';
        }
        else if (AUDIO_EXTENSIONS.includes(fileExtension)) {
            fileTypeFolder = 'audio';
        } else {
            console.log(`File ${fileName} has an unsupported file type.`);
            continue; // Skip unsupported file types
        }

        if (fileTypeFolder) {
            const newKey = `user-media/${userID}/${fileTypeFolder}/${uuidv4()}.${fileExtension}`;
            const fileBuffer = zipEntry.getData();
            await uploadToS3(newKey, fileBuffer);
            console.log(`Uploaded ${fileName} to ${newKey}`);
        }
    }
};