import { useState, useEffect } from "react";
import icon from "./assets/MomentMakerIcon.ico"
import { useNavigate, useLocation } from "react-router-dom"
import { signOut } from 'aws-amplify/auth';
import "./AllStyles.css"

import Library from "./Library"
import CreateAMoment from "./CreateMoment"

export default function AllStyles() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("library");
    
    const location = useLocation();

    useEffect(() => {
        const activeTab = location.state?.activeTab;
        if (activeTab !== undefined) {
            setActiveTab(activeTab);
        }
    }, [location.state]);

    const handleLogout = async () => {
        try {
            await signOut();
            navigate("/home");
        } catch (error) {
            console.error("Error signing out: ", error);
        }
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
                    </div>
                    <div className="media_block">
                        {activeTab === "library" && <Library />}
                        {activeTab === "createamoment" && <CreateAMoment />}
                    </div>
                </div>
            </div>
        </main>
    );
}