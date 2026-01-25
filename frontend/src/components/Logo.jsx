// frontend/src/components/Logo.jsx
// Reusable Logo component with brand name and logo image
// Used across all pages of the application

import React from "react";
import { useNavigate } from "react-router-dom";
import "./logo.css";

export default function Logo({ onClick, className = "" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className={`jw-logo-brand ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Logo Image */}
      <img 
        src="/Frame.svg" 
        alt="JeetOWin Logo" 
        className="jw-logo-img"
      />
      
      {/* Brand Name */}
      <div className="jw-brand-name">
        <span className="jw-brand-jeet">Jeet</span>
        <span className="jw-brand-o">O</span>
        <span className="jw-brand-win">Win</span>
      </div>
    </div>
  );
}
