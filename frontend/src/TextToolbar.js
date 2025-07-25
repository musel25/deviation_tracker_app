import React from 'react';

const TextToolbar = ({ element, onUpdate }) => {
  const isDisabled = !element || element.type !== 'text';

  const handleUpdate = (property, value) => {
    if (isDisabled) return;
    onUpdate({ ...element, [property]: value });
  };

  const toggleStyle = (property, activeValue, inactiveValue) => {
    if (isDisabled) return;
    const newValue = element[property] === activeValue ? inactiveValue : activeValue;
    onUpdate({ ...element, [property]: newValue });
  };

  const changeFontSize = (amount) => {
    if (isDisabled) return;
    const newSize = Math.max(8, element.fontSize + amount); // Minimum font size of 8
    handleUpdate('fontSize', newSize);
  };
  
  const resetStyles = () => {
      if(isDisabled) return;
      onUpdate({
          ...element,
          fontWeight: 'normal',
          fontStyle: 'normal',
          underline: false,
          strikethrough: false,
          fill: '#000000',
          highlightColor: 'transparent',
      });
  }

  const defaultValues = {
    fontFamily: 'Arial',
    fontSize: 30,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    strikethrough: false,
    fill: '#000000',
    highlightColor: 'transparent',
  };

  const current = isDisabled ? defaultValues : element;

  return (
    <div className={`text-toolbar ${isDisabled ? 'disabled' : ''}`}>
      <div className="toolbar-row">
        {/* Font Family and Size Group */}
        <div className="toolbar-group">
          <select
            value={current.fontFamily}
            onChange={(e) => handleUpdate('fontFamily', e.target.value)}
            disabled={isDisabled}
          >
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>
          <input
            type="number"
            className="font-size-input"
            value={current.fontSize}
            onChange={(e) => handleUpdate('fontSize', parseInt(e.target.value, 10))}
            disabled={isDisabled}
          />
        </div>
        <div className="separator"></div>
        {/* Font Size Adjust Group */}
        <div className="toolbar-group">
          <button className="icon-button" onClick={() => changeFontSize(2)} disabled={isDisabled}>A+</button>
          <button className="icon-button" onClick={() => changeFontSize(-2)} disabled={isDisabled}>A-</button>
        </div>
        <div className="separator"></div>
        {/* Clear Formatting Group */}
        <div className="toolbar-group">
            <button className="icon-button" onClick={resetStyles} disabled={isDisabled}>A⌫</button>
        </div>
      </div>

      <div className="toolbar-row">
        {/* Font Style Group */}
        <div className="toolbar-group">
          <button className={`icon-button ${current.fontWeight === 'bold' ? 'active' : ''}`} onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} disabled={isDisabled}>B</button>
          <button className={`icon-button ${current.fontStyle === 'italic' ? 'active' : ''}`} onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} disabled={isDisabled}>I</button>
          <button className={`icon-button underline ${current.underline ? 'active' : ''}`} onClick={() => handleUpdate('underline', !current.underline)} disabled={isDisabled}>U</button>
          <button className={`icon-button strikethrough ${current.strikethrough ? 'active' : ''}`} onClick={() => handleUpdate('strikethrough', !current.strikethrough)} disabled={isDisabled}>S</button>
        </div>
        <div className="separator"></div>
        {/* Color Group */}
        <div className="toolbar-group">
            <div className="color-picker-wrapper">
                <span>🎨</span>
                <input type="color" title="Highlight Color" value={current.highlightColor} onChange={(e) => handleUpdate('highlightColor', e.target.value)} disabled={isDisabled} />
            </div>
            <div className="color-picker-wrapper">
                <span style={{ borderBottom: `3px solid ${current.fill}` }}>A</span>
                <input type="color" title="Font Color" value={current.fill} onChange={(e) => handleUpdate('fill', e.target.value)} disabled={isDisabled} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default TextToolbar;