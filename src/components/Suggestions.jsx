function Suggestions({ items }) {
  const alternatives = {
    'Tomatoes': { name: 'Bell Peppers', carbonReduction: 0.2 },
    'Rice': { name: 'Millets', carbonReduction: 3.0 }
  };

  return (
    <div className="suggestions">
      <h3>💡 Sustainable Alternatives</h3>
      {items.map((item, index) => {
        const alt = alternatives[item.name];
        return alt ? (
          <div key={index} className="suggestion-item">
            <strong>{item.name}</strong> → <strong>{alt.name}</strong>
            <br />
            <small>Save {alt.carbonReduction} kg CO₂</small>
          </div>
        ) : null;
      })}
    </div>
  );
}

export default Suggestions;