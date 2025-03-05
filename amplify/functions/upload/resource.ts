import { defineFunction } from "@aws-amplify/backend";

export const myUploadFunction = defineFunction({
    name: 'mediaUpload',         
    timeoutSeconds: 30,         
    memoryMB: 1024,
});