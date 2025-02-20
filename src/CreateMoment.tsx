import { useState } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PersonIdCheckbox from "./PersonIdCheckbox.tsx";
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import test_photo2 from "./Ears.jpg";

export default function Library() {
    const navigate = useNavigate();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Happy");
    const [selectedTime, setSelectedTime] = useState("5 minutes");

    const people = [ { name: "Jack", image: test_photo2 }, { name: "Molly", image: test_photo2 }, { name: "Bob", image: test_photo2 }, { name: "Sarah", image: test_photo2 }, { name: "Stacy", image: test_photo2 } ];
    const songs = ["Happy","Sad","Angry","Calm"];
    const times = ["30 seconds", "1 minute", "5 minutes"];

    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };

    return (
        <main>
            <div className="container">
                <div className="topbar">
                <Menu className="hamburger-icon" onClick={toggleDropdown} style={{ color: '#aeaeae' }} size={32} />
                    <h1 style={{ color: '#aeaeae', cursor: "default" }}>Create A Moment</h1>
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
                            <h2 style={{ color: '#aeaeae', cursor: "default" }}>Person Identification</h2>
                        </div>
                        <PersonIdCheckbox options={people} selectedValues={selectedPersons} onSelect={setSelectedPersons} />
                    </div>
                </div>
                <div className="features_block">
                    <div className="bottom_container">
                        <div className="topbar_customization">
                                <h2 style={{ color: '#aeaeae', cursor: "default" }}>Personalized Features</h2>
                            </div> 
                        <span className="feature_name"> Song Selection </span>
                        <select className="feature_dropbox" value={selectedSong} onChange={(e) => setSelectedSong(e.target.value)}>
                            {songs.map((song, index) => (
                                <option key={index} value={song}> {song} </option>
                            ))}
                        </select>
                        <span className="feature_name"> Time Constraint </span>
                        <select className="feature_dropbox" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                            {times.map((time, index) => (
                                <option key={index} value={time}> {time} </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button className="submit_button"> Submit </button>
            </div>
        </main>
    );
}