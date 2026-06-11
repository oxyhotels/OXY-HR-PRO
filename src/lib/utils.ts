export const formatRole = (role?: string): string => {
  if (!role) return '';
  switch (role) {
    case 'ROOT_ADMIN':
      return 'Root Admin';
    case 'HOTEL_ADMIN':
      return 'Manager';
    case 'HR_MANAGER':
      return 'HR Manager';
    case 'DEPT_MANAGER':
      return 'Dept Manager';
    case 'EMPLOYEE':
      return 'Employee';
    default:
      return role.replace(/_/g, ' ');
  }
};
