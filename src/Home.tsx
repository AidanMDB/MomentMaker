import { useNavigate } from "react-router-dom";
import "./Home.css"
import logo from "./assets/MomentMaker.png"

export default function Home() {
    const navigate = useNavigate();

    return (
        <main>
            <div className="topbar_home">
                <button className="login" onClick={() => navigate("/library")}>Log In</button>
            </div>
            <div className="logo">
            <img src={logo} alt="Centered" className="image" />
            </div>
        </main>
      );
}