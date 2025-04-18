import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list, getUrl } from 'aws-amplify/storage';
import { remove } from 'aws-amplify/storage';
import PreviewMoment from './PreviewMoment'
import "./AllStyles.css"
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

//change this to the actual lambda when merged
//const LAMBDA_URL = 'https://oww7phtdo4nqxpfsftccvdj6rm0fnils.lambda-url.us-east-1.on.aws/'; //sandbox
const LAMBDA_URL = 'https://stfvtflwooq5txkmuwjzhvc5wq0pkikm.lambda-url.us-east-1.on.aws/';

export default function Library() {
    const [userID, setUserID] = useState<string | null>(null);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [songs, setSongs] = useState<string[]>([]);
    const [people, setPeople] = useState<URL[]>([]);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Happy");
    const [selectedTime, setSelectedTime] = useState("5 minutes");

    const people = [ { name: "Jane", image: face1 }, { name: "Mike", image: face2 }, { name: "Stacy", image: face3 }, { name: "Sarah", image: face4 }, { name: "Bob", image: face5 } ];
    const songs = ["Happy","Sad","Angry","Calm"];
    const times = ["30 seconds", "1 minute", "5 minutes"];

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    const handleRedo = () => {
        alert("Redo button clicked!");
      };
    
    const handleSave = () => {
        setPreviewOpen(false);
    }
      
    const togglePersonSelection = (src: string) => {
        setSelectedPersons((prev) =>
            prev.includes(src)
                ? prev.filter((item) => item !== src)
                : [...prev, src]
        );
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
                    <div className="face-grid">
                        {people.map((src, index) => (
                            <img
                                key={index}
                                src={src.toString()}
                                className={`face_item ${selectedPersons.includes(src.toString()) ? 'selected' : ''}`}
                                onClick={() => togglePersonSelection(src.toString())}
                                alt={`face-${index}`}
                            />
                        ))}
                    </div>
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