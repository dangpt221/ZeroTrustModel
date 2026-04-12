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
    
    // 🛡️ ZERO TRUST EXEMPTIONS: Cho phép truy cập các route xác thực từ bên ngoài 
    // để người dùng có thể thực hiện đăng nhập và xác minh danh tính.
    const publicPaths = [
      '/api/auth/google',
      '/api/auth/google/callback',
      '/api/auth/login',
      '/api/auth/register'
    ];

    if (publicPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    // Nếu cho phép mọi IP ngoại vi và không bật chặn quốc tế -> cho qua luôn
    if (config.allowExternalIP && !config.geoBlockingEnabled) {
      return next();
    }

    const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
    
    let clientIp;
    try {
      clientIp = ipaddr.process(rawIp);
    } catch (err) {
      console.warn('[IP_FILTER] Invalid IP format:', rawIp);
      return res.status(403).json({ message: 'Forbidden: Invalid IP Address' });
    }

    // NORMALIZE: If it's an IPv4-mapped IPv6 address (::ffff:x.x.x.x), convert to IPv4
    const clientIpString = clientIp.kind() === 'ipv6' && clientIp.isIPv4MappedAddress() 
      ? clientIp.toIPv4Address().toString() 
      : clientIp.toString();
    
    const processedIp = ipaddr.process(clientIpString);

    console.log(`[IP_DEBUG] Client IP detected: ${rawIp} -> Normalized: ${clientIpString} (Kind: ${processedIp.kind()})`);
    console.log(`[IP_DEBUG] config.allowExternalIP: ${config.allowExternalIP}, Whitelist size: ${config.ipWhitelist?.length}`);

    const range = processedIp.range();

    // Always allow loopback (localhost) requests to prevent locking out local development & internal services
    if (range === 'loopback') {
      return next();
    }

    // 1. IP WHITELIST CHECK (INTRANET)
    if (!config.allowExternalIP) {
      let isWhitelisted = (range === 'loopback');

      if (!isWhitelisted) {
        for (let allowRule of config.ipWhitelist || []) {
          try {
            allowRule = allowRule.trim();
            if (allowRule.includes('/')) {
              const parsedCidr = ipaddr.parseCIDR(allowRule);
              if (processedIp.kind() === parsedCidr[0].kind() && processedIp.match(parsedCidr)) {
                console.log(`[IP_DEBUG] Match found (CIDR): ${allowRule}`);
                isWhitelisted = true;
                break;
              }
            } else {
              const parsedAllow = ipaddr.process(allowRule);
              const normalizedAllow = parsedAllow.kind() === 'ipv6' && parsedAllow.isIPv4MappedAddress()
                ? parsedAllow.toIPv4Address().toString()
                : parsedAllow.toString();
              
              if (clientIpString === normalizedAllow) {
                console.log(`[IP_DEBUG] Match found (Static): ${allowRule}`);
                isWhitelisted = true;
                break;
              }
            }
          } catch (err) {
            console.warn(`[IP_DEBUG] Error parsing rule ${allowRule}:`, err.message);
          }
        }
      }

      if (!isWhitelisted) {
        console.warn(`[IP_FILTER] Blocked IP ${clientIpString} -> Not in Whitelist. Whitelist rules checked: ${config.ipWhitelist?.join(', ')}`);
        return res.status(403).json({ 
          error: 'Access Denied', 
          message: 'IP address lies outside the allowed corporate network perimeter (Extranet blocked).',
          yourIp: clientIpString
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
