function CarbonScore({ items }) {
  const totalCarbon = items.reduce((sum, item) => sum + (item.estimatedCarbon || 0), 0);

  return (
    <div className="carbon-score">
      <h3>Carbon Footprint</h3>
      <div className="score-value">{totalCarbon.toFixed(1)} kg CO₂</div>
      <div className="score-breakdown">
        {items.map((item, index) => (
          <div key={index} className="item-score">
            <span>{item.name}</span>
            <span>{item.estimatedCarbon?.toFixed(1)} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CarbonScore;