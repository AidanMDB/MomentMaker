import { myVidMakerFunction } from './functions/vid-maker/resource';
import { myUploadFunction } from './functions/upload/resource';
import { imageAnalyzer } from './functions/imageMedia/resource';
import { videoAnalyzer } from './functions/videoMedia/resource';
import { zipFileExtractor } from './functions/zipFiles/resource';
import { defineBackend } from '@aws-amplify/backend';
import { storage } from './storage/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
//import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


const backend = defineBackend({
  auth,
  data,
  storage,
  myUploadFunction,
  myVidMakerFunction,
  imageAnalyzer,
  videoAnalyzer,
  zipFileExtractor,
});

const mediaUpload = backend.myUploadFunction.resources.lambda;
const imageAnalyzerFunction = backend.imageAnalyzer.resources.lambda;
const videoAnalyzerFunction = backend.videoAnalyzer.resources.lambda;
const zipFileExtractorFunction = backend.zipFileExtractor.resources.lambda;
const userFacesDatabase = backend.data.resources.tables.UserFaces;
const faceLocationsDatabase = backend.data.resources.tables.FaceLocations;
const storageS3 = backend.storage.resources.bucket

// Adds notifications to the S3 bucket so mediaUpload function can be triggered when a file is uploaded to the bucket
backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(mediaUpload),
  {
    prefix: 'user-media/image/',
  }
)


// Add the table names as enviroment variables to the imageAnalyzer function
backend.imageAnalyzer.addEnvironment('USER_FACES_TABLE_NAME', userFacesDatabase.tableName);
backend.imageAnalyzer.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);

// Add the table names as enviroment variables to the videoAnalyzer function
backend.myVidMakerFunction.addEnvironment('USER_FACES_TABLE_NAME', userFacesDatabase.tableName);
backend.myVidMakerFunction.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);

// Add the table names as enviroment variables to the mediaUpload function
backend.myUploadFunction.addEnvironment('IMAGE_ANALYZER_FUNCTION_NAME', imageAnalyzerFunction.functionName);
backend.myUploadFunction.addEnvironment('VIDEO_ANALYZER_FUNCTION_NAME', videoAnalyzerFunction.functionName);
backend.myUploadFunction.addEnvironment('ZIP_FILE_EXTRACTOR_FUNCTION_NAME', zipFileExtractorFunction.functionName);


// Gives mediaUpload the ability to invoke the imageAnalyzer, videoAnalyzer and zipFileExtractor functions
mediaUpload.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [imageAnalyzerFunction.functionArn, videoAnalyzerFunction.functionArn, zipFileExtractorFunction.functionArn],
  })
);

//storageS3.addToResourcePolicy(
//  new PolicyStatement({
//    actions: ['s3:GetObject'],
//    resources: []
//  })
//)


// Give imageAnalyzer permission to use AWS rekognition AI
imageAnalyzerFunction.addToRolePolicy(
  new PolicyStatement({
    actions: 
    [
      'rekognition:DetectFaces', 
      'rekognition:CompareFaces', 
      'dynamoDB:PutItem', 
      'dynamoDB:UpdateItem', 
      'dynamoDB:GetItem',
      'S3:PutObject',
      'S3:GetObject'
    ],
    resources: ["*"],
  })
)

// Give videoAnalyzer permission to use AWS rekognition AI
videoAnalyzerFunction.addToRolePolicy(
  new PolicyStatement({
    actions: 
    [
      'rekognition:StartFaceDetection', 
      'rekognition:GetFaceDetection',
      'dynamoDB:PutItem', 
      'dynamoDB:UpdateItem', 
      'dynamoDB:GetItem',
      'S3:PutObject',
      'S3:GetObject'
    ],
    resources: ["*"],
  })
)

