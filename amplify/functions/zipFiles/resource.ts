import { defineFunction } from "@aws-amplify/backend";

export const zipFileExtractor = defineFunction({
    name: 'ZipFiles',         
    timeoutSeconds: 30,    
    runtime: 20,     
    //memoryMB: 1024,
    //layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"}
});