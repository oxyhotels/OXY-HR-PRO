export const DEPARTMENTS = [
  "Property Manager",
  "Operational Manager",
  "F&B Manager",
  "Front Office",
  "GRE",
  "GRA",
  "Housekeeping",
  "Maintenance",
  "Security",
  "Accounts",
  "Sales",
  "Human Resources",
  "IT",
  "Compliance",
  "Finance",
  "Reservations",
  "Kitchen",
  "Procurement",
  "Administration"
] as const;

export type Department = typeof DEPARTMENTS[number];
