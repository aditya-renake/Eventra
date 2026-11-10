import { eventRepo } from '../models/eventRepo.js';
import { staffRepo } from '../models/staffRepo.js';
import { publicEvent, publicEventConfig, publicCatalogHeaders } from '../utils/publicEvent.js';
import { createShortCache } from '../utils/shortCache.js';

const publicCache = createShortCache({ ttlMs: 5000, maxEntries: 100 });

/**
 * Public & Staff: Get all club events (Fresh real-time response)
 */
export const getClubEvents = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filters = { category, status, search };
    const events = await publicCache.get(`events:${JSON.stringify(filters)}`, async () => (await eventRepo.getAll(filters)).map(publicEvent));
    publicCatalogHeaders(req, res);
    return res.json({ success: true, data: events });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to fetch events' });
  }
};

/**
 * Public: Get single event details by eventId (Fresh real-time response)
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventItem = await publicCache.get(`event:${id}`, () => eventRepo.findById(id));
    if (!eventItem) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    publicCatalogHeaders(req, res);
    return res.json({ success: true, data: publicEvent(eventItem) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to fetch event' });
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
    publicCache.clear();
    return res.status(201).json({
      success: true,
      message: `Event "${newEvent.name}" created successfully!`,
      data: newEvent,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to create event' });
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
    publicCache.clear();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({
      success: true,
      message: `Event "${updated.name}" updated successfully!`,
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to update event' });
  }
};

/**
 * Admin: Delete club event
 */
export const deleteClubEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await eventRepo.delete(id);
    publicCache.clear();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to delete event' });
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
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to fetch staff members' });
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
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to create staff account' });
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
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to update staff member' });
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
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to delete staff member' });
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
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to purge staff accounts' });
  }
};

/**
 * Admin: Set event as the Flagship Event for homepage
 */
export const setFlagshipEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const targetEvent = await eventRepo.setFlagship(id);
    publicCache.clear();
    if (!targetEvent) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({
      success: true,
      message: `"${targetEvent.name}" is now the Flagship Event on the homepage!`,
      data: targetEvent,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to set flagship event' });
  }
};

/**
 * Public: Get dynamic event configuration (Registration Mode, Ticket Prices, Gateway)
 */
export const getEventConfig = async (req, res) => {
  try {
    const config = await publicCache.get('config', async () => {
      const { configRepo } = await import('../models/configRepo.js');
      return publicEventConfig(await configRepo.getConfig());
    });
    publicCatalogHeaders(req, res);
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to fetch event configuration' });
  }
};

/**
 * Admin: Update event configuration (Pricing, Credentials & Intake Settings)
 */
export const updateEventConfig = async (req, res) => {
  try {
    const { configRepo } = await import('../models/configRepo.js');
    const updates = req.body;
    const updated = await configRepo.updateConfig(updates);
    publicCache.clear();
    return res.json({
      success: true,
      message: 'Event configuration updated successfully!',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code, message: error.statusCode && error.statusCode < 500 ? error.message : 'Failed to update event configuration' });
  }
};

// Private staff editing endpoints always bypass shared caches.
export const getAdminEventConfig = async (req, res, next) => {
  try {
    const { configRepo } = await import('../models/configRepo.js');
    return res.json({ success: true, data: await configRepo.getConfig() });
  } catch (error) { next(error); }
};

export const getAdminClubEvents = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    return res.json({ success: true, data: await eventRepo.getAll({ category, status, search }) });
  } catch (error) { next(error); }
};
