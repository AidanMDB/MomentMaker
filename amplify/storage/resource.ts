import { defineStorage } from '@aws-amplify/backend';
import { myUploadFunction } from '../functions/upload/resource';

export const storage = defineStorage({
    name: 'MediaStorage',
    access: (allow) => ({
        'user-media/*': [
            allow.guest.to(['read', 'write', 'delete']),
            allow.resource(myUploadFunction).to(['read', 'write', 'delete']),
        ],
    })
});