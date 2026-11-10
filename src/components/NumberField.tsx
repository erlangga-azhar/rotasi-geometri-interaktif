import { useEffect, useId, useState } from 'react';
import { clamp } from '../utils/math';

interface NumberFieldProps {
  /** ID eksplisit dari ControlPanel; fallback ke useId() agar tetap unik. */
  id?: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function NumberField({ id, label, value, onChange, min = -99, max = 99, step = 1 }: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = Number.parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(clamp(Number(parsed.toFixed(2)), min, max));
    }
  };

  const handleBlur = () => {
    const parsed = Number.parseFloat(text);
    if (text.trim() === '' || Number.isNaN(parsed)) {
      setText(String(value));
    }
  };

  return (
    <div className="block">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="decimal"
        step={step}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        className="number-input"
      />
    </div>
  );
}

export default NumberField;
