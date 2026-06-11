import { Request, Response, NextFunction } from 'express';
import { Ticket } from '@/models/Ticket';
import { ApiError } from '@/utils/ApiError';

export const getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    // Standard employee only sees tickets raised by them or assigned to them
    if (req.user?.role === 'EMPLOYEE') {
      filter.$or = [
        { employee: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const tickets = await Ticket.find(filter)
      .populate('employee', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tickets.length,
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, title, description, priority } = req.body;
    
    let hotelId = req.user?.hotel;
    if (!hotelId) {
      throw new ApiError(400, 'Could not resolve hotel ID for ticketing');
    }

    // Set SLA based on priority: High = 4 hours, Medium = 24 hours, Low = 72 hours
    const priorityHours = priority === 'High' ? 4 : priority === 'Medium' ? 24 : 72;
    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + priorityHours);

    const ticket = await Ticket.create({
      employee: req.user?._id,
      hotel: hotelId,
      category,
      title,
      description,
      priority,
      status: 'Open',
      slaDueDate,
      timeline: [
        { status: 'Open', notes: 'Ticket successfully created and logged.', time: new Date() }
      ],
    });

    res.status(201).json({
      status: 'success',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, notes, assignedTo } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Validate permission (Assignee or Manager/Admin can update)
    const canUpdate = 
      req.user?.role !== 'EMPLOYEE' || 
      ticket.employee.toString() === req.user?._id.toString() ||
      ticket.assignedTo?.toString() === req.user?._id.toString();

    if (!canUpdate) {
      throw new ApiError(403, 'Permission denied to update this ticket');
    }

    if (status) {
      ticket.status = status;
      ticket.timeline.push({
        status,
        notes: notes || `Status updated to ${status}.`,
        time: new Date(),
      });
    }

    if (assignedTo) {
      ticket.assignedTo = assignedTo;
      ticket.timeline.push({
        status: ticket.status,
        notes: `Ticket assigned to partner employee ID ${assignedTo}.`,
        time: new Date(),
      });
    }

    await ticket.save();

    res.status(200).json({
      status: 'success',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};
