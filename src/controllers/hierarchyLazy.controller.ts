import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';

export const getLazyHierarchy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { parentId, type } = req.query;

    // SCENARIO 1: Root Node Request (No parentId)
    if (!parentId) {
      // Find the Root Admin
      const rootAdmin = await User.findOne({ role: 'ROOT_ADMIN', status: 'Active' })
        .select('firstName lastName role designation profilePhoto')
        .lean();

      if (!rootAdmin) {
        res.status(404).json({ success: false, message: 'Root Admin not found' });
        return;
      }

      const rootNode = {
        id: 'ROOT',
        name: 'OXY HOTEL',
        type: 'ROOT',
        hasChildren: true,
        children: [
          {
            id: rootAdmin._id.toString(),
            name: `${rootAdmin.firstName} ${rootAdmin.lastName}`,
            type: 'ROOT_ADMIN',
            role: rootAdmin.role,
            designation: rootAdmin.designation,
            hasChildren: true
          }
        ]
      };

      res.status(200).json({ success: true, nodes: [rootNode] });
      return;
    }

    // SCENARIO 2: Root Admin clicked -> Show Departments
    if (type === 'ROOT_ADMIN') {
      const departments = [
        { id: 'dept-central', name: 'Central Team', type: 'DEPARTMENT', hasChildren: true },
        { id: 'dept-sales', name: 'Sales Office Team', type: 'DEPARTMENT', hasChildren: true },
        { id: 'dept-property', name: 'Property Team', type: 'DEPARTMENT', hasChildren: true },
        { id: 'dept-it', name: 'IT Team', type: 'DEPARTMENT', hasChildren: true },
        { id: 'dept-other', name: 'Other', type: 'DEPARTMENT', hasChildren: true }
      ];
      res.status(200).json({ success: true, nodes: departments });
      return;
    }

    // SCENARIO 3: Property Team clicked -> Show Hotels
    if (type === 'DEPARTMENT' && parentId === 'dept-property') {
      const hotels = await Hotel.find({ status: 'Active' })
        .select('name hotelCode')
        .lean();
      
      const hotelNodes = hotels.map(h => ({
        id: h._id.toString(),
        name: h.name,
        subtitle: h.hotelCode,
        type: 'HOTEL',
        hasChildren: true
      }));

      res.status(200).json({ success: true, nodes: hotelNodes });
      return;
    }

    // SCENARIO 4: Other Departments clicked -> Show direct users in that department with NO reporting manager
    if (type === 'DEPARTMENT') {
      let deptNameMap: Record<string, string> = {
        'dept-central': 'Central Team',
        'dept-sales': 'Sales Office Team',
        'dept-it': 'IT Team',
        'dept-other': 'Other'
      };
      
      const deptName = deptNameMap[parentId as string];
      
      if (deptName) {
        const query: any = { status: 'Active', departmentName: deptName };
        if (deptName === 'Other') {
          query.departmentName = { $nin: ['Central Team', 'Sales Office Team', 'Property Team', 'IT Team'] };
        }

        // Top level users (those without a reporting manager)
        query.$or = [{ reportingManagerId: null }, { reportingManagerId: { $exists: false } }];

        const users = await User.find(query).select('firstName lastName role designation profilePhoto').lean();
        
        const userNodes = users.map(u => ({
          id: u._id.toString(),
          name: `${u.firstName} ${u.lastName}`,
          type: u.role,
          designation: u.designation,
          // If they are a manager, they might have children. We can safely set hasChildren: true and let it return empty if none.
          hasChildren: true 
        }));

        res.status(200).json({ success: true, nodes: userNodes });
        return;
      }
    }

    // SCENARIO 5: Hotel clicked -> Show top-level users in that hotel (No reporting manager, or reporting to root admin)
    if (type === 'HOTEL') {
      const rootAdmin = await User.findOne({ role: 'ROOT_ADMIN' }).lean();
      
      const query = {
        hotel: parentId,
        status: 'Active',
        $or: [
          { reportingManagerId: null },
          { reportingManagerId: { $exists: false } },
          { reportingManagerId: rootAdmin?._id }
        ]
      };

      const users = await User.find(query).select('firstName lastName role designation profilePhoto').lean();
      
      const userNodes = users.map(u => ({
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        type: u.role,
        designation: u.designation,
        hasChildren: true 
      }));

      res.status(200).json({ success: true, nodes: userNodes });
      return;
    }

    // SCENARIO 6: User (Manager/Supervisor) clicked -> Show their direct reports
    const subordinates = await User.find({ reportingManagerId: parentId, status: 'Active' })
      .select('firstName lastName role designation profilePhoto')
      .lean();
    
    const userNodes = subordinates.map(u => ({
      id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`,
      type: u.role,
      designation: u.designation,
      hasChildren: true 
    }));

    res.status(200).json({ success: true, nodes: userNodes });
    return;

  } catch (error: any) {
    console.error('Lazy Hierarchy Error:', error);
    next(error);
  }
};
