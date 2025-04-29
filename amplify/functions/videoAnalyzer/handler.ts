import { RekognitionClient, GetFaceDetectionCommand, CompareFacesCommand, FaceDetail, FaceDetection } from '@aws-sdk/client-rekognition';
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { SNSHandler, SNSEvent } from 'aws-lambda';
import { v4 as uuidv4 } from "uuid";
import ffmpeg from 'fluent-ffmpeg';
import sharp from "sharp";
import { Readable } from 'stream';
import fs from 'fs';
import { randomUUID } from "crypto";

const rekogClient = new RekognitionClient({region: 'us-east-1'});
const s3Client = new S3Client({region: 'us-east-1'});
const dbClient = new DynamoDBClient({region: 'us-east-1'});

ffmpeg.setFfmpegPath("/opt/ffmpeglib/ffmpeg"); // For Lambda Layer or bundled binary

let jobID: string | undefined;
let objectKey: string | undefined;
let bucketName: string | undefined;
let userID: string | null;

async function getUserIdMetadata(bucket: string, key: string) {
    console.log(`Getting userID metadata for ${key} in ${bucket}`);
    const params = {
        Bucket: bucket,
        Key: key,
    };
    const command = new HeadObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`Response ${response.Metadata}`);
    console.log(`Response ${JSON.stringify(response, null, 2)}`);
    return response.Metadata?.userid || null;
}


// async function getS3Video() {
//     console.log(`Getting image from S3 ${objectKey} in ${bucketName}`);
//     const params = {
//         Bucket: `${bucketName}`,
//         Key: `${objectKey}`
//     }
//     const command = new GetObjectCommand(params);
//     const response = await s3Client.send(command);
//     return response.Body;
// }

async function downloadVideoOnce(): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    const response = await s3Client.send(command);

    const videoPath = `/tmp/video-${randomUUID()}.mp4`;
    const writable = fs.createWriteStream(videoPath);

    await new Promise<void>((resolve, reject) => {
        (response.Body as Readable)
            .pipe(writable)
            .on('finish', resolve)
            .on('error', reject);
    });

    return videoPath;
}

/**
 * 
 * @param videoPath - The video body from S3.
 * @param timestamp - The timestamp to extract the frame from.
 * @returns - The extracted frame as a buffer.
 */
async function extractFrameFromVideo(videoPath: string, timestamp: number | undefined) {
    console.log(`Extracting frame from video at timestamp ${timestamp}`);
    const timestampSeconds = timestamp! / 1000;
    
    return new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];

        const ffmpegStream = ffmpeg(videoPath)
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
    try {
        const command = new CompareFacesCommand(params);
        const response = await rekogClient.send(command);
        return response.FaceMatches || [];
    } catch (error) {
        console.error(`Error comparing faces: ${error}`);
        throw error;
    }
}



/**
 * Adds the image location to the face locations in DynamoDB.
 * If the face ID does not exist, it creates a new entry in the table.
 * @param faceID - The ID of the face to which the image location will be added.
 */
