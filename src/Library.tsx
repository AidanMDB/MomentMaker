import { useState, useRef, useEffect } from "react";
import { uploadData, list, getUrl } from 'aws-amplify/storage';
import "./AllStyles.css"
import "./Library.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import demo_video from "/RPReplay_Final1741140628.mp4";

export default function Library() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("Photos");
    const [photos, setPhotos] = useState<URL[]>([]);
    const [videos, setVideos] = useState<URL[]>([]);
    const [songs, setSongs] = useState<URL[]>([]);

    const moments = [ demo_video ];
    
    const handleMediaTabClick = (option: string) => {
        setActiveTab(option);
    }
    
    //Upon Loading
    useEffect(() => {
        fetchMedia();
    }, []);

    //Upload
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4", "audio/mp3", "audio/mpeg"];

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            if (!allowedTypes.includes(file.type)) {
                alert("Invalid file type. Please select a JPEG, PNG, MP4, or MP3 file.");
                return;
            }

            const type = (file.type).split('/')[0];

            try {
                await uploadData({
                    path: `user-media/${type}/${file.name}`,
                    data: file,
                    options: {
                        bucket: 'MediaStorage',
                        metadata: {
                            fileType: `${file.type}`,
                            userID: `user1`
                        }
                    }
                });

                alert("Upload successful!");
            } catch (error) {
                alert("Upload failed!");
            }
            
            fetchMedia();
        }
    };

    const fetchMedia = async () => {
        try {
            const { items: photoResults } = await list({ path: "user-media/image/" });
            const { items: videoResults } = await list({ path: "user-media/video/" });
            const { items: songResults } = await list({ path: "user-media/audio/" });

            const photoUrls = await Promise.all(
                photoResults.map(async (file) => {
                    const urlOutput = await getUrl({ path: file.path });
                    return urlOutput.url;
                })
            );
            const videoUrls = await Promise.all(
                videoResults.map(async (file) => {
                    const urlOutput = await getUrl({ path: file.path });
                    return urlOutput.url;
                })
            );
            const songUrls = await Promise.all(
                songResults.map(async (file) => {
                    const urlOutput = await getUrl({ path: file.path });
                    return urlOutput.url;
                })
            );

            setPhotos(photoUrls);
            setVideos(videoUrls);
            setSongs(songUrls);
        } catch (error) {
            console.error("Error fetching media:", error);
        }
      };

    //HTML
    return (
        <div className="media_container">
            <div className="topbar_media">
                <span className={`media_clickable_word ${activeTab === 'Photos' ? 'active' : ''}`} onClick={() => handleMediaTabClick('Photos')}> Photos </span>
                <span className="media_bar"> | </span>
                <span className={`media_clickable_word ${activeTab === 'Videos' ? 'active' : ''}`} onClick={() => handleMediaTabClick('Videos')}> Videos </span>
                <span className="media_bar"> | </span>
                <span className={`media_clickable_word ${activeTab === 'Songs' ? 'active' : ''}`} onClick={() => handleMediaTabClick('Songs')}> Songs </span>
                <span className="media_bar"> | </span>
                <span className={`media_clickable_word ${activeTab === 'Moments' ? 'active' : ''}`} onClick={() => handleMediaTabClick('Moments')}> Moments </span>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                <button className="upload_button" onClick={handleUploadClick}>
                    <i className="fas fa-upload"></i>
                </button>
            </div> 
            <div className="media_grid">
            {activeTab === "Photos" && (
                    photos.map((src, index) => (
                        <img key={index} src={src.toString()} className="media_item" />
                    ))
                )}
                {activeTab === "Videos" && (
                    videos.map((src, index) => (
                        <video key={index} className="media_item" controls>
                            <source src={src.toString()} type="video/mp4" />
                        </video>
                    ))
                )}
                {activeTab === "Songs" && (
                    songs.map((src, index) => (
                        <audio key={index} className="media_item_audio" controls>
                            <source src={src.toString()} type="audio/mp3" />
                        </audio>
                    ))
                )}
                {activeTab === "Moments" && (
                    moments.map((src, index) => (
                        <video key={index} className="media_item" controls>
                            <source src={src.toString()} type="video/mp4" />
                        </video>
                    ))
                )}
            </div>
        </div>
    );
}
