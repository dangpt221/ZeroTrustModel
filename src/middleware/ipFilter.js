import geoip from 'geoip-lite';
import ipaddr from 'ipaddr.js';
import { ZeroTrustConfig } from '../models/ZeroTrustConfig.js';

let configCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getConfig() {
  const now = Date.now();
  if (configCache && now - lastCacheTime < CACHE_TTL) {
    return configCache;
  }
  configCache = await ZeroTrustConfig.findOne() || new ZeroTrustConfig();
  lastCacheTime = now;
  return configCache;
}

export const ipFilterMiddleware = async (req, res, next) => {
  try {
    const config = await getConfig();

    // Nếu cho phép mọi IP ngoại vi và không bật chặn quốc tế -> cho qua luôn
    if (config.allowExternalIP && !config.geoBlockingEnabled) {
      return next();
    }

    const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
    if (!rawIp) return next();

    let clientIp;
    try {
      clientIp = ipaddr.process(rawIp);
    } catch (err) {
      console.warn('[IP_FILTER] Invalid IP format:', rawIp);
      return res.status(403).json({ message: 'Forbidden: Invalid IP Address' });
    }

    const clientIpString = clientIp.toString();
    const range = clientIp.range();

    // Always allow loopback (localhost) requests to prevent locking out local development & internal services
    if (range === 'loopback') {
      return next();
    }

    // 1. IP WHITELIST CHECK (INTRANET)
    if (!config.allowExternalIP) {
      let isWhitelisted = false;
      for (const allowRule of config.ipWhitelist) {
        try {
          if (allowRule.includes('/')) {
            const parsedCidr = ipaddr.parseCIDR(allowRule);
            // Đảm bảo cùng loại ipv4 / ipv6
            if (clientIp.kind() === parsedCidr[0].kind() && clientIp.match(parsedCidr)) {
              isWhitelisted = true;
              break;
            }
          } else {
            const parsedAllow = ipaddr.process(allowRule);
            if (clientIp.kind() === parsedAllow.kind() && clientIpString === parsedAllow.toString()) {
              isWhitelisted = true;
              break;
            }
          }
        } catch (err) {
          // Ignore invalid rules in DB
        }
      }

      if (!isWhitelisted) {
        console.warn(`[IP_FILTER] Blocked IP ${clientIpString} -> Not in Intranet Whitelist`);
        return res.status(403).json({ 
          error: 'Access Denied', 
          message: 'IP address lies outside the allowed corporate network perimeter (Extranet blocked).' 
        });
      }
    }

    // 2. GEO-BLOCKING CHECK (QUỐC TẾ)
    if (config.geoBlockingEnabled) {
      // geoip-lite only works with plain ipv4 / ipv6, clientIpString is fine
      // but localhost (127.0.0.1 or ::1) or private IPs will return null geo data
      const geo = geoip.lookup(clientIpString);
      
      // Nếu là IP nội bộ (localhost, 192.168.x.x), geo sẽ là null. Ta cho phép IP nội bộ.
      const range = clientIp.range();
      const isPrivateOrLoopback = range === 'private' || range === 'loopback' || range === 'uniqueLocal';

      if (!isPrivateOrLoopback) {
        const countryCode = geo ? geo.country : 'UNKNOWN';
        const allowedCountries = config.allowedCountries || ['VN'];

        if (!allowedCountries.includes(countryCode)) {
          console.warn(`[IP_FILTER] Blocked Geo IP ${clientIpString} (${countryCode}) -> Not in Allowed Countries`);
          return res.status(403).json({ 
            error: 'Access Denied', 
            message: `Service is not available in your region (${countryCode}).` 
          });
        }
      }
    }

    next();
  } catch (err) {
    console.error('[IP_FILTER] Error:', err);
    // On error, let request pass to prevent blocking everyone due to DB issue, or block? 
    // Usually fail-close is better for zero-trust, but fail-open prevents total outage. We'll fail-close here.
    return res.status(500).json({ error: 'Internal Server Error enforcing zero-trust policies' });
  }
};
