import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list, getUrl } from 'aws-amplify/storage';
import { remove } from 'aws-amplify/storage';
import ErrorPopUp from "./ErrorPopUp";
import PreviewMoment from './PreviewMoment'
import "./AllStyles.css"
import "./CreateMoment.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

//change this to the actual lambda when merged
//const LAMBDA_URL = 'https://2ozkgiehnbcfvyydq4546ly2xm0obgnb.lambda-url.us-east-1.on.aws/'; //sandbox
const LAMBDA_URL = 'https://stfvtflwooq5txkmuwjzhvc5wq0pkikm.lambda-url.us-east-1.on.aws/';

export default function Library() {
    const [userID, setUserID] = useState<string | null>(null);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const [songs, setSongs] = useState<string[]>([]);
    const [people, setPeople] = useState<URL[]>([]);
    const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
    const [selectedSong, setSelectedSong] = useState<string | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<number>(60);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshLoading, setIsRefreshLoading] = useState(false);
    const [moment, setMoment] = useState<string | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const openPreview = () => setPreviewOpen(true);
    const closePreview = async () => {
        await handleDeleteMoment();
        setPreviewOpen(false);
    }

    const fetchSongs = useCallback(async () => {
        if (!userID) return;
        try {
            const { items: songResults } = await list({ path: `user-media/${userID}/audio/` });
            const songNames = songResults.map((file) => {
                const pathParts = file.path.split('/');
                return pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "");
            });
            const songsWithEmpty = ["", ...songNames];
            setSongs(songsWithEmpty);
            setSelectedSong(songNames[0])
        } catch (error) {
            console.error("Error fetching media:", error);
            setErrorMessage("Error fetching media");
        }
    }, [userID, setErrorMessage]);

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
            setErrorMessage("Error fetching people");

        }
    }, [userID, setErrorMessage]);

    useEffect(() => {
        const init = async () => {
            await fetchUser();
        };
    
        init();
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
            setErrorMessage("Error fetching user");
        }
    };

    const createVideo = async () => {
        const faceID = [""];
        for (let i = 0; i < selectedPersons.length; i++) {
            const match = selectedPersons[i].match(/user-media[^?]*/);
            faceID[i] = match ? match[0] : "";
        }

        if (faceID[0] === '') {
            console.log("no face selected")
        }
        //API CALL
        try {
            // Send a GET request to the Lambda function URL with the query string
            const response = await fetch(`${LAMBDA_URL}?userID=${userID}&faceID=${faceID}&timeLimit=${selectedTime}&song=${selectedSong}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Lambda response:', data);
            } else {
                console.error('Lambda request failed:', response.statusText);
                setErrorMessage("Error Lambda request failed");
            }
        } catch (error) {
            console.error('Error calling Lambda:', error);
        }
    }

    const fetchLatestVideo = async () => {
        try {
            const { items: videoResults } = await list({ path: `user-media/${userID}/moments/` });
    
            if (!videoResults.length) {
                setMoment("");
                return;
            }
    
            const sortedVideos = videoResults
                .filter(file => file?.lastModified)
                .sort((a, b) =>
                new Date(b?.lastModified ?? 0).getTime() - new Date(a?.lastModified ?? 0).getTime()
                );
                
            const latestVideo = sortedVideos[0];
            const urlOutput = await getUrl({ path: latestVideo.path });
            
            setMoment(urlOutput.url.toString());
        } catch (error) {
            console.error("Error fetching latest video:", error);
            setErrorMessage("Error fetching latest video");
        }
    };

    const handleDeleteMoment = async () => {
        try {
            const { items: videoResults } = await list({ path: `user-media/${userID}/moments/` });
    
            if (!videoResults.length) {
                return;
            }
    
            const sortedVideos = videoResults
                .filter(file => file?.lastModified)
                .sort((a, b) =>
                  new Date(b?.lastModified ?? 0).getTime() - new Date(a?.lastModified ?? 0).getTime()
                );
                
            const latestVideo = sortedVideos[0];
            await remove({ path: latestVideo.path });
        } catch (error) {
            console.error("Error removing latest moment:", error);
            setErrorMessage("Error removing latest moment");
        }
    }

    const handleSubmit = async () => {        
        setIsLoading(true);
        try {
            await createVideo();
            await fetchLatestVideo();
        } catch (err) {
            setErrorMessage("Error creating moment");
        } finally {
            setIsLoading(false);
        }
        openPreview();
    };

    const handleRedo = async () => {
        closePreview();
        setIsLoading(true);
        try {
            await createVideo();
            await fetchLatestVideo();
        } catch (err) {
            setErrorMessage("Error creating moment");
        } finally {
            setIsLoading(false);
        }
        openPreview();
    };
    
    const handleSave = () => {
        setPreviewOpen(false);
    }

    const fetchRefreshFaces = async () => {
        setIsRefreshLoading(true);
      
        const startTime = Date.now();
        const timeoutDuration = 2 * 60 * 1000; // 2 minutes
        const pollInterval = 5000; // check every 5 seconds
      
        const initialCount = people.length;
      
        const poll = async () => {
          try {
            const { items: faceResults } = await list({ path: `user-media/${userID}/faces/` });
      
            if (faceResults.length > initialCount) {
              const faceUrls = await Promise.all(
                faceResults.map(async (file) => {
                  const urlOutput = await getUrl({ path: file.path });
                  return urlOutput.url;
                })
              );
              setPeople(faceUrls);
              setIsRefreshLoading(false);
              return;
            }
      
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < timeoutDuration) {
              setTimeout(poll, pollInterval);
            } else {
              setIsRefreshLoading(false);
              setErrorMessage("No new faces detected.");
            }
          } catch (error) {
            console.error("Error fetching people:", error);
            setErrorMessage("Error fetching people");
            setIsRefreshLoading(false);
          }
        };
      
        poll();
      };
      
      
    const togglePersonSelection = (src: string) => {
        setSelectedPersons((prev) =>
            prev.includes(src)
                ? prev.filter((item) => item !== src)
                : [...prev, src]
        );
    };

    const updateTimeDisplay = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} minutes ${remainingSeconds} seconds`;
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        
        if ([60, 120, 180, 240, 300].includes(newValue)) {
            setSelectedTime(newValue);
            setTimeout(() => {
                setSelectedTime(newValue);
            }, 1000);
        } else {
            setSelectedTime(newValue);
        }
    };

    return (
        <div className="container_moment">
            <div className="identification_block">
                <div className="bottom_container">
                    <div className="topbar_customization">
                        <h2 style={{ color: '#9c6bae', cursor: "default" }}>Person Identification</h2>
                        <button className="refresh-button" onClick={fetchRefreshFaces}>
                            <i className={`fas fa-sync-alt ${isRefreshLoading ? 'fa-spin' : ''}`} />
                        </button>
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
                    <div className="time_slider-container">
                        <input
                            type="range"
                            min="0"
                            max="300"
                            step="1"
                            value={selectedTime}
                            onChange={handleSliderChange}
                            className="time_slider"
                        />
                        <div className="time-display">{updateTimeDisplay(selectedTime)}</div>
                    </div>
                </div>
            </div>
            <button className="submit_button"  onClick={handleSubmit}> Submit </button>
            <PreviewMoment isOpen={isPreviewOpen} moment={moment} onClose={closePreview} onRedo={handleRedo} onSave={handleSave} />
            {isLoading && (
            <div className="loading-overlay">
                <div className="spinner" />
                <p style={{ color: "white" }}>Creating Your Moment...</p>
            </div>
            )}
            <ErrorPopUp errorMessage={errorMessage} setErrorMessage={setErrorMessage} />
        </div>
    );
}



