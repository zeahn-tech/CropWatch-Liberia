const fs = require('fs');
let code = fs.readFileSync('server/apiRouter.ts', 'utf8');

const newEndpoint = `
apiRouter.post('/admin/users/invite', requireAuth, requireRoles('admin'), async (req, res) => {
  const { fullName, email, password, role, county, organization, qualification, yearsExperience } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      error: 'Full name, email, password, and role are required.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.getUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: \`usr_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
    email: normalizedEmail,
    fullName: fullName.trim(),
    role: role,
    county: county || 'Bong',
    organization,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  if (newUser.role === 'expert' || newUser.role === 'senior_expert') {
    db.addExpertProfile({
      userId: newUser.id,
      fullName: newUser.fullName,
      organization: organization || 'Independent Consultant',
      qualification: qualification || 'BSc Agronomy',
      yearsExperience: Number(yearsExperience) || 2,
      verificationStatus: 'pending', // admin must still verify this profile if they want to approve it separately, or we could set it to verified if admin creates it, but instructions say: "must still go through the existing verificationStatus: 'pending' -> admin verification flow". So we keep it pending.
      specialties: ['General Agronomy', 'Crop Protection'],
      casesReviewedCount: 0,
      avgResponseHours: 0,
    });
  }

  res.json({
    success: true,
    user: db.getSafeUser(newUser),
  });
});

`;

code = code.replace("apiRouter.post('/auth/logout'", newEndpoint + "apiRouter.post('/auth/logout'");
fs.writeFileSync('server/apiRouter.ts', code);
