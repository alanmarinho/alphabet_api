export interface ValidationErrorItem {
  message: string;
  field: string;
}

export function FieldError(errors: ValidationErrorItem[]) {
  const formattedErrors: ValidationErrorItem[] = [];

  errors.forEach((error) => {
    formattedErrors.push({
      field: error.field,
      message: error.message,
    });
  });

  return formattedErrors;
}
