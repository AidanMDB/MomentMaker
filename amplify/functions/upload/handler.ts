import { RekognitionClient, DetectFacesCommand, CompareFacesCommand} from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObject } from "@aws-sdk/client-s3";
import { S3 } from "aws-cdk-lib/aws-ses-actions";
//import { Predictions } from "@aws-amplify/predictions";
import { S3Handler } from "aws-lambda";
import sharp from "sharp";

const rekogClient = new RekognitionClient();
const s3Client = new S3Client();


async function cropImageToFace(Left: number, Top: number, Width: number, Height: number) {
    const object = await s3Client.send(new GetObjectCommand({ 
        Bucket: "", 
        Key: "" 
    }));

    const imageBuffer = await object.Body?.transformToByteArray();
    const image = await sharp(imageBuffer).metadata();
    const imageWidth = image.width;
    const imageHeight = image.height

    if (!imageWidth || !imageHeight) {
        console.log("Could not get image dimensions");
        return;
    }

    const cropParams = {
        left: Math.round(Left * imageWidth),
        top: Math.round(Top * imageHeight),
        width: Math.round(Width * imageWidth),
        height: Math.round(Height * imageHeight),
    }

}




/**
 * Detects faces in a given image
 */
async function analyzeImage() {
    const input = {
        Image: {
            S3Object: {
                Bucket: "momentmaker",
                Name: "image.jpg"
            }
        }
    }
    const command = new DetectFacesCommand(input);
    let response;
    try {
        response = await rekogClient.send(command);
        console.log(response.$metadata);
    } catch (error) {
        console.error(error);
        return error;
    }

    if (!response.FaceDetails) {
        console.log("No faces detected");
        return;
    }

    for (const face of response.FaceDetails) {
        if (face.BoundingBox) {
            const {Height, Left, Top, Width} = face.BoundingBox;

        }
    }
}






export const handler: S3Handler = async (event) => {

    const input = {
        CollectionId:"MomentMaker",     // make this an environment variable
        UserId: "user1",                // replace with user id from auth or storage metadata
    }
    const command = new CreateUserCommand(input);
    const response = await rekogClient.send(command);

    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const bucketName = event.Records[0].s3.bucket.name;

    let allEntities = [];

    for (const objectKey of objectKeys) {
        const heafObjectCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: objectKey
        });
        const metadataResponse = await s3Client.send(heafObjectCommand);
        const metadata = metadataResponse.Metadata;
        if (!metadata || !metadata.fileType || !metadata.userId) {
            continue;
        }
        if (!userExistsInCollection(metadata.userId)) {
            addUserToCollection(metadata.userId);
        }

        addFacetoCollection(objectKey, bucketName);
        associateFacetoUser();
    }




};