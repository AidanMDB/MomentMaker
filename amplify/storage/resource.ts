import { defineStorage } from '@aws-amplify/backend';
import { myUploadFunction } from '../functions/upload/resource';
import { imageAnalyzer } from '../functions/imageMedia/resource';
import { videoAnalyzer } from '../functions/videoMedia/resource';
import { zipFileExtractor } from '../functions/zipFiles/resource';

export const storage = defineStorage({
    name: 'MediaStorage',
    access: (allow) => ({
        'user-media/*': [
            allow.guest.to(['read', 'write', 'delete']),
            //allow.resource(myUploadFunction).to(['read', 'write']),
            //allow.resource(imageAnalyzer).to(['read', 'write', 'delete']),
            //allow.resource(videoAnalyzer).to(['read', 'write', 'delete']),
            //allow.resource(zipFileExtractor).to(['read', 'write', 'delete']),
        ],
    })
});