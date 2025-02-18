import { useState } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Library() {
    const navigate = useNavigate();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };

    return (
        <main>
            <div className="container">
                <div className="topbar">
                <Menu className="hamburger-icon" onClick={toggleDropdown} style={{ color: '#aeaeae' }} size={32} />
                    <h1 style={{ color: '#aeaeae' }}>Create A Moment</h1>
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
                <div className="identification_block">
                    <div className="bottom_container">
                        <div className="topbar_customization">
                            <h2 style={{ color: '#aeaeae' }}>Person Identification</h2>
                        </div> 
                    </div>
                </div>
                <div className="features_block">
                    <div className="bottom_container">
                    <div className="topbar_customization">
                            <h2 style={{ color: '#aeaeae' }}>Personalized Features</h2>
                        </div> 
                    </div>
                </div>
                <button className="submit_button"> Submit </button>
            </div>
        </main>
    );
}