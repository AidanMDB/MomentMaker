import './PreviewMoment.css';
import "./AllStyles.css"
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

  if (!isOpen) return null;

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
