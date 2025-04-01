import { defineFunction } from "@aws-amplify/backend";
import { data } from "../../data/resource";

export const imageAnalyzer = defineFunction({
    name: 'ImageMediaUpload',         
    timeoutSeconds: 120,         
    memoryMB: 1024,
    runtime: 20,
    layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"},
    //environment: {
     //   USER_FACES_TABLE_NAME: ,
      //  FACE_LOCATIONS_TABLE_NAME: data.resources.tables.FaceLocations,
    //}
});