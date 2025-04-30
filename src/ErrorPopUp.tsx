import { useError } from "./ErrorContext";
import "./ErrorPopUp.css";

export default function ErrorPopUp() {
  const { errorMessage, setErrorMessage } = useError();

  if (!errorMessage) return null;

  const handleClose = () => {
    setErrorMessage(null); // Close the popup
  };

  return (
    <div className="error-popup">
      <div className="error-message">
        <p>{errorMessage}</p>
        <button className="error-close-button" onClick={handleClose}>
          Close
        </button>
      </div>
    </div>
  );
}
