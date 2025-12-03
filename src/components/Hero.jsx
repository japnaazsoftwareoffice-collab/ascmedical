import React from 'react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero section">
            <div className="container hero-content">
                <h1 className="hero-title">
                    Build faster with <br />
                    <span className="text-gradient">Antigravity</span>
                </h1>
                <p className="hero-subtitle">
                    The ultimate React starter kit for building modern, high-performance web applications with stunning aesthetics.
                </p>
                <div className="hero-actions">
                    <button className="btn btn-primary">Get Started</button>
                    <button className="btn btn-secondary">View Documentation</button>
                </div>
            </div>
        </section>
    );
};

export default Hero;
