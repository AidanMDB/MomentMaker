import { useState, useEffect } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import PreviewMoment from './PreviewMoment'
import PersonIdCheckbox from "./PersonIdCheckbox.tsx";
import "./AllStyles.css"
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import face1 from "/women-linkedin-headshot-los-angeles-1.jpg";
import face2 from "/Mike Tyson Photographed by Los Angeles Photographer Alan Weissman.jpg";
import face3 from "/head-shot-photography-studio-new-york.jpg";
import face4 from "/istockphoto-1320651997-612x612.jpg";
import face5 from "/images.jpg";

export default function Library() {
    const [userID, setUserID] = useState<string | null>(null);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Happy");
    const [selectedTime, setSelectedTime] = useState("5 minutes");

    const people = [ { name: "Jane", image: face1 }, { name: "Mike", image: face2 }, { name: "Stacy", image: face3 }, { name: "Sarah", image: face4 }, { name: "Bob", image: face5 } ];
    const songs = ["Happy","Sad","Angry","Calm"];
    const times = ["30 seconds", "1 minute", "5 minutes"];

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    useEffect(() => {
        fetchUser();
    });

    const fetchUser = async () => {
        try {
            const user = await getCurrentUser();
            setUserID(user.userId);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const handleSubmit = async () => {
        openPreview();
        alert("handling submit")
        //API CALL HERE
    };

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
                        <h2 style={{ color: '#9c6bae', cursor: "default" }}>Person Identification</h2>
                    </div>
                    <PersonIdCheckbox options={people} selectedValues={selectedPersons} onSelect={setSelectedPersons} />
                </div>
            </div>
            <div className="features_block">
                <div className="bottom_container">
                    <div className="topbar_customization">
                            <h2 style={{ color: '#9c6bae', cursor: "default" }}>Personalized Features</h2>
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
            <button className="submit_button"  onClick={handleSubmit}> Submit </button>
            <PreviewMoment isOpen={isPreviewOpen} onClose={closePreview} onRedo={handleRedo} onSave={handleSave} />
        </div>
    );
}