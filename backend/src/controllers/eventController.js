import { eventRepo } from '../models/eventRepo.js';
import { staffRepo } from '../models/staffRepo.js';
import { registrantRepo } from '../models/registrantRepo.js';

/**
 * Public & Staff: Get all club events (Edge CDN cached for concurrent viewers)
 */
export const getClubEvents = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    const events = await eventRepo.getAll({ category, status, search });
    return res.json({ success: true, data: events });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch events', error: error.message });
  }
};

/**
 * Public: Get single event details by eventId (Edge CDN cached)
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    const eventItem = await eventRepo.findById(id);
    if (!eventItem) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, data: eventItem });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch event', error: error.message });
  }
};

/**
 * Admin: Create a new club event
 */
export const createClubEvent = async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const newEvent = await eventRepo.create(data);
    return res.status(201).json({
      success: true,
      message: `Event "${newEvent.name}" created successfully!`,
      data: newEvent,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create event', error: error.message });
  }
};

/**
 * Admin: Update club event
 */
export const updateClubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await eventRepo.update(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({
      success: true,
      message: `Event "${updated.name}" updated successfully!`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update event', error: error.message });
  }
};

/**
 * Admin: Delete club event
 */
export const deleteClubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await eventRepo.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete event', error: error.message });
  }
};

/**
 * Admin: Team & Staff Management (list, create, update, delete roles)
 */
export const getStaffList = async (req, res) => {
  try {
    const staff = await staffRepo.getAll();
    return res.json({ success: true, data: staff });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff members', error: error.message });
  }
};

export const createStaffMember = async (req, res) => {
  try {
    const { username, email, name, password, role = 'event_head', assignedEventIds = [] } = req.body;
    if (!username || !email || !name || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, name, and password are required' });
    }

    const existing = await staffRepo.findByIdentifier(username);
    if (existing) {
      return res.status(400).json({ success: false, message: `User with username "${username}" already exists` });
    }

    const created = await staffRepo.createStaff({
      username,
      email,
      name,
      password,
      role,
      assignedEventIds,
    });

    const { passwordHash, ...safe } = created;
    return res.status(201).json({
      success: true,
      message: `Staff account for "${name}" (${role}) created successfully!`,
      data: safe,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create staff account', error: error.message });
  }
};

export const updateStaffMember = async (req, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;
    const updated = await staffRepo.updateStaff(username, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    return res.json({
      success: true,
      message: `Staff member "${username}" updated successfully!`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update staff member', error: error.message });
  }
};

export const deleteStaffMember = async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUser = String(username || '').toLowerCase().trim();
    if (cleanUser === 'adityarenake') {
      return res.status(403).json({ success: false, message: 'The Main Event Organizer / Root Founder (Aditya Renake) cannot be deleted.' });
    }
    await staffRepo.deleteStaff(cleanUser);
    return res.json({ success: true, message: `Access revoked and staff member "${cleanUser}" removed successfully!` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete staff member', error: error.message });
  }
};

export const purgeAllStaffExceptOwner = async (req, res) => {
  try {
    const allStaff = await staffRepo.getAll();
    let count = 0;
    for (const st of allStaff) {
      const u = String(st.username || '').toLowerCase().trim();
      if (u !== 'adityarenake') {
        await staffRepo.deleteStaff(u);
        count++;
      }
    }
    return res.json({
      success: true,
      message: `Access revoked for all other accounts (${count} staff members removed). Only Aditya Renake retains access.`,
      count,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to purge staff accounts', error: error.message });
  }
};
