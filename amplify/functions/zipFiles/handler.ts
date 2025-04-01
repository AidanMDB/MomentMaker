import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";

const s3Client = new S3Client();


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
    return response.Body;
}


export const handler: Handler = async (event) => {
    console.log('Event: ', event);
    
    const bucket = event.bucket;
    const key = event.key;
    
    const objectData = await getS3Object(bucket, key);
};