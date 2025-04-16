import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list, getUrl } from 'aws-amplify/storage';
import PreviewMoment from './PreviewMoment'
import "./AllStyles.css"
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Library() {
    const [userID, setUserID] = useState<string | null>(null);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [songs, setSongs] = useState<string[]>([]);
    const [people, setPeople] = useState<URL[]>([]);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState("Upload Songs");
    const [selectedTime, setSelectedTime] = useState<number>(60);

    const openPreview = () => setPreviewOpen(true);
    const closePreview = () => setPreviewOpen(false);

    const fetchSongs = useCallback(async () => {
        if (!userID) return;
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
    }, [userID]);

    const fetchFaces = useCallback(async () => {
        if (!userID) return;
        try {
            const { items: faceResults } = await list({ path: `user-media/${userID}/faces/` });
            const faceUrls = await Promise.all(
                faceResults.map(async (file) => {
                    const urlOutput = await getUrl({ path: file.path });
                    return urlOutput.url;
                })
            );
            setPeople(faceUrls);
        } catch (error) {
            console.error("Error fetching people:", error);
        }
    }, [userID]);

    useEffect(() => {
        fetchUser();
    }, []);
    
    useEffect(() => {
        if (userID) {
            fetchSongs();
            fetchFaces();
        }
    }, [userID, fetchSongs, fetchFaces]);
    

    const fetchUser = async () => {
        try {
            const user = await getCurrentUser();
            setUserID(user.userId);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };
      
    const togglePersonSelection = (src: string) => {
        setSelectedPersons((prev) =>
            prev.includes(src)
                ? prev.filter((item) => item !== src)
                : [...prev, src]
        );
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