from moviepy.editor import VideoFileClip, ImageClip, concatenate_videoclips
import sys
import random
import os

"""
    Merges a list of images and videos into a single video file.

    Parameters:
    - media_files (list): A list of file paths (videos and images) to be merged.
    - output_path (str): The file path where the final video will be saved.
    - image_duration (int, optional): The duration (in seconds) for each image in the final video. Default is 3 seconds.

    Process:
    1. Loops through each file in `media_files`.
    2. If the file is a video (mp4, avi, mov, mkv), it is loaded using `VideoFileClip()`.
    3. If the file is an image (jpg, png, gif), it is converted into a video clip of duration `image_duration` using `ImageClip()`.
    4. Unsupported file types are skipped with a warning message.
    5. All clips are combined into a single video using `concatenate_videoclips()`.
    6. The final video is exported to `output_path` in MP4 format with `libx264` codec at 24 FPS.

    Example usage:
    media_files = ["video1.mp4", "image1.jpg", "video2.mp4", "image2.png"]
    merge_media(media_files, "final_output.mp4")
"""
def merge_media(media_files, output_path, image_duration=3):
    clips = []

    for file in media_files:
        if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):  # Video file
            clip = VideoFileClip(file)
        elif file.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):  # Image file
            clip = ImageClip(file, duration=image_duration).set_fps(24)
        else:
            print(f"Skipping unsupported file: {file}")
            continue
        
        clips.append(clip)

    #randomize order of the clips
    random.shuffle(clips)

    # Concatenate all clips
    final_video = concatenate_videoclips(clips, method="compose")

    if final_video.duration > 300: #change this to prioritize videos over images instead of just cutting off after 5 minutes
        final_video = final_video.subclip(0, 300)

    # Export the final video
    final_video.write_videofile(output_path, codec="libx264", fps=24)

    return output_path

"""
    Extracts a specific segment from a video file and saves it as a new video.

    Parameters:
    - input_path (str): The file path of the original video.
    - output_path (str): The file path where the trimmed video will be saved.
    - start_time (float or int): The start time (in seconds) of the desired segment.
    - end_time (float or int): The end time (in seconds) of the desired segment.

    Process:
    1. Loads the video file from `input_path` using `VideoFileClip()`.
    2. Extracts a subclip from `start_time` to `end_time` using `.subclip()`.
    3. Saves the trimmed video to `output_path` using `.write_videofile()` with the `libx264` codec.

    Example usage:
    parse_video("input.mp4", "output.mp4", 10, 30)  # Extracts a clip from 10s to 30s

    Returns:
    - str: The file path of the saved output video.
"""
def parse_video(input_path, output_path, start_time, end_time):
    clip = VideoFileClip(input_path)
    clip = clip.subclip(start_time, end_time)  # Trim the video
    clip.write_videofile(output_path, codec="libx264")
    return output_path

def handle_files(file_list):
    for index in range(len(file_list)):
        file = file_list[index]
        if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
            print(f"Processing video: {file}")
            parse_video(file, f"trimmed_{file}", 10, 30) # change this to be the times that are passed in from the recignition software
            file_list[index] = f"trimmed_{file}"

    return file_list

if __name__ == "__main__":
    # sys.argv will contain the script name as the first element, so we slice [1:]
    files = sys.argv[1:]
    final_vid = 'final_output.mp4'
    files = handle_files(files)
    final_vid = merge_media(files, final_vid)
    print(final_vid)

