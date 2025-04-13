import "./SocialMedia.css"
import { useState } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function SocialMedia() {
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        alert('Search query: ${query}');
    };

    return (
        <div className="search_bar">
            <input className="search_box" type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="search_icon" onClick={handleSearch}>
                <i className="fas fa-search"></i> {}
            </button>
        </div>
    );
}