import { useState } from "react";
import PreviewMoment from './PreviewMoment'
import PersonIdCheckbox from "./PersonIdCheckbox.tsx";
import "./AllStyles.css"
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import test_photo2 from "./Ears.jpg";

export default function Library() {
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Happy");
    const [selectedTime, setSelectedTime] = useState("5 minutes");

    const people = [ { name: "Jack", image: test_photo2 }, { name: "Molly", image: test_photo2 }, { name: "Bob", image: test_photo2 }, { name: "Sarah", image: test_photo2 }, { name: "Stacy", image: test_photo2 } ];
    const songs = ["Happy","Sad","Angry","Calm"];
    const times = ["30 seconds", "1 minute", "5 minutes"];

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    const handleRedo = () => {
        alert("Redo button clicked!");
      };
    
      const handleSave = () => {
        alert("Save button clicked!");
      };

    return (
        <div className="container_moment">
            <div className="identification_block">
                <div className="bottom_container">
                    <div className="topbar_customization">
                        <h2 style={{ color: 'black', cursor: "default" }}>Person Identification</h2>
                    </div>
                    <PersonIdCheckbox options={people} selectedValues={selectedPersons} onSelect={setSelectedPersons} />
                </div>
            </div>
            <div className="features_block">
                <div className="bottom_container">
                    <div className="topbar_customization">
                            <h2 style={{ color: 'black', cursor: "default" }}>Personalized Features</h2>
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
            <button className="submit_button"  onClick={openPreview}> Submit </button>
            <PreviewMoment isOpen={isPreviewOpen} onClose={closePreview} onRedo={handleRedo} onSave={handleSave} />
        </div>
    );
}