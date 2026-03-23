const jwt = require("jsonwebtoken");

const config = require("../config/config");

const generateJWTToken = (user) => {
    const { password, ...safeUser } = user;
    const token = jwt.sign(
        {user: safeUser},
        config.jwtSecret,
        {expiresIn : config.jwtUserExpire}
    );

    return token;
}

module.exports = {
    generateJWTToken
}