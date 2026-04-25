type FieldErrorTextProps = {
  message?: string | null;
};

export function FieldErrorText({ message }: FieldErrorTextProps) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="form-field-error">
      {message}
    </p>
  );
}
