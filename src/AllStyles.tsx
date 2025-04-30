import { useState, useEffect } from "react";
import icon from "./assets/MomentMakerIcon.ico"
import { useNavigate } from "react-router-dom"
import { signOut, getCurrentUser, fetchUserAttributes  } from 'aws-amplify/auth';
import ErrorPopUp from "./ErrorPopUp";
import { useError } from "./ErrorContext";
import "./AllStyles.css"
import '@fortawesome/fontawesome-free/css/all.min.css';

import Library from "./Library"
import CreateAMoment from "./CreateMoment"

export default function AllStyles() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("library");
    const [user, setUser] = useState<{ email: string; id: string } | undefined>(undefined);
    const [showProfile, setShowProfile] = useState(false);
    
    useEffect(() => {
        const init = async () => {
            await fetchUser();
        };
    
        init();
    }, []);

    const { setErrorMessage } = useError();

    const fetchUser = async () => {
        try {
            const user = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            setUser({
                email: attributes.email ?? '',
                id: user.userId ?? '',
            });
        } catch (error) {
            console.error("Error fetching user:", error);
            setErrorMessage("Error fetching user")
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/home");
        } catch (error) {
            console.error("Error signing out: ", error);
            setErrorMessage("Error signing out")
        }
    };

    const handleProfile = async () => {
        setShowProfile((prev) => !prev);
    };

    return (
        <main>
            <div className="container_side">
                <div className="container_left">
                    <div className="topbar_left">
                        <img src={icon} alt="Centered" className="icon" />
                        <h1 style={{ color: '#9c6bae', cursor: "default" }}>MomentMaker</h1>
                    </div>
                    <div className="side_bar">
                        <button className={`side_bar-tab ${activeTab === "library" ? "active" : ""}`} onClick={() => setActiveTab("library")}>
                            Library
                        </button>
                        <button className={`side_bar-tab ${activeTab === "createamoment" ? "active" : ""}`} onClick={() => setActiveTab("createamoment")}>
                            Create A Moment
                        </button>
                    </div>
                </div>
                <div className="container">
                    <div className="topbar">
                        <button className="logout" onClick={handleLogout}>Log Out</button>
                        <div style={{ position: 'relative' }}>
                            <button className="profile" onClick={handleProfile}>
                                <i className="fas fa-user"></i>
                            </button>
                            {showProfile && (
                                <div className="profile_popup">
                                    <p><strong>Email:</strong> {user?.email}</p>
                                    <p><strong>User ID:</strong> {user?.id}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="media_block">
                        {activeTab === "library" && <Library />}
                        {activeTab === "createamoment" && <CreateAMoment />}
                    </div>
                </div>
            </div>
            <ErrorPopUp />
        </main>
    );
}