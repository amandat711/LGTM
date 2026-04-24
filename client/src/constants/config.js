const defaultApiBase = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
export const API_BASE = process.env.REACT_APP_API_BASE ?? defaultApiBase;

export const MIN_PASSWORD_LEN = 8;
