import { defineFunction } from "@aws-amplify/backend";

export const myUploadFunction = defineFunction({
    name: 'upload',         
    timeoutSeconds: 30,         
    memoryMB: 1024              
});