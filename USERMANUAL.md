# User Manual

This guide will help you navigate the web-based platform, from creating an account to generating personalized video moments.

---

## Home Page

- **Create an Account / Sign In** 
  - Click Sign In to be directed to create or sign in to your personal account.
  - User authentication is managed through **AWS Cognito**.
  
     ![image](https://github.com/user-attachments/assets/f43fb742-4a4b-48aa-83f4-d4c141acd964)

---

## Library Tab

![image](https://github.com/user-attachments/assets/0953e470-b9cd-4866-bd9b-239c1a16114e)
- ![image](https://github.com/user-attachments/assets/7b66c410-25cf-4914-b2f8-81df8649bb19) **Delete Media**
  - Select desried media then the trash can icon to delete media.
  - All deleted media is removed from associated **AWS S3 bucket**.
- ![image](https://github.com/user-attachments/assets/21943c23-4dd2-4354-97bb-6f0d8003a956) **Download Media**
  - Select desried media then download icon to download media to person device.
  - Downloaded as it's respective file extension.
- ![image](https://github.com/user-attachments/assets/9e865cad-3e59-4b85-8328-cd80fa33cd2c) **Upload Media**
  - Select upload icon to upload media.
  - Supported file types: `.jpg`, `.jpeg`, `.png`, `.mp3`, `.mp4`, `.mpeg`
  - All uploaded media is securely stored in an **AWS S3 bucket**.

  
- **View Library**
  - Select respective title to view uploaded photos, videos, songs, and moments.
  ![image](https://github.com/user-attachments/assets/e2594399-3347-41e6-875f-6624eaf9720f)


---

## Create A Moment Tab

![image](https://github.com/user-attachments/assets/c161abeb-40b8-486d-b098-c9244d38275d)
- **Select a Person**
  - Click a person's image to select a person (purple ring indicates selection).
  - The selected person will be the focus of your moment.
  - **AWS Rekognition** is used to identify and extract people from your media.
  - Faces are saved to an **S3 bucket**.
  - Select the refresh icon to check for any new faces added.

     ![image](https://github.com/user-attachments/assets/fbf2c083-6627-481a-9456-552c20d9d9c2)


- **Add Background Music**
  - Click the drop down and select a song.
  - Select a song from your uploaded media to be used in the background.

    ![image](https://github.com/user-attachments/assets/cc223c12-0225-40f1-9651-2b30a55d2e8c)


- **Set Time Constraint**
  - Slide the slider to a desired numeric.
  - Choose how long you want your final highlight reel to be.
  - Max time constraint is 5 minutes

    ![image](https://github.com/user-attachments/assets/610bcd9c-fb83-4b84-bb98-08efe64acfaa)



- **Submit**
  - Once all preferences are selected, submit your video personalization request.
  - ffmpeg media processing functions processes and creates the final video moment.

    ![image](https://github.com/user-attachments/assets/b6ca88b7-3afe-4ac7-8386-e5895e9c34e0)


---

## Preview Moment Pop-up

- **Preview**
  - Watch your generated moment before finalizing.
    
    ![image](https://github.com/user-attachments/assets/5a1bd93b-0968-4cec-9475-a6af6321c4b4)


- **Redo**
  - Regenerate a new version of the moment with the same preferences.

    ![image](https://github.com/user-attachments/assets/07fa4994-ca6f-464e-b468-bc9ec8d44fb5)


- **Save**
  - Save the completed moment to your personal library.
  - Stored securely in your **S3 bucket**.

    ![image](https://github.com/user-attachments/assets/7ef87a14-b68d-40fc-8d9c-d1c24cc4196e)

## Top Bar

- ![image](https://github.com/user-attachments/assets/75795cdc-d79f-4205-bd28-e6d7aaad7fa6) **Log Out**
  - Click Log Out to be directed back to the home page and logged out of your account.
    

- ![image](https://github.com/user-attachments/assets/6db7e9bc-c913-4a43-b495-7da2d44c34f2) **Profile**
  - Click profile icon to view email and user id associated with your account.

---

