import './PreviewMoment.css';
import "./AllStyles.css"
import { useEffect, useState } from "react";
import { getCurrentUser } from 'aws-amplify/auth';
import { list, getUrl } from 'aws-amplify/storage';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedo: () => void;
  onSave: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onRedo, onSave }) => {
  if (!isOpen) return null;

  const [userID, setUserID] = useState<string | null>(null);
  const [moment, setMoment] = useState<string | undefined>(undefined);

  const handleRedo = () => {
    onRedo(); 
    onClose();
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  useEffect(() => {
      fetchUser();
      fetchLatestVideo();
    });
  
  const fetchUser = async () => {
      try {
          const user = await getCurrentUser();
          setUserID(user.userId);
      } catch (error) {
          console.error("Error fetching user:", error);
      }
  };

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
