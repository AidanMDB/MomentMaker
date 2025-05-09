import { RekognitionClient, DetectFacesCommand, CompareFacesCommand, FaceDetail} from "@aws-sdk/client-rekognition";
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const rekogClient = new RekognitionClient({region: 'us-east-1'});
const s3Client = new S3Client({region: 'us-east-1'});
const dbClient = new DynamoDBClient({region: 'us-east-1'});

let bucketName: string;
let objectKey: string;
let userID: string | null; // replace with actual user ID


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




/**
 * This function analyzes an image in S3, detects faces and returns the detected faces.
 * It uses AWS Rekognition to detect faces in the image and filters out faces with confidence > 70%.
 */
async function detectFaces() {
    console.log(`Detecting faces ${objectKey} in ${bucketName}`);
    const params = {
        Image: {
            S3Object: {
                Bucket: `${bucketName}`,
                Name: `${objectKey}`
            }
        }
    }
    const command = new DetectFacesCommand(params);
    const response = await rekogClient.send(command);
    return response.FaceDetails?.filter(face => face.Confidence && face.Confidence > 70) || [];
}


/**
 * This function retrieves the image from S3 using the current bucket name and object key.
 * 
 * @returns {Promise<Buffer>} - Returns the image from S3 as a Buffer.
 */
async function getS3Image() {
    console.log(`Getting image from S3 ${objectKey} in ${bucketName}`);
    const params = {
        Bucket: `${bucketName}`,
        Key: `${objectKey}`
    }
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    return response.Body?.transformToByteArray();
}


/**
 * 
 * @param detectedFaces - Array of detected faces from Rekognition.
 * @returns buffers of cropped faces
 */
async function cropFaces(detectedFaces: FaceDetail[]) {
    console.log(`Cropping faces `);
    const imageBody = await getS3Image();
    const image = sharp(imageBody);
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
 * Detects faces in a given image
 */
async function analyzeImage() {
    const detectedFaces = await detectFaces();

    if (!detectedFaces.length) {
        console.log("No faces detected above 70% confidence");
        return;
    }

    const faceBuffers = await cropFaces(detectedFaces);
    const storedFaces = await getUserFaces();

    for (const faceBuffer of faceBuffers) {
        let isUnique = true;
        //let storedFace;
        for (const storedFace of storedFaces) {
            const match = await compareFaces(faceBuffer, storedFace);
            if (match.length) {
                console.log("Face already exists in the database");
                await addImageToFaceLocations(storedFace);
                isUnique = false;
                break;
            }
        }

        if (isUnique) {
            const locKey = await uploadFaceToS3(faceBuffer);
            await addImageToFaceLocations(locKey);
        }
    }
}


export const handler: Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    console.log(event);
    //const payload = JSON.parse(event);
    objectKey = event.key;
    bucketName = event.bucket;
    userID = await getUserIdMetadata(bucketName, objectKey);
    console.log(`Analyzing ${objectKey} in ${bucketName}`);
    await analyzeImage();
};