async function addImageToFaceLocations(faceID: string | undefined, timestamp: number | undefined) {
    console.log(`Adding image location to FaceLocations`);
    const updateParams = {
        ExpressionAttributeNames: {
            "#imageLocations": "imageLocations"
        },
        ExpressionAttributeValues: {
            ":empty_list": { L: [] },
            ":newLocation": {L: [{ M: {
                videoKey: { S: `${objectKey}` },
                timestamp: { N: `${timestamp}` }
            } }] }
        },
        Key: {
            userID: { S: `${userID}` },
            faceID: { S: `${faceID}` }
        },
        UpdateExpression: "SET #imageLocations = list_append(if_not_exists(#imageLocations, :empty_list), :newLocation)",
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
                    imageLocations: {L: [{ M: {
                        videoKey: { S: `${objectKey}` },
                        timestamp: { N: `${timestamp}` }
                    } }] }
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

    const videoPath = await downloadVideoOnce();
    if (!videoPath) {
        console.log("No video found in S3");
        return;
    }

    for (const face of faceList) {
        if (!face.Face) {
            console.log("No face found in video");
            continue;
        }
        console.log(`Analyzing face at timestamp ${face.Timestamp}`);
        const imageBuffer = await extractFrameFromVideo(videoPath, face.Timestamp);
        const croppedFaceBuffer = await cropFace(face.Face, imageBuffer);

        let isUnique = true;
        const storedUniqueFaces  = await getUserFaces();

        for (const uniqueFace of storedUniqueFaces) {
            const match = await compareFaces(croppedFaceBuffer, uniqueFace);
            if (match.length > 0) {
                console.log("Faces already exists in the database");
                await addImageToFaceLocations(uniqueFace, face.Timestamp);
                isUnique = false;
                break;
            }
        }

        if (isUnique) {
            console.log("Unique face found, uploading to S3 and updating DynamoDB");
            const locKey = await uploadFaceToS3(croppedFaceBuffer);
            await addImageToFaceLocations(locKey, face.Timestamp);
        }
    }
}


async function getFacesFromVideo() {
    const params = { JobId: jobID };
    const command = new GetFaceDetectionCommand(params);
    const response = await rekogClient.send(command);
    console.log(`Raw GetFaceDetection response: ${JSON.stringify(response)}`);

    const faces = response.Faces || [];

    const goodFaces = faces.filter(faceData => {
        const face = faceData.Face;
        const quality = face?.Quality;
        if (!quality || !quality.Brightness || !quality.Sharpness) {
            return false;
        }
        return quality && quality.Brightness > 40 && quality.Sharpness > 30;
    });

    console.log(`Filtered ${goodFaces.length} good faces out of ${faces.length} total faces`);
    return goodFaces;
}

// async function findFaceTimestampsInVideo(videoPath: string, faceKey: string | undefined) {
//     console.log(`Finding timestamps for face: ${faceKey}`);

//     const videoFaces = await getFacesFromVideo();
//     if (!videoFaces?.length) {
//         console.log("No faces detected in the video");
//         return;
//     }

//     const matchingTimestamps: number[] = [];

//     for (const face of videoFaces) {
//         if (!face.Face || face.Timestamp === undefined) {
//             continue;
//         }

//         const frameBuffer = await extractFrameFromVideo(videoPath, face.Timestamp);
//         const croppedFaceBuffer = await cropFace(face.Face, frameBuffer);

//         const matches = await compareFaces(croppedFaceBuffer, faceKey);
//         if (matches.length > 0) {
//             console.log(`Match found at timestamp: ${face.Timestamp}`);
//             matchingTimestamps.push(face.Timestamp);
//         }
//     }

//     if (matchingTimestamps.length > 0) {
//         const updateParams = {
//             TableName: process.env.FACE_TIMESTAMPS_TABLE_NAME,
//             Key: {
//                 userID: { S: `${userID}` },
//                 faceID: { S: `${faceKey}` },
//                 videoID: { S: `${objectKey}` }
//             },
//             UpdateExpression: "SET timestamps = :timestamps",
//             ExpressionAttributeValues: {
//                 ":timestamps": { L: matchingTimestamps.map(ts => ({ N: ts.toString() })) }
//             }
//         };
//         await dbClient.send(new UpdateItemCommand(updateParams));
//         console.log(`Saved timestamps for face ${faceKey} in DynamoDB`);
//     } else {
//         console.log(`No matches found for face ${faceKey}`);
//     }
// }


export const handler: SNSHandler = async (event: SNSEvent) => {
    // loop throught all SNS events
    for (const record of event.Records) {
        const message = JSON.parse(record.Sns.Message);
        console.log(`Received message: ${JSON.stringify(message)}`);

        // Check if the message is a successful video analysis result
        if (message.Status === 'SUCCEEDED') {
            bucketName = message.Video.S3Bucket;
            objectKey = message.Video.S3ObjectName;
            if (!bucketName || !objectKey) {
                console.log("No bucket name or object key found in the message");
                return;
            }
            userID = await getUserIdMetadata(bucketName, objectKey);
            jobID = message.JobId;
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


