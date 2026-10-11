
const ROLE_PERMISSIONS = {
    student: ["quiz:attempt", "materials:read"],
    instructor: [
      "quiz:attempt",
      "materials:read",
      "materials:create",
      "materials:update",
      "quiz:create",
      "quiz:publish",
    ],
    admin: ["*"],
  };
  
  function requireRole(...allowedRoles) {
    return (req, res, next) => {
      // The authentication layer must set req.user.
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }
  
      if (!ROLE_PERMISSIONS[req.user.role]) {
        return res.status(403).json({
          error: "Invalid user role",
        });
      }
  
      if (
        !allowedRoles.includes(req.user.role) &&
        !allowedRoles.includes("*")
      ) {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }
  
      next();
    };
  }
  
  function requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }
  
      const permissions = ROLE_PERMISSIONS[req.user.role];
  
      if (
        !permissions ||
        (!permissions.includes("*") && !permissions.includes(permission))
      ) {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }
  
      next();
    };
  }
  
  module.exports = {
    ROLE_PERMISSIONS,
    requireRole,
    requirePermission,
  };
  