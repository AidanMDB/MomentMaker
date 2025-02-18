import { useState, useRef } from "react";
import { Menu } from "lucide-react";
import { uploadData } from 'aws-amplify/storage';
import { useNavigate } from "react-router-dom";
import "./Library.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import test_photo from "./Bunny.png";
import test_photo2 from "./Ears.jpg";
import test_video from "./TestVideo.mp4";
import song from "./alone-296348.mp3";

export default function Library() {
    const navigate = useNavigate();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("Photos");

    const photos = [ test_photo,test_photo,test_photo,test_photo,test_photo,test_photo,test_photo,test_photo ];
    const videos = [ test_video,test_video,test_video,test_video,test_video ]
    const songs = [ song,song,song,song,,song ]
    const moments = [ test_photo2,test_photo2,test_photo2,test_photo2,test_photo2 ];

    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };
    
    const handleMediaTabClick = (option: string) => {
        setActiveTab(option);
    }
    
    //Upload
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4", "audio/mp3"];

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            if (!allowedTypes.includes(file.type)) {
                alert("Invalid file type. Please select a JPEG, PNG, or MP4 file.");
                return;
            }

            try {
                const result = await uploadData({
                    path: `user-media/${file.name}`,
                    data: file,
                    options: {
                        bucket: 'MediaStorage',
                        metadata: {
                            fileType: `${file.type}`,
                            userID: `user1`
                        }
                    }
                });

                console.log("Upload successful:", result);
                alert("Upload successful!");
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Upload failed!");
            }
        }
    };

    //HTML
    return (
        <main>
            <div className="container">
                <div className="topbar">
                    <Menu className="hamburger-icon" onClick={toggleDropdown} style={{ color: '#aeaeae' }} size={32} />
                    <h1 style={{ color: '#aeaeae' }}>Library</h1>
                </div>
                {isDropdownOpen && (
                    <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={() => navigate("/library")}>
                            Library
                        </div>
                        <div className="dropdown-item" onClick={() => navigate("/createamoment")}>
                            Create A Moment
                        </div>
                    </div>
                )}
                <div className="media_block">
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
                                    <img key={index} src={src} className="media_item" />
                                ))
                            )}
                            {activeTab === "Videos" && (
                                videos.map((src, index) => (
                                    <video key={index} className="media_item" controls>
                                        <source src={src} type="video/mp4" />
                                    </video>
                                ))
                            )}
                            {activeTab === "Songs" && (
                                songs.map((src, index) => (
                                    <audio key={index} className="media_item_audio" controls>
                                        <source src={src} type="audio/mp3" />
                                    </audio>
                                ))
                            )}
                            {activeTab === "Moments" && (
                                moments.map((src, index) => (
                                    <img key={index} src={src} className="media_item" />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}