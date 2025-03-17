const jwt = require('jsonwebtoken');
function isAuthenticated(req, res, next) {
  try {
    const { token } = req?.cookies;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'User is not authenticated'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'User is not authenticated'
      })
    }

    req.user = decoded;

    next();


  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = isAuthenticated;