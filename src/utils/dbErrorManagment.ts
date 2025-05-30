import { IFieldError } from './errorReturn';

export function DbError(err: any): { status: number; msg: string; fields?: IFieldError[] } {
  switch (err.code) {
    case '23505':
      const match = err.detail?.match(/\(([^)]+)\)=/);
      const field = match?.[1] ?? 'unknown';
      return {
        status: 409,
        msg: `${field} already in use.`,
        fields: [
          {
            field,
            message: `${field} already in use.`,
          },
        ],
      };
    case '23502':
      return {
        status: 400,
        msg: 'Required field missing.',
        fields: [{ field: err.column || 'field', message: 'This field is required.' }],
      };
    case '23503':
      return { status: 409, msg: 'Invalid reference (foreign key violation).' };
    case '22001':
      return { status: 400, msg: 'Value too long for the field.' };
    case '53300':
    case '08006':
      return { status: 503, msg: 'Database unavailable. Please try again later.' };
    default:
      return { status: 500, msg: 'Internal database error.' };
  }
}
