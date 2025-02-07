import { useState } from "react";
import "./Library.css"
import { Menu } from "lucide-react";
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Library() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

    const handleUpload = () => {
        alert('Upload button clicked!');
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
                            <button className="upload_button" onClick={() => handleUpload()}>
                                <i className="fas fa-upload"></i>
                            </button>
                        </div> 
                    </div>
                </div>
            </div>
        </main>
    );
}