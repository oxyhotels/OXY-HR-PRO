import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';

import mongoose from 'mongoose';

export const getOrgTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Fetch active hotels
    const hotels = await Hotel.find({ status: 'Active' }).lean() as any;

    // 2. Fetch active users
    const users = await User.find({ status: { $ne: 'Terminated' } })
      .populate('hotel', 'name hotelCode')
      .lean() as any;

    // Group users by department natively, but map anything not in the exact 4 to 'Other'
    const defaultDepts = ['Central Team', 'Sales Office Team', 'Property Team', 'IT Team', 'Other'];
    
    // 3. Find the real Root Admin user (or mock one if none found)
    const rootAdminUsers = users.filter(u => u.role === 'ROOT_ADMIN');
    const rootAdminName = rootAdminUsers.length > 0 ? `${rootAdminUsers[0].firstName} ${rootAdminUsers[0].lastName}` : 'Root Admin';

    // 4. Build base structure
    const tree = {
      id: 'oxy-hotel-root',
      name: 'OXY HOTEL',
      type: 'ROOT',
      children: [
        {
          id: 'root-admin',
          name: rootAdminName,
          type: 'ROOT_ADMIN',
          children: [] as any[]
        }
      ]
    };

    const rootAdminNode = tree.children[0];

    // Helper to process regular departments (Manager -> Employees)
    const processRegularDepartment = (deptName: string, deptUsers: any[]) => {
      // Find managers (either explicit MANAGER role or have people reporting to them, simplified as just checking designation/role)
      const managers = deptUsers.filter(u => (u.role && u.role.includes('MANAGER')) || (u.designation && u.designation.toLowerCase().includes('manager')));
      const employees = deptUsers.filter(u => !managers.includes(u));

      const managerNodes = managers.map(m => ({
        id: `user-${m._id}`,
        name: `${m.firstName} ${m.lastName}`,
        subtitle: m.designation || 'Manager',
        type: 'MANAGER',
        children: employees.filter(e => e.reportingManagerId?.toString() === m._id.toString() || e.parentId?.toString() === m._id.toString()).map(e => ({
          id: `user-${e._id}`,
          name: `${e.firstName} ${e.lastName}`,
          subtitle: e.designation || 'Employee',
          type: 'EMPLOYEE',
          children: []
        }))
      }));

      // If there are employees with no manager, put them at root of department
      const unassignedEmployees = employees.filter(e => !managerNodes.some(m => m.children.some(c => c.id === `user-${e._id}`)));
      const unassignedNodes = unassignedEmployees.map(e => ({
        id: `user-${e._id}`,
        name: `${e.firstName} ${e.lastName}`,
        subtitle: e.designation || 'Employee',
        type: 'EMPLOYEE',
        children: []
      }));

      return [...managerNodes, ...unassignedNodes];
    };

    // Helper to process Property Team users for a specific hotel
    const processHotelUsers = (hotelUsers: any[]) => {
      // Roles as requested: Manager -> [GRA, GRE, Supervisor] -> Housekeeping
      const managers = hotelUsers.filter(u => u.designation?.toLowerCase().includes('manager') || u.role?.includes('MANAGER'));
      
      const gras = hotelUsers.filter(u => u.designation?.toLowerCase().includes('gra') || u.designation?.toLowerCase() === 'guest relation associate');
      const gres = hotelUsers.filter(u => u.designation?.toLowerCase().includes('gre') || u.designation?.toLowerCase() === 'guest relation executive');
      const supervisors = hotelUsers.filter(u => u.designation?.toLowerCase().includes('supervisor'));
      const housekeepings = hotelUsers.filter(u => u.designation?.toLowerCase().includes('housekeeping'));
      
      // Everything else that doesn't fit the explicit model goes here
      const others = hotelUsers.filter(u => 
        !managers.includes(u) && !gras.includes(u) && !gres.includes(u) && !supervisors.includes(u) && !housekeepings.includes(u)
      );

      const supervisorNodes = supervisors.map(s => ({
        id: `user-${s._id}`,
        name: `${s.firstName} ${s.lastName}`,
        subtitle: s.designation || 'Supervisor',
        type: 'SUPERVISOR',
        children: housekeepings.map(h => ({
          id: `user-${h._id}`,
          name: `${h.firstName} ${h.lastName}`,
          subtitle: h.designation || 'Housekeeping',
          type: 'HOUSEKEEPING',
          children: []
        }))
      }));

      const unassignedHousekeeping = housekeepings.filter(h => supervisorNodes.length === 0).map(h => ({
        id: `user-${h._id}`,
        name: `${h.firstName} ${h.lastName}`,
        subtitle: h.designation || 'Housekeeping',
        type: 'HOUSEKEEPING',
        children: []
      }));

      const reportingToManager = [
        ...gras.map(g => ({
          id: `user-${g._id}`,
          name: `${g.firstName} ${g.lastName}`,
          subtitle: g.designation || 'GRA',
          type: 'EMPLOYEE',
          children: []
        })),
        ...gres.map(g => ({
          id: `user-${g._id}`,
          name: `${g.firstName} ${g.lastName}`,
          subtitle: g.designation || 'GRE',
          type: 'EMPLOYEE',
          children: []
        })),
        ...supervisorNodes,
        ...unassignedHousekeeping, // If no supervisors exist, housekeepings report to manager directly
        ...others.map(o => ({
          id: `user-${o._id}`,
          name: `${o.firstName} ${o.lastName}`,
          subtitle: o.designation || 'Staff',
          type: 'EMPLOYEE',
          children: []
        }))
      ];

      const managerNodes = managers.map(m => ({
        id: `user-${m._id}`,
        name: `${m.firstName} ${m.lastName}`,
        subtitle: m.designation || 'Manager',
        type: 'MANAGER',
        children: reportingToManager
      }));

      if (managerNodes.length > 0) {
        return managerNodes;
      } else {
        return reportingToManager;
      }
    };

    // 5. Populate the 5 exact departments
    defaultDepts.forEach(deptName => {
      const deptNode = {
        id: `dept-${deptName.toLowerCase().replace(/\s+/g, '-')}`,
        name: deptName,
        type: 'DEPARTMENT',
        children: [] as any[]
      };

      if (deptName === 'Property Team') {
        // Build Hotels
        hotels.forEach(hotel => {
          const hotelUsers = users.filter(u => u.hotel && (u.hotel as any)._id?.toString() === (hotel as any)._id.toString());
          const hotelNode = {
            id: `hotel-${(hotel as any)._id}`,
            name: hotel.name,
            subtitle: hotel.hotelCode,
            type: 'HOTEL',
            children: processHotelUsers(hotelUsers)
          };
          deptNode.children.push(hotelNode);
        });
      } else {
        // Regular departments
        const isOther = deptName === 'Other';
        const deptUsers = users.filter(u => {
          if (u.role === 'ROOT_ADMIN') return false; // Handled at top level
          const d = u.department || 'Other';
          if (isOther) {
            return !['Central Team', 'Sales Office Team', 'Property Team', 'IT Team'].includes(d) && (!u.hotel || !hotels.some(h => (h as any)._id.toString() === (u.hotel as any)._id?.toString()));
          }
          return d === deptName;
        });

        deptNode.children.push(...processRegularDepartment(deptName, deptUsers));
      }

      rootAdminNode.children.push(deptNode);
    });

    res.status(200).json({
      status: 'success',
      data: { tree }
    });
  } catch (error) {
    next(error);
  }
};
