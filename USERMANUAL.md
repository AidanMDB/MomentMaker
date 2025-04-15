# User Manual

This guide will help you navigate the web-based platform, from creating an account to generating personalized video moments.

---

## Home Page

- **Create an Account / Login**
  - Sign up or log in to your personal account.
  - User authentication is managed through **AWS Cognito**.

---

## Library Tab

- **Upload Media**
  - Supported file types: `.jpg`, `.jpeg`, `.png`, `.mp3`, `.mp4`, `.mpeg`
  - All uploaded media is securely stored in an **AWS S3 bucket**.
  
- **View Library**
  - Browse all uploaded photos, videos, songs, and moments.

---

## Create A Moment Tab

- **Select a Person**
  - Choose a person to be the focus of your highlight reel.
  - **AWS Rekognition** is used to identify and extract people from your media.
  - Faces are saved to an **S3 bucket**.

- **Add Background Music**
  - Select a song from your uploaded media to be used in the background.

- **Set Time Constraint**
  - Choose how long you want your final highlight reel to be.
  - Max time constraint is 5 minutes

- **Submit**
  - Once all preferences are selected, submit your video personalization request.
  - ffmpeg media processing functions processes and creates the final video moment.

---

## Preview Moment Pop-up

- **Preview**
  - Watch your generated moment before finalizing.

- **Download**
  - Download the final highlight reel as an `.mp4` file.

- **Redo**
  - Regenerate a new version of the moment with the same preferences.

- **Save**
  - Save the completed moment to your personal library.
  - Stored securely in your **S3 bucket**.

---

