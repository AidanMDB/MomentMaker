import '@aws-amplify/ui-react/styles.css';
import React from 'react';
import { uploadData } from 'aws-amplify/storage';

export default function TestUpload() {
    const [file, setFile] = React.useState<File | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFile(event.target.files?.[0] || null);
    };

    const handleClick = () => {
        if (!file) {
            return;
        }
        uploadData({
            path: 'user-media/${file.name}',
            data: file,
            options: {
                bucket: {
                    bucketName: 'amplify-d1mzyzgpuskuft-ma-mediastoragebucket2b6d90-qdrepwmd6l9v ',
                    region: 'us-east-1'
                }
            }
        });
    };

    return (
        <main>
            <div>
                <input type="file" onChange={handleChange} />
                <button onClick={handleClick}>Upload</button>
            </div>
        </main>
    );
}