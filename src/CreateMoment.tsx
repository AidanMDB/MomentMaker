import { useState } from "react";
import "./CreateMoment.css"
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

    return (
        <main>
            <div className="container">
                <div className="topbar">
                    <Menu className="hamburger-icon" size={32} onClick={toggleDropdown} />
                    <h1 style={{ color: '#2e7875' }}>Create A Moment</h1>
                </div>
                {isDropdownOpen && (
                    <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={() => handleSelect('Library')}>
                            Library
                        </div>
                        <div className="dropdown-item" onClick={() => handleSelect('Moment')}>
                            Create A Moment
                        </div>
                    </div>
                )}
                <div className="identification_block">
                    <div className="bottom_container">
                        <div className="topbar_customization">
                            <h2 style={{ color: '#cf665c' }}>Person Identification</h2>
                        </div> 
                    </div>
                </div>
                <div className="features_block">
                    <div className="bottom_container">
                    <div className="topbar_customization">
                            <h2 style={{ color: '#cf665c' }}>Personalized Features</h2>
                        </div> 
                    </div>
                </div>
                <button className="submit_button"> Submit </button>
            </div>
        </main>
    );
}