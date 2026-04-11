/**
 * Placeholder page for unbuilt features.
 */
export default function PlaceholderPage({ title, description }) {
  return (
    <div className="page-container">
      <div className="placeholder-card">
        <div className="placeholder-icon-wrapper">
          <span className="material-symbols-outlined placeholder-icon">construction</span>
        </div>
        <h2 className="placeholder-title">{title || 'Coming Soon'}</h2>
        <p className="placeholder-text">
          {description || 'This feature is under development and will be available in the next sprint.'}
        </p>
        <div className="placeholder-decoration">
          <div className="placeholder-line"></div>
          <span className="placeholder-chip">IN DEVELOPMENT</span>
          <div className="placeholder-line"></div>
        </div>
      </div>
    </div>
  );
}
