type RequiredFieldLabelProps = {
  htmlFor?: string;
  label: string;
};

export function RequiredFieldLabel({ htmlFor, label }: RequiredFieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="form-field-label">
      <span className="form-required-marker" aria-label="必填">
        *
      </span>
      <span>{label}</span>
    </label>
  );
}
