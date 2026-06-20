export const DEPARTMENTS = [
  "Property Department",
  "IT Department",
  "HR Department",
  "Accounts Department",
  "Marketing Department",
  "Purchase Department",
  "Security Department",
  "Engineering Department",
  "Reservation Department",
  "Admin Department"
] as const;

export type Department = typeof DEPARTMENTS[number];
