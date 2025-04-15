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
- ![image](https://github.com/user-attachments/assets/90376f12-7a54-4615-85fe-ed0a9e4535c5) **Upload Media**
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

    ![image](https://github.com/user-attachments/assets/0154209f-ff56-4616-b9cf-56f8c698d7ba)

- **Add Background Music**
  - Click the drop down and select a song.
  - Select a song from your uploaded media to be used in the background.

    ![image](https://github.com/user-attachments/assets/cc223c12-0225-40f1-9651-2b30a55d2e8c)


- **Set Time Constraint**
  - Click the each drop down and select desired numeric.
  - Choose how long you want your final highlight reel to be.
  - Max time constraint is 5 minutes

    ![image](https://github.com/user-attachments/assets/ac6577ab-a645-4fe4-bf5e-920013207a13)


- **Submit**
  - Once all preferences are selected, submit your video personalization request.
  - ffmpeg media processing functions processes and creates the final video moment.

    ![image](https://github.com/user-attachments/assets/b6ca88b7-3afe-4ac7-8386-e5895e9c34e0)


---

## Preview Moment Pop-up

- **Preview**
  - Watch your generated moment before finalizing.
    
    ![image](https://github.com/user-attachments/assets/5a1bd93b-0968-4cec-9475-a6af6321c4b4)


- **Download**
  - ![image](https://github.com/user-attachments/assets/d9444641-4b70-45d7-987b-828a23d00591) Select the three dots and select download to download the moment.
  - Download the final highlight reel as an `.mp4` file.
  - Same steps can be followed in your library to download your moments in the future.

    ![image](https://github.com/user-attachments/assets/bd766b72-460d-4287-b599-92800f1bd033)


- **Redo**
  - Regenerate a new version of the moment with the same preferences.

    ![image](https://github.com/user-attachments/assets/07fa4994-ca6f-464e-b468-bc9ec8d44fb5)


- **Save**
  - Save the completed moment to your personal library.
  - Stored securely in your **S3 bucket**.

    ![image](https://github.com/user-attachments/assets/7ef87a14-b68d-40fc-8d9c-d1c24cc4196e)


---

