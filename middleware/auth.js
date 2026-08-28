exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'גישה מותנית בהתחברות למערכת' });
};

exports.requireRole = (role) => {
  return (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === role) {
      return next();
    }
    return res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
  };
};