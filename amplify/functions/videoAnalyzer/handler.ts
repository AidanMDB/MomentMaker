import { RekognitionClient, GetFaceDetectionCommand, CompareFacesCommand, FaceDetail, FaceDetection } from '@aws-sdk/client-rekognition';
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
async function extractFrameFromVideo(videoBody: Readable, timestamp: number | undefined) {
    console.log(`Extracting frame from video at timestamp ${timestamp}`);
    const timestampSeconds = timestamp! / 1000;
    
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
 * takes in a frame from the video containing the detected face and crops the face from the frame.
 * @param frameImageBuffer - The image buffer of the video frame.
 * @param detectedFace - Detected face details from ai rekognition.
 * @returns cropped face from the video frame
 */
async function cropFace(detectedFace: FaceDetail, frameImageBuffer: Buffer) {
    console.log(`Cropping faces `);
    const image = sharp(frameImageBuffer);
    const imageMetadata = await image.metadata();
    let faceBuffer: Buffer;
    const boundingBox = detectedFace.BoundingBox;

    const cropParams = {
        left: Math.round((boundingBox?.Left || 0) * imageMetadata.width!),
        top: Math.round((boundingBox?.Top || 0) * imageMetadata.height!),
        width: Math.round((boundingBox?.Width || 0) * imageMetadata.width!),
        height: Math.round((boundingBox?.Height || 0) * imageMetadata.height!),
    }
    console.log(`imageMetadata: \n${JSON.stringify(imageMetadata.height)}\n${JSON.stringify(imageMetadata.width)}`);
    console.log(`Cropping face with params: ${JSON.stringify(cropParams)}`);


    const croppedImage = await sharp(frameImageBuffer).extract(cropParams).toBuffer();
    faceBuffer = croppedImage;

    return faceBuffer;
}



/**
 * Function gets all the unique face references from DynamoDB for the user.
 * @returns - Array of face references from DynamoDB.
 */
async function getUserFaces() {
    console.log(`Getting user faces from DynamoDB`);
    const input = {
        "TableName": process.env.USER_FACES_TABLE_NAME,
        "Key": {
            "userID": { "S": `${userID}` }
        }
    }
    const command = new GetItemCommand(input);
    const response = await dbClient.send(command);
    console.log(`Response ${JSON.stringify(response.Item, null, 2)}`);
    const userFacesAttr = response.Item?.faces;
    const userFaces = userFacesAttr?.L?.map((face) => face.S) ?? [];
    return userFaces;
}



/**
 * Calls the Rekognition CompareFaces API to compare the source image with the target image.
 * @param sourceBuffer - Buffer of the face image to be compared.
 * @param targetKey - The S3 key of the target image to compare against.
 * @returns - Array of face matches found in the target image.
 */
async function compareFaces(sourceBuffer: Buffer, targetKey: string | undefined) {
    console.log(`Comparing faces`);
    console.log(`Target Key: ${targetKey}`);
    const params = {
        SimilarityThreshold: 90,
        SourceImage: { Bytes: sourceBuffer },
        TargetImage: {
            S3Object: { Bucket: `${bucketName}`, Name: targetKey }
        }
    }
    const command = new CompareFacesCommand(params);
    const response = await rekogClient.send(command);
    return response.FaceMatches || [];
}



/**
 * Adds the image location to the face locations in DynamoDB.
 * If the face ID does not exist, it creates a new entry in the table.
 * @param faceID - The ID of the face to which the image location will be added.
 */
async function addImageToFaceLocations(faceID: string | undefined) {
    console.log(`Adding image location to FaceLocations`);
    const updateParams = {
        ExpressionAttributeNames: {
            "#imageLocations": "imageLocations"
        },
        ExpressionAttributeValues: {
            ":empty_list": { L: [] },
            ":newImage": {L: [{ S: `${objectKey}` }] }
        },
        Key: {
            userID: { S: `${userID}` },
            faceID: { S: `${faceID}` }
        },
        UpdateExpression: "SET #imageLocations = list_append(if_not_exists(#imageLocations, :empty_list), :newImage)",
        TableName: process.env.FACE_LOCATIONS_TABLE_NAME,
    };

    try {
        await dbClient.send(new UpdateItemCommand(updateParams));
    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            const putParams = {
                TableName: process.env.FACE_LOCATIONS_TABLE_NAME,
                Item: {
                    userID: { S: `${userID}` },
                    faceID: { S: `${faceID}` },
                    imageLocations: { L: [{ S: `${objectKey}` }] }
                }
            };
            await dbClient.send(new PutItemCommand(putParams));
            console.log(`Created new item for ${userID} in FaceLocations`);
        } else {
            console.error(`Error updating FaceLocations for ${userID}: ${error}`);
            throw error;
        }
    }
    console.log(`Added user to DynamoDB`);
}



