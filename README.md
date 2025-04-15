

# MomentMaker
This web-based video creation tool automatically generates highlight reels from user-uploaded photos, videos, and songs by identifying and extracting scenes featuring selected individuals.

## Usage
To access the website go to URL:  [https://main.d1mzyzgpuskuft.amplifyapp.com/all](https://main.d1mzyzgpuskuft.amplifyapp.com/all)

## Features

- **Upload/Delete Media** - upload/delete photos, videos, and songs to be stored/removed in your own person library
- **Person Identification** - identify the focus person of the final created moment
- **Video Personalization** - customize your moment by selecting a song and time constraint to be included
- **User Accounts** - manage your own account to securely view only your media and moments
- **Download Media** - download your moment onto your own personal device

## Work Flow
User manual can found in file labeled USERMANUAL.md

**Home Page**
- Creates an account and login to their own account
  + uses cognito to manage authorized users

**Library Tab**
- Uploads photos, videos, or songs to be stored in their library
  + can upload file extensions jpg, jpeg, png, mp3, mp4, and mpeg
  + stores media into S3 bucket
- View uploaded media and moments

**Create A Moment Tab**
- Select a person to be the focus
  + uses AWS rekognition to parse and extract the person in uploaded media
  + saves faces to S3 bucket
- Select a song to be played in the background
- Select a time constraint to determine the length
- Submit video personalization
  + based on customizations, the moment is created using ffmpeg media processing functions

**Preview Moment PopUp**
- View and download the created moment
  + downloads an mp4 of the moment
- Select redo to regenerate another moment
- Select save to store the moment in your library
  + stores moment into S3 bucket

## Resources

- **Front End**: React
- **Storage**: AWS Simple Storage Service (S3)
- **Database**: AWS DynamoDB
- **Authentication**: AWS Cognito
- **API**: AWS API Gateway
- **AI Face Detection**: AWS Rekognition
- **Compute**: AWS Lambda Funciton's
- **
- EVERYONE ADD WHAT YOU USED

## Developers

- Aidan Dannhausen-Brun
- Riley Thomas
- Nilayah Peter

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
