import './PreviewMoment.css';
import "./AllStyles.css"
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list, getUrl } from 'aws-amplify/storage';
import { useNavigate } from "react-router-dom"

interface ModalProps {
  isOpen: boolean;
  moment: string | undefined;
  onClose: () => void;
  onRedo: () => void;
  onSave: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, moment, onClose, onRedo, onSave }) => {

  const navigate = useNavigate();

  const handleRedo = () => {
    onRedo(); 
  };

  const handleSave = () => {
    onSave();
    navigate("/all", {
      state: { activeTab: "library" }
    });
  };

  const fetchLatestVideo = useCallback(async () => {
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
    }
  }, [userID]);

    useEffect(() => {
      if (!isOpen) return;
      const init = async () => {
          await fetchUser();
      };

      init();
  }, [isOpen]);

  useEffect(() => {
    if (userID) {
        fetchLatestVideo();
    }
  }, [userID, fetchLatestVideo]);

  if (!isOpen) return null;
  
  const fetchUser = async () => {
      try {
          const user = await getCurrentUser();
          setUserID(user.userId);
      } catch (error) {
          console.error("Error fetching user:", error);
      }
  };

  return (
    <div className="modal-overlay">
        <div className="modal-content">
            <button className="close-button" onClick={onClose}>
                &times;
            </button>
            <h2 className="title">Preview Moment</h2>
            {moment ? (
              <video controls>
                <source src={moment} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <p>Loading preview...</p>
            )}
            <div className="button-container">
                <button className="redo_button" onClick={handleRedo}>Redo</button>
                <button className="save_button" onClick={handleSave}>Save</button>
            </div>
        </div>
    </div>
  );
};

export default Modal;
