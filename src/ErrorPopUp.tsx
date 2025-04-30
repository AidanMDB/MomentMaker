import "./ErrorPopUp.css";

interface ErrorPopUpProps {
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
}

export default function ErrorPopUp({ errorMessage, setErrorMessage }: ErrorPopUpProps) {
  const handleClose = () => {
    setErrorMessage(null); // Close the popup
  };

  if (!errorMessage) return null;

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
