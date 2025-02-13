import { useState, useRef } from "react";
import { Menu } from "lucide-react";
import { uploadData } from 'aws-amplify/storage';
import "./Library.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Library() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };
    
    const handleSelect = (option: string) => {
        alert(`You selected: ${option}`);
        setIsDropdownOpen(false);
    };
    
    const handleMediaTabClick = (option: string) => {
        alert(`You selected: ${option}`);
    }
    
    //Upload
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4"];

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
                    path: `${file.name}`,
                    data: file,
                    options: {
                        bucket: 'MediaStorage'
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

    return (
        <main>
            <div className="container">
                <div className="topbar">
                    <Menu className="hamburger-icon" size={32} onClick={toggleDropdown} />
                    <h1 style={{ color: '#2e7875' }}>Library</h1>
                </div>
                {isDropdownOpen && (
                    <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={() => handleSelect('Library')}>
                            Library
                        </div>
                        <div className="dropdown-item" onClick={() => handleSelect('Settings')}>
                            Settings
                        </div>
                    </div>
                )}
                <div className="media_block">
                    <div className="media_container">
                        <div className="topbar_media">
                            <span className="media_clickable_word" onClick={() => handleMediaTabClick('Photos')}> Photos </span>
                            <span className="media_bar"> | </span>
                            <span className="media_clickable_word" onClick={() => handleMediaTabClick('Videos')}> Videos </span>
                            <span className="media_bar"> | </span>
                            <span className="media_clickable_word" onClick={() => handleMediaTabClick('Songs')}> Songs </span>
                            <span className="media_bar"> | </span>
                            <span className="media_clickable_word" onClick={() => handleMediaTabClick('Moments')}> Moments </span>
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
                </div>
            </div>
        </main>
    );
}