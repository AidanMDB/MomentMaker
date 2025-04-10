import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'MediaStorage',
    access: (allow) => ({
        'user-media/*': [
            allow.guest.to(['read', 'write', 'delete']),
        ],
    }),
});