/**
 * Uploads the unqie face image to S3 and updates the DynamoDB table with the new face reference.
 * @param buffer - Buffer of the face image to be uploaded.
 */
async function uploadFaceToS3(buffer: Buffer) {
    console.log(`Uploading unique face to S3`);
    // generate a unique key for the face image and upload it to S3
    const uniqueKey = `user-media/${userID}/faces/${uuidv4()}.jpg`;
    const params = {
        Bucket: `${bucketName}`,
        Key: uniqueKey,
        Body: buffer
    };
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Uploaded new unique face to S3: ${uniqueKey}`);

    // update userFaces table in DynamoDB with the new face reference
    const updateParams = {
        ExpressionAttributeNames: {
            "#faces": "faces"
        },
        ExpressionAttributeValues: {
            ":empty_list": { L: [] },
            ":newFace": {L: [{ S: uniqueKey }] }
        },
        Key: {
            userID: { S: `${userID}` }
        },
        UpdateExpression: "SET #faces = list_append(if_not_exists(#faces, :empty_list), :newFace)",
        TableName: process.env.USER_FACES_TABLE_NAME,
    };

    try {
        await dbClient.send(new UpdateItemCommand(updateParams));
    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            const putParams = {
                TableName: process.env.USER_FACES_TABLE_NAME,
                Item: {
                    userID: { S: `${userID}` },
                    faces: { L: [{ S: uniqueKey }] }
                }
            };
            await dbClient.send(new PutItemCommand(putParams));
            console.log(`Created new item for ${userID} in UserFaces`);
        } else {
            console.error(`Error updating UserFaces for ${userID}: ${error}`);
            throw error;
        }
    }
    console.log(`Stored face reference in DynamoDB`);
    return uniqueKey;
}


async function analyzeFacesInVideo(faceList: FaceDetection[]) {
    console.log(`Analyzing faces in video`);

    const videoBody = await getS3Video();
    if (!(videoBody instanceof Readable)) {
        console.log("No video found in S3");
        return;
    }

    const storedUniqueFaces  = await getUserFaces();

    for (const face of faceList) {
        if (!face.Face) {
            console.log("No face found in video");
            continue;
        }
        face.Timestamp
        const imageBuffer = await extractFrameFromVideo(videoBody, face.Timestamp);
        const croppedFaceBuffer = await cropFace(face.Face, imageBuffer);

        let isUnique = true;

        for (const uniqueFace of storedUniqueFaces) {
            const match = await compareFaces(croppedFaceBuffer, uniqueFace);
            if (match.length > 0) {
                console.log("Faces already exists in the database");
                await addImageToFaceLocations(uniqueFace);
                isUnique = false;
                break;
            }
        }

        if (isUnique) {
            const locKey = await uploadFaceToS3(croppedFaceBuffer);
            await addImageToFaceLocations(locKey);
        }
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
            if (!videoFaceList?.length) {
                console.log("No faces detected above 70% confidence");
                return;
            }
            await analyzeFacesInVideo(videoFaceList);
        }
    }
};


