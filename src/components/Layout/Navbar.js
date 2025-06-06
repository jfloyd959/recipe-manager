import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/upload', label: 'Import Data', icon: '📁' },
        { path: '/editor', label: 'Recipe Editor', icon: '✏️' },
        { path: '/production-chains', label: 'Production Chains', icon: '🏭' },
        { path: '/dependencies', label: 'Dependencies', icon: '🔗' },
        { path: '/complete-system', label: 'Complete System', icon: '🚀' }
    ];

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <h2>🧪 Recipe Manager</h2>
            </div>

            <div className="nav-links">
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default Navbar; 