import { myVidMakerFunction } from './functions/vid-maker/resource';
import { myUploadFunction } from './functions/upload/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { defineBackend } from '@aws-amplify/backend';
import { storage } from './storage/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';


const backend = defineBackend({
  auth,
  data,
  storage,
  myUploadFunction,
  myVidMakerFunction,
});

backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      "rekognition:DetectFaces",
      "rekognition:SearchFacesByImage"
    ],
    resources: ['*']
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