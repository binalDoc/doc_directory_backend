const jwt = require("jsonwebtoken");
const config = require("../config/config");

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized: No token provided" })

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Attach user to request
        req.user = decoded.user;

        next();

    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
}

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user || !allowedRoles.includes(user.role)) return res.status(403).json({ message: "Forbidden: Access denied" });
            next();

        } catch (error) {
            return res.status(500).json({ message: "Unauthorized" });
        }
    };
};

module.exports = {
    authenticate,
    authorizeRoles
}