export const FIELD_LIMITS = {
  Weight: { min: 5, max: 300, unit: 'kg' },
  Height: { min: 30, max: 250, unit: 'cm' },
  Waist: { min: 30, max: 200, unit: 'cm' },
  Hip: { min: 30, max: 200, unit: 'cm' },
  Systolic: { min: 60, max: 250, unit: 'mmHg' },
  Diastolic: { min: 30, max: 150, unit: 'mmHg' },
  RBSValue: { min: 1, max: 40, unit: 'mmol/L' },
} as const;

export type FieldKey = keyof typeof FIELD_LIMITS;

export const validateField = (field: FieldKey, value: string): string | null => {
  if (!value || value.trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Must be a valid number';
  const limit = FIELD_LIMITS[field];
  if (number < limit.min) return `Minimum is ${limit.min} ${limit.unit}`;
  if (number > limit.max) return `Maximum is ${limit.max} ${limit.unit}`;
  return null;
};
