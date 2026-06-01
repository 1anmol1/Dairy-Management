const ipLimits = new Map();
const phoneLimits = new Map();

module.exports = {
  ipLimits,
  phoneLimits,
  pairingRateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { phone } = req.body;

    const now = Date.now();

    // 1. IP Rate Limiting check (1 request per 2 minutes = 120,000 ms)
    if (ip) {
      const lastIpRequest = ipLimits.get(ip);
      if (lastIpRequest) {
        const diff = now - lastIpRequest;
        if (diff < 120000) {
          const retryAfter = Math.ceil((120000 - diff) / 1000);
          console.warn(`[RATE LIMIT] IP limit hit by ${ip}. Retrying in ${retryAfter}s.`);
          res.set('Retry-After', String(retryAfter));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Too many pairing requests from this IP. Please try again after ${retryAfter} seconds.`,
            retryAfter
          });
        }
      }
    }

    // 2. Phone validation & Rate Limiting check (1 request per 90 seconds = 90,000 ms)
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid phone number is required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid phone number is required.' });
    }

    const lastPhoneRequest = phoneLimits.get(cleanPhone);
    if (lastPhoneRequest) {
      const diff = now - lastPhoneRequest;
      if (diff < 90000) {
        const retryAfter = Math.ceil((90000 - diff) / 1000);
        console.warn(`[RATE LIMIT] Phone limit hit for ${cleanPhone}. Retrying in ${retryAfter}s.`);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Too many pairing requests for this phone number. Please try again after ${retryAfter} seconds.`,
          retryAfter
        });
      }
    }

    // Pass validated values forward
    req.cleanPhone = cleanPhone;
    req.clientIp = ip;
    next();
  }
};
