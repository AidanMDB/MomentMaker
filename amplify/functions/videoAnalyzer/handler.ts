import { RekognitionClient, GetFaceDetectionCommand, CompareFacesCommand, FaceDetail } from '@aws-sdk/client-rekognition';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { SNSHandler, SNSEvent } from 'aws-lambda';
import { v4 as uuidv4 } from "uuid";
import Ffmpeg from 'fluent-ffmpeg';
import sharp from "sharp";
import { Readable } from 'stream';

const rekogClient = new RekognitionClient({region: 'us-east-1'});
const s3Client = new S3Client({region: 'us-east-1'});
const dbClient = new DynamoDBClient({region: 'us-east-1'});


let jobID: string | undefined;
let objectKey: string | undefined;
let bucketName: string | undefined;
let userID: string | undefined;


async function getS3Video() {
    console.log(`Getting image from S3 ${objectKey} in ${bucketName}`);
    const params = {
        Bucket: `${bucketName}`,
        Key: `${objectKey}`
    }
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    return response.Body;
}



/**
 * 
 * @param videoBody - The video body from S3.
 * @param timestamp - The timestamp to extract the frame from.
 * @returns - The extracted frame as a buffer.
 */
async function extractFrameFromVideo(videoBody: Readable, timestamp: number) {
    console.log(`Extracting frame from video at timestamp ${timestamp}`);
    const timestampSeconds = timestamp / 1000;
    
    return new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];

        const ffmpegStream = Ffmpeg(videoBody)
            .inputOptions([`-ss ${timestampSeconds}`])
            .outputOptions([`-vframes 1`, `-f image2pipe`, `-vcodec png`])
            .on('error', (err) => {
                console.error('Error extracting frame:', err);
                reject(err);
            })
            .on('end', () => {
                console.log('Frame extraction finished');
                resolve(Buffer.concat(buffers));
            })
            .pipe()

        ffmpegStream.on('data', (chunk: Buffer) => {
            buffers.push(chunk);
        })

        ffmpegStream.on('error', reject);
    });
}



/**
 * 
 * @param detectedFaces - Array of detected faces from Rekognition.
 * @returns buffers of cropped faces
 */
async function cropFace(detectedFaces: FaceDetail[], frameImageBody: Buffer) {
    console.log(`Cropping faces `);
    const image = sharp(frameImageBody);
    const imageMetadata = await image.metadata();

    const faceBuffers = [];
    for (let i = 0; i < detectedFaces.length; i++) {
        const boundingBox = detectedFaces[i].BoundingBox;
        
        // skip if no bounding box
        if (!boundingBox) {
            console.log(`No bounding box for face ${i}`);
            continue; 
        }

        const cropParams = {
            left: Math.round((boundingBox.Left || 0) * imageMetadata.width!),
            top: Math.round((boundingBox.Top || 0) * imageMetadata.height!),
            width: Math.round((boundingBox.Width || 0) * imageMetadata.width!),
            height: Math.round((boundingBox.Height || 0) * imageMetadata.height!),
        }
        console.log(`imageMetadata: \n${JSON.stringify(imageMetadata.height)}\n${JSON.stringify(imageMetadata.width)}`);
        console.log(`Cropping face ${i} with params: ${JSON.stringify(cropParams)}`);


        const croppedImage = await sharp(imageBody).extract(cropParams).toBuffer();
        faceBuffers.push(croppedImage);
    }

    return faceBuffers;
}





async function analyzeFacesInVideo(faceList: []) {

    if (!faceList.length) {
        console.log("No faces detected above 70% confidence");
        return;
    }

    for (const face of faceList) {
        face.Timestamp;

    }
}


async function getFacesFromVideo() {
    const params = {
        JobId: jobID
    }
    const command = new GetFaceDetectionCommand(params);
    const response = await rekogClient.send(command);
    console.log(`Get Detected Faces: ${JSON.stringify(response)}`);
    return response.Faces
}



export const handler: SNSHandler = async (event: SNSEvent) => {
    // loop throught all SNS events
    for (const record of event.Records) {
        const message = JSON.parse(record.Sns.Message);
        console.log(`Received message: ${message}`);

        // Check if the message is a successful video analysis result
        if (message.status === 'SUCCEEDED') {
            bucketName = message.Video.S3Bucket;
            objectKey = message.Video.S3ObjectName;
            jobID = message.jobID;
            console.log(`Video analysis succeeded for video ID: ${jobID}\n in bucket: ${bucketName}\n object key: ${objectKey}`);
            const videoFaceList = await getFacesFromVideo();


        }
    }
};


