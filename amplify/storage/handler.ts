import { RekognitionClient, DetectFacesCommand, CompareFacesCommand} from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "aws-cdk-lib/aws-ses-actions";
//import { Predictions } from "@aws-amplify/predictions";
import { S3Handler } from "aws-lambda";
import sharp from "sharp";

const rekogClient = new RekognitionClient();
const s3Client = new S3Client();



async function compareFaces(croppedImage: Buffer, targetImage: Buffer) {
    const input = {
        SourceImage: {
            Bytes: croppedImage
        },
        TargetImage: {
            Bytes: targetImage
        }
    }

    const command = new CompareFacesCommand(input);
    let response;
    try {
        response = await rekogClient.send(command);
        console.log(response.$metadata);
    } catch (error) {
        console.error(error);
        return error;
    }

    if (!response.FaceMatches) {
        console.log("No faces detected");
        return;
    }

    for (const match of response.FaceMatches) {
        console.log(`Similarity: ${match.Similarity}`);
    }

}




/**
 * Crops image to detected to be stored for comparison purposes
 * @param Left 
 * @param Top 
 * @param Width 
 * @param Height 
 * @returns 
 */
async function cropImageToFace(Left: number, Top: number, Width: number, Height: number, FaceNum: number) {
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


    const croppedImage = await sharp(imageBuffer)
        .extract(cropParams)
        .toBuffer();

/*     const newKey = 'faces/new_face'
    await s3Client.send(new PutObjectCommand({
        Bucket: "",
        Key: newKey,
        Body: croppedImage,
        ContentType: "image/jpeg"
    })); */
}




/**
 * Detects faces in a given image
 */
async function analyzeImage(s3Path: string) {
    const input = {
        Image: {
            S3Object: {
                Bucket: "momentmaker",
                Name: s3Path
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


    let faceCounter = 0;
    for (const face of response.FaceDetails) {

        if (face.BoundingBox && face.Quality && face.Quality.Sharpness !== undefined && face.Quality.Sharpness > 70) {
            const {Height, Left, Top, Width} = face.BoundingBox;

            if (Height !== undefined && Left !== undefined && Top !== undefined && Width !== undefined) {
                faceCounter++;
                cropImageToFace(Left, Top, Width, Height, faceCounter);
            }
        }
    }
}






export const handler: S3Handler = async (event) => {
    console.log("called function");
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const bucketName = event.Records[0].s3.bucket.name;

    let allEntities = [];

    for (const objectKey of objectKeys) {
        const heafObjectCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: objectKey
        });
        console.log(`Analyzing image: ${objectKey}`);

        const metadataResponse = await s3Client.send(heafObjectCommand);
        const metadata = metadataResponse.Metadata;
        if (!metadata || !metadata.fileType || !metadata.userId) {
            continue;
        }
        analyzeImage(objectKey);

    }
};