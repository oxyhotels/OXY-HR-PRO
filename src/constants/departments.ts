export const DEPARTMENTS = [
  "CENTRAL TEAM",
  "IT TEAM",
  "CENTRAL OFFICE",
  "PROPERTY",
  "OTHER"
] as const;

export type Department = typeof DEPARTMENTS[number];
