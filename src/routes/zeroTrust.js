import { requireAuth, requirePermission, requireRole } from '../middleware/auth.js';
import { ZeroTrustConfig } from '../models/ZeroTrustConfig.js';

async function getOrCreateConfig() {
  let cfg = await ZeroTrustConfig.findOne();
  if (!cfg) {
    cfg = await ZeroTrustConfig.create({});
  }
  return cfg;
}

export function registerZeroTrustRoutes(router) {
  router.get('/zero-trust/config', requireAuth, requirePermission(['ZT_VIEW', 'ZT_MANAGE']), async (_req, res, next) => {
    try {
      const cfg = await getOrCreateConfig();
      res.json({
        id: cfg._id.toString(),
        mfaRequired: cfg.mfaRequired,
        mfaRequiredForAdmins: cfg.mfaRequiredForAdmins,
        maxLoginFails: cfg.maxLoginFails,
        trustScoreThreshold: cfg.trustScoreThreshold,
        allowExternalIP: cfg.allowExternalIP,
        alertOnNewDevice: cfg.alertOnNewDevice,
        ipWhitelist: cfg.ipWhitelist,
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
    requirePermission(['ZT_MANAGE']),
    async (req, res, next) => {
      try {
        const cfg = await getOrCreateConfig();
        const {
          mfaRequired,
          mfaRequiredForAdmins,
          maxLoginFails,
          trustScoreThreshold,
          allowExternalIP,
          alertOnNewDevice,
          ipWhitelist,
          deviceTrustThreshold,
          geofencingEnabled
        } = req.body;

        if (mfaRequired !== undefined) cfg.mfaRequired = mfaRequired;
        if (mfaRequiredForAdmins !== undefined) cfg.mfaRequiredForAdmins = mfaRequiredForAdmins;
        if (maxLoginFails !== undefined) cfg.maxLoginFails = maxLoginFails;
        if (trustScoreThreshold !== undefined) cfg.trustScoreThreshold = trustScoreThreshold;
        if (allowExternalIP !== undefined) cfg.allowExternalIP = allowExternalIP;
        if (alertOnNewDevice !== undefined) cfg.alertOnNewDevice = alertOnNewDevice;
        if (ipWhitelist !== undefined) cfg.ipWhitelist = ipWhitelist;
        if (deviceTrustThreshold !== undefined) cfg.deviceTrustThreshold = deviceTrustThreshold;
        if (geofencingEnabled !== undefined) cfg.geofencingEnabled = geofencingEnabled;

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

