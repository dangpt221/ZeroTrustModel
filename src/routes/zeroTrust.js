import { requireAuth, requireRole } from '../middleware/auth.js';
import { ZeroTrustConfig } from '../models/ZeroTrustConfig.js';

async function getOrCreateConfig() {
  let cfg = await ZeroTrustConfig.findOne();
  if (!cfg) {
    cfg = await ZeroTrustConfig.create({});
  }
  return cfg;
}

export function registerZeroTrustRoutes(router) {
  router.get('/zero-trust/config', requireAuth, async (_req, res, next) => {
    try {
      const cfg = await getOrCreateConfig();
      res.json({
        id: cfg._id.toString(),
        mfaRequiredForAdmins: cfg.mfaRequiredForAdmins,
        deviceTrustThreshold: cfg.deviceTrustThreshold,
        geofencingEnabled: cfg.geofencingEnabled,
      });
    } catch (err) {
      next(err);
    }
  });

  router.put(
    '/zero-trust/config',
    requireAuth,
    requireRole(['ADMIN']),
    async (req, res, next) => {
      try {
        const cfg = await getOrCreateConfig();
        cfg.mfaRequiredForAdmins =
          req.body.mfaRequiredForAdmins ?? cfg.mfaRequiredForAdmins;
        cfg.deviceTrustThreshold =
          req.body.deviceTrustThreshold ?? cfg.deviceTrustThreshold;
        cfg.geofencingEnabled =
          req.body.geofencingEnabled ?? cfg.geofencingEnabled;
        await cfg.save();
        res.json({
          id: cfg._id.toString(),
        });
      } catch (err) {
        next(err);
      }
    },
  );
}

