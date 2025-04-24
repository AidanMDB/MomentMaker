import { myVidMakerFunction } from './functions/vid-maker/resource';
import { myUploadFunction } from './functions/upload/resource';
import { imageAnalyzer } from './functions/imageMedia/resource';
import { videoStarter } from './functions/videoStarter/resource';
import { zipFileExtractor } from './functions/zipFiles/resource';
import { videoAnalyzer } from './functions/videoAnalyzer/resource';
import { defineBackend } from '@aws-amplify/backend';
import { storage } from './storage/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { PolicyStatement, ServicePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
//import * as rekognition from 'aws-cdk-lib/aws-rekognition';
//import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


const backend = defineBackend({
  auth,
  data,
  storage,
  myUploadFunction,
  myVidMakerFunction,
  imageAnalyzer,
  videoStarter,
  zipFileExtractor,
  videoAnalyzer,
});

const mediaUpload = backend.myUploadFunction.resources.lambda;
const imageAnalyzerFunction = backend.imageAnalyzer.resources.lambda;
const videoStarterFunction = backend.videoStarter.resources.lambda;
const zipFileExtractorFunction = backend.zipFileExtractor.resources.lambda;
const userFacesDatabase = backend.data.resources.tables.UserFaces;
const faceLocationsDatabase = backend.data.resources.tables.FaceLocations;
const videoAnalyzerFunction = backend.videoAnalyzer.resources.lambda;
const storageS3 = backend.storage.resources.bucket;



// create SNS resource async video analysis
const videoAnalysisStack = backend.createStack('AIVideoAnalysis');
const videoSNS = new sns.Topic(videoAnalysisStack, 'RekognitionReturns');

// give rekognition permission to publish to the SNS topic
const rekognitionPublishRole = new Role(videoAnalysisStack, 'RekognitionPublishRole', {
  assumedBy: new ServicePrincipal('rekognition.amazonaws.com')
});

rekognitionPublishRole.addToPolicy(
  new PolicyStatement({
    actions: ['sns:Publish'],
    resources: [videoSNS.topicArn],
  })
);

videoSNS.addToResourcePolicy(
  new PolicyStatement({
    actions: ['sns:Publish'],
    resources: ['*'],
    principals: [new ServicePrincipal('rekognition.amazonaws.com')],
  })
);


// add the NAMES to videoAnalyzer function
//backend.videoAnalyzer.addEnvironment('S3_BUCKET_NAME', storageS3.bucketName);
backend.videoAnalyzer.addEnvironment('USER_FACES_TABLE_NAME', userFacesDatabase.tableName);
backend.videoAnalyzer.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);

// Add the table names as enviroment variables to the imageAnalyzer function
backend.imageAnalyzer.addEnvironment('USER_FACES_TABLE_NAME', userFacesDatabase.tableName);
backend.imageAnalyzer.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);

backend.myVidMakerFunction.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);  

// add the SNS topic ARN as an environment variable to the videoAnalyzer function
backend.videoStarter.addEnvironment('SNS_TOPIC_ARN', videoSNS.topicArn);
backend.videoStarter.addEnvironment('REKOGNITION_ROLE_ARN', rekognitionPublishRole.roleArn);

// Add the table names as enviroment variables to the mediaUpload function
backend.myUploadFunction.addEnvironment('VIDEO_ANALYZER_FUNCTION_NAME', videoStarterFunction.functionName);
backend.myUploadFunction.addEnvironment('IMAGE_ANALYZER_FUNCTION_NAME', imageAnalyzerFunction.functionName);
backend.myUploadFunction.addEnvironment('ZIP_FILE_EXTRACTOR_FUNCTION_NAME', zipFileExtractorFunction.functionName);

// Add the bucket name as an environment variable to the videoAnalyzer function
//backend.videoAnalyzer.addEnvironment('S3_BUCKET_NAME', storageS3.bucketName);
backend.videoAnalyzer.addEnvironment('USER_FACES_TABLE_NAME', userFacesDatabase.tableName);
backend.videoAnalyzer.addEnvironment('FACE_LOCATIONS_TABLE_NAME', faceLocationsDatabase.tableName);

// Gives mediaUpload the ability to invoke the imageAnalyzer, videoAnalyzer and zipFileExtractor functions
mediaUpload.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [
      videoStarterFunction.functionArn, 
      imageAnalyzerFunction.functionArn, 
      zipFileExtractorFunction.functionArn
    ]
  })
);

//storageS3.addToResourcePolicy();


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
      'S3:GetObject',
      'S3:HeadObject'
    ],
    resources: ['*'],
  })
)
// allow image analyzer to be invoked
imageAnalyzerFunction.addPermission('AllowInvokeFromMediaUpload',
  {
    principal: new ServicePrincipal('lambda.amazonaws.com'),
    sourceArn: mediaUpload.functionArn,
  }
)


videoAnalyzerFunction.addToRolePolicy(
  new PolicyStatement({
    actions: 
    [
      'rekognition:GetFaceDetection',
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
videoStarterFunction.addToRolePolicy(
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


// Adds notifications to the S3 bucket so mediaUpload function can be triggered when a file is uploaded to the bucket
storageS3.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(mediaUpload),
  {
    prefix: 'user-media/',
  }
)
