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
          members: t.members || [],
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/teams', requireAuth, async (req, res, next) => {
    try {
      const { name, managerId } = req.body;
      const team = await Team.create({ name, managerId });
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
}

