import React from 'react';
import './ProgressOverview.css';

const ProgressOverview = ({ recipes }) => {
    const getOverviewStats = () => {
        const stats = {
            total: recipes.length,
            complete: 0,
            partial: 0,
            missing: 0,
            byTier: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            avgConstructionTime: 0,
            totalProductionTime: 0
        };

        recipes.forEach(recipe => {
            stats[recipe.completionStatus]++;
            stats.byTier[recipe.outputTier]++;
            stats.totalProductionTime += recipe.constructionTime || 0;
        });

        stats.avgConstructionTime = stats.total > 0 ? stats.totalProductionTime / stats.total : 0;
        stats.completionRate = stats.total > 0 ? (stats.complete / stats.total) * 100 : 0;

        return stats;
    };

    const stats = getOverviewStats();

    const formatTime = (seconds) => {
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    return (
        <div className="progress-overview">
            <div className="overview-cards">
                <div className="overview-card total">
                    <div className="card-icon">📋</div>
                    <div className="card-content">
                        <h3>{stats.total}</h3>
                        <p>Total Recipes</p>
                    </div>
                </div>

                <div className="overview-card complete">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h3>{stats.complete}</h3>
                        <p>Complete</p>
                    </div>
                </div>

                <div className="overview-card partial">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                        <h3>{stats.partial}</h3>
                        <p>Partial</p>
                    </div>
                </div>

                <div className="overview-card missing">
                    <div className="card-icon">❌</div>
                    <div className="card-content">
                        <h3>{stats.missing}</h3>
                        <p>Missing</p>
                    </div>
                </div>
            </div>

            <div className="overview-metrics">
                <div className="metric-item">
                    <span className="metric-label">Completion Rate:</span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${stats.completionRate}%` }}
                        ></div>
                    </div>
                    <span className="metric-value">{Math.round(stats.completionRate)}%</span>
                </div>

                <div className="metric-item">
                    <span className="metric-label">Avg. Construction Time:</span>
                    <span className="metric-value">{formatTime(stats.avgConstructionTime)}</span>
                </div>

                <div className="tier-distribution">
                    <span className="metric-label">Tier Distribution:</span>
                    <div className="tier-bars">
                        {[1, 2, 3, 4, 5].map(tier => (
                            <div key={tier} className={`tier-bar tier-${tier}`} title={`Tier ${tier}: ${stats.byTier[tier]} recipes`}>
                                <div
                                    className="tier-fill"
                                    style={{
                                        height: stats.total > 0 ? `${(stats.byTier[tier] / stats.total) * 100}%` : '0%'
                                    }}
                                ></div>
                                <span className="tier-label">T{tier}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressOverview; 