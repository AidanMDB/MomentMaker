import { useState } from "react";
import icon from "./assets/MomentMakerIcon.ico"
import { useNavigate } from "react-router-dom"
import "./AllStyles.css"

import Library from "./Library"
import CreateAMoment from "./CreateMoment"

export default function AllStyles() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("Home");

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
                        <button className="logout" onClick={() => navigate("/home")}>Log Out</button>
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