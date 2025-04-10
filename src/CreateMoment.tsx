import { useState, useEffect } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list } from 'aws-amplify/storage';
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
    const [songs, setSongs] = useState<string[]>([]);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Upload Songs");
    const [selectedTime, setSelectedTime] = useState<number>(60);

    const people = [ { name: "Jane", image: face1 }, { name: "Mike", image: face2 }, { name: "Stacy", image: face3 }, { name: "Sarah", image: face4 }, { name: "Bob", image: face5 } ];

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    useEffect(() => {
        fetchSongs();
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

    const fetchSongs = async () => {
        try {
            const { items: songResults } = await list({ path: `user-media/${userID}/audio/` });

            const songNames = songResults.map((file) => {
                const pathParts = file.path.split('/');
                return pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "");
            });

            setSongs(songNames);
        } catch (error) {
            console.error("Error fetching media:", error);
        }
    };

    const handleRedo = () => {
        alert("Redo button clicked!");
      };
    
    const handleSave = () => {
    alert("Save button clicked!");
      };

    const handleTimeChange = (value: number, unit: 'minutes' | 'seconds') => {
        const minutes = unit === 'minutes' ? value : Math.floor(selectedTime / 60);
        const seconds = unit === 'seconds' ? value : selectedTime % 60;
      
        const total = minutes * 60 + seconds;
        const clamped = Math.min(total, 300);
        setSelectedTime(clamped);
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
                    <div className="time_column">
                        <select
                            className="time_dropbox"
                            value={Math.floor(selectedTime / 60)}
                            onChange={(e) => handleTimeChange(Number(e.target.value), 'minutes')}
                            >
                            {[...Array(6)].map((_, i) => (
                                <option key={i} value={i}>
                                {i}
                                </option>
                            ))}
                        </select>
                        <label className="time_words">Minutes</label>
                        <select
                            className="time_dropbox"
                            value={selectedTime % 60}
                            onChange={(e) => handleTimeChange(Number(e.target.value), 'seconds')}
                            size={1}
                            >
                            {[...Array(60)].map((_, i) => (
                                <option key={i} value={i}>
                                {i < 10 ? `0${i}` : i}
                                </option>
                            ))}
                        </select>
                        <label className="time_words">Seconds</label>
                    </div>
                </div>
            </div>
            <button className="submit_button"  onClick={openPreview}> Submit </button>
            <PreviewMoment isOpen={isPreviewOpen} onClose={closePreview} onRedo={handleRedo} onSave={handleSave} />
        </div>
    );
}