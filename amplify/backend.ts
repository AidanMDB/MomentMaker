import { myVidMakerFunction } from './functions/vid-maker/resource';
import { myUploadFunction } from './functions/upload/resource';
import { defineBackend } from '@aws-amplify/backend';
import { storage } from './storage/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
//import { Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


const backend = defineBackend({
  auth,
  data,
  storage,
  myUploadFunction,
  myVidMakerFunction
});

const mediaUpload = backend.myUploadFunction.resources.lambda;

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(mediaUpload),
  {
    prefix: 'user-media',
  }
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