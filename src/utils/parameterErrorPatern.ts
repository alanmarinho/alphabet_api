export interface ValidationErrorItem {
  message: string;
  parameter: string;
  field?: string;
}
export function ParameterError(errors: ValidationErrorItem[]) {
  const formattedErrors: ValidationErrorItem[] = [];

  errors.forEach((error) => {
    formattedErrors.push({
      parameter: error.field as string,
      message: error.message,
    });
  });

  return formattedErrors;
}
