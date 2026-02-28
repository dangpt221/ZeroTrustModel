import { requireAuth } from '../middleware/auth.js';
import { Team } from '../models/Team.js';

export function registerTeamRoutes(router) {
  router.get('/teams', requireAuth, async (_req, res, next) => {
    try {
      const teams = await Team.find().lean();
      res.json(
        teams.map((t) => ({
          id: t._id.toString(),
          name: t.name,
          managerId: t.managerId,
          members: (t.members || []).map(m => m?.toString?.() || m),
          description: t.description || '',
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/teams', requireAuth, async (req, res, next) => {
    try {
      const { name, description, managerId } = req.body;
      const team = await Team.create({ name, description: description || '', managerId });
      res.status(201).json({ id: team._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.post('/teams/:teamId/members', requireAuth, async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { userId } = req.body;
      const team = await Team.findByIdAndUpdate(
        teamId,
        { $addToSet: { members: userId } },
        { new: true },
      );
      res.json({ id: team._id.toString(), members: team.members });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/teams/:teamId', requireAuth, async (req, res, next) => {
    try {
      const { teamId } = req.params;
      if (!teamId) return res.status(400).json({ message: 'Team ID is required' });
      const team = await Team.findByIdAndDelete(teamId);
      if (!team) return res.status(404).json({ message: 'Team not found' });
      res.json({ success: true });
    } catch (err) {
      if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      next(err);
    }
  });
}

