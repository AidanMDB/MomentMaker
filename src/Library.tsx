import { useState, useRef, useEffect, useCallback } from "react";
import { uploadData, list, getUrl, remove } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import "./AllStyles.css"
import "./Library.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Library() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("Photos");
    const [userID, setUserID] = useState<string | null>(null);
    const [photos, setPhotos] = useState<URL[]>([]);
    const [selectedDeletion, setSelectedDeletion] = useState<URL[]>([]);
    const [videos, setVideos] = useState<URL[]>([]);
    const [songs, setSongs] = useState<{ name: string; url: URL }[]>([]);
    const [moments, setMoments] = useState<URL[]>([]);
    
    const handleMediaTabClick = (option: string) => {
        setActiveTab(option);
        setSelectedDeletion([]);
    }
    
    //Upon Loading
    useEffect(() => {
        fetchUser();
    }, []);
    
    const fetchMedia = useCallback(async () => {
        if (!userID) return;
        try {
            const { items: photoResults } = await list({ path: `user-media/${userID}/image/` });
            const { items: videoResults } = await list({ path: `user-media/${userID}/video/` });
            const { items: songResults } = await list({ path: `user-media/${userID}/audio/` });
            const { items: momentResults } = await list({ path: `user-media/${userID}/moments/` });

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
                    const fullPathParts = file.path.split("/");
                    const fullFileName = fullPathParts[fullPathParts.length - 1];
                    const songName = fullFileName.replace(/\.[^/.]+$/, "");
                    return { name: songName || "Untitled", url: urlOutput.url };
                  })
            );
            const momentUrls = await Promise.all(
                momentResults.map(async (file) => {
                    const urlOutput = await getUrl({ path: file.path });
                    return urlOutput.url;
                })
            );

            setPhotos(photoUrls);
            setVideos(videoUrls);
            setSongs(songUrls);
            setMoments(momentUrls);
        } catch (error) {
            console.error("Error fetching media:", error);
        }
      }, [userID]);

    useEffect(() => {
        if (userID) {
            fetchMedia();
        }
    }, [userID, fetchMedia]);
    

    const fetchUser = async () => {
        try {
            const user = await getCurrentUser();
            setUserID(user.userId);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    //Delete
    const toggleDeleteSelection = (media: URL) => {
        setSelectedDeletion((prev) => {
            if (prev.includes(media)) {
                return prev.filter((p) => p !== media);
            } else {
                return [...prev, media];
            }
        });
    };    

    const handleDeleteClick = async () => {
        if (selectedDeletion.length === 0) return;
    
        try {
            for (const fileUrl of selectedDeletion) {
                const url = new URL(fileUrl.toString());
                const keyMatch = url.pathname.match(/user-media\/.+/);
                if (keyMatch) {
                    await remove({ path: keyMatch[0] });
                }
            }
    
            await fetchMedia();
            setSelectedDeletion([]);
        } catch (error) {
            console.error(`Error deleting items from ${activeTab}:`, error);
        }
    };

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
                    path: `user-media/${userID}/${type}/${file.name}`,
                    data: file,
                    options: {
                        bucket: 'MediaStorage',
                        metadata: {
                            fileType: `${file.type}`,
                            userID: `${userID}`
                        }
                    }
                });

            } catch (error) {
                console.error("Error uploading media:", error);
            }
            
            await fetchMedia();
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
                <div className="right_buttons">
                    {selectedDeletion.length > 0 && (
                        <button className="delete_button" onClick={handleDeleteClick}>
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
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
            </div> 
            <div className="media_grid">
                {activeTab === "Photos" && (
                    photos.map((src, index) => (
                        <img key={index} src={src.toString()}
                            className={`media_item ${selectedDeletion.includes(src) ? 'selected' : ''}`}
                            onClick={() => toggleDeleteSelection(src)}
                        />
                    ))
                )}
                {activeTab === "Videos" && (
                    videos.map((src, index) => (
                        <video key={index} 
                            className={`media_item ${selectedDeletion.includes(src) ? 'selected' : ''}`}
                            onClick={() => toggleDeleteSelection(src)} controls>
                            <source src={src.toString()} type="video/mp4" />
                        </video>
                    ))
                )}
                {activeTab === "Songs" && (
                    <div className="song-column">
                        {songs.map((song, index) => (
                            <div key={index}
                                className={`song-item ${selectedDeletion.includes(song.url) ? 'selected' : ''}`}
                                onClick={() => toggleDeleteSelection(song.url)}
                            >
                                <p className="song-name">{song.name}</p>
                                <audio className="media_item_audio" controls>
                                    <source src={song.url.toString()} type="audio/mp3" />
                                </audio>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === "Moments" && (
                    moments.map((src, index) => (
                        <video
                            key={index}
                            className={`media_item ${selectedDeletion.includes(src) ? 'selected' : ''}`}
                            onClick={() => toggleDeleteSelection(src)}
                        >
                            <source src={src.toString()} type="video/mp4" />
                        </video>
                    ))
                )}
            </div>
        </div>
    );
}
