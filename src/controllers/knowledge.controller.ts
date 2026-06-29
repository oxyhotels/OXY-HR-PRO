import { Request, Response, NextFunction } from 'express';
import { KnowledgeItem } from '@/models/KnowledgeItem';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

// GET /api/community/knowledge
export const getKnowledgeItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.user?.hotel;
    if (!hotelId && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(400, 'User is not mapped to any hotel tenant');
    }

    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = hotelId;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    // Text search query
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    const items = await KnowledgeItem.find(filter)
          .populate('author', 'firstName lastName role department')
          .sort({ createdAt: -1 }).lean() as any;

    res.status(200).json({
      status: 'success',
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/knowledge
export const createKnowledgeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, content, department, attachments, category, tags } = req.body;
    const hotelId = req.user?.hotel;
    if (!hotelId) {
      throw new ApiError(400, 'User is not mapped to any hotel tenant');
    }

    // Only Directors, HR Managers, or Department heads/managers can publish training guidelines / SOPs
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Permission denied: Only managers and admins can create training manuals or SOPs');
    }

    const item = await KnowledgeItem.create({
      title,
      content,
      author: req.user?._id,
      hotel: hotelId,
      department,
      attachments: attachments || [],
      category: category || 'Document',
      tags: tags || []
    });

    const populatedItem = await KnowledgeItem.findById(item._id)
          .populate('author', 'firstName lastName role department').lean() as any;

    // Logging Audit Trail
    await AuditLog.create({
      user: req.user._id,
      hotel: hotelId,
      action: 'CREATE_KNOWLEDGE_ITEM',
      module: 'COMMUNITY',
      details: `Published SOP manual item "${title}" inside category "${category}"`
    });

    res.status(201).json({
      status: 'success',
      data: { item: populatedItem }
    });
  } catch (error) {
    next(error);
  }
};
