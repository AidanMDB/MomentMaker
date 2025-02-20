import React from "react";
import "./PersonIdCheckbox.css";

interface Person {
  name: string;
  image: string;
}

interface PersonIdCheckboxProps {
  options: Person[];
  selectedValues: string[];
  onSelect: (selected: string[]) => void;
}

const PersonIdCheckbox: React.FC<PersonIdCheckboxProps> = ({ options, selectedValues, onSelect }) => {
  const toggleSelection = (value: string) => {
    const updatedSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    onSelect(updatedSelection);
  };

  return (
    <div className="person-checkbox-container">
      <div className="person-options">
        {options.map((person) => (
          <label key={person.name} className="person-option">
            <input
              type="checkbox"
              checked={selectedValues.includes(person.name)}
              onChange={() => toggleSelection(person.name)}
            />
            <img src={person.image} alt={person.name} className={`person-image ${selectedValues.includes(person.name) ? "selected" : ""}`} />
            <span className="person-name">{person.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default PersonIdCheckbox;
