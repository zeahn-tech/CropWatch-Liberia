const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

const rateLimitCode = `
const loginAttempts = new Map<string, { count: number; expires: number }>();
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (process.env.NODE_ENV !== 'test') {
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.expires > now) {
      if (attempt.count >= 5) {
        return res.status(429).json({ success: false, error: 'Too many login attempts. Please try again later.' });
      }
    }
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.getUserByEmail(normalizedEmail);
  if (!user || !user.passwordHash) {
    if (process.env.NODE_ENV !== 'test') {
      const attempt = loginAttempts.get(ip);
      if (attempt && attempt.expires > now) {
        attempt.count += 1;
      } else {
        loginAttempts.set(ip, { count: 1, expires: now + 15 * 60 * 1000 }); // 15 mins
      }
    }
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    if (process.env.NODE_ENV !== 'test') {
      const attempt = loginAttempts.get(ip);
      if (attempt && attempt.expires > now) {
        attempt.count += 1;
      } else {
        loginAttempts.set(ip, { count: 1, expires: now + 15 * 60 * 1000 }); // 15 mins
      }
    }
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }
  if (process.env.NODE_ENV !== 'test') {
    loginAttempts.delete(ip); // Reset on success
  }
`;

// I'll just rewrite the apiRouter.ts post auth login manually
