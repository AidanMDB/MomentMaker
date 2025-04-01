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

// Adds notifications to the S3 bucket so mediaUpload function can be triggered when a file is uploaded to the bucket
backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(mediaUpload),
  {
    prefix: 'user-media/image/',
  }
)

// Gives mediaUpload the ability to invoke the imageAnalyzer, videoAnalyzer and zipFileExtractor functions
imageAnalyzerFunction.grantInvoke(mediaUpload);
videoAnalyzerFunction.grantInvoke(mediaUpload);
zipFileExtractorFunction.grantInvoke(mediaUpload);

// Give imageAnalyzer permission to use AWS rekognition AI
imageAnalyzerFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['rekognition:DetectFaces', 'rekognition:CompareFaces'],
    resources: ["*"],
  })
)

// Give videoAnalyzer permission to use AWS rekognition AI
videoAnalyzerFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['rekognition:StartFaceDetection', 'rekognition:GetFaceDetection'],
    resources: ["*"],
  })
)


backend.addOutput({
  custom:{
    Predictions: {
      Identify: {
        IdentifyEntities: {
          collectionId: "default",
          maxEntities: 10,
        },
        celebrityDetectionEnabled: false,
        proxy: false,
        region: backend.auth.stack.region
      }
    }
  }
})