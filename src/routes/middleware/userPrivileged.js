const User = require("../../models/User.model");
const UserData = require("../../models/UserData.model");
const mergeUpdate = require("./mergeUpdate");
const { ERRORMSG } = require("../../errors/index");

module.exports = async (req, res, next) => {
  // checks if the user is logged in when trying to access a specific page
  if (
    !req.headers.name || req.headers.name === "null" ||
    !req.headers.credentials || req.headers.credentials === "null",
    !req.headers.update || req.headers.update === "null"
  ) {
    return res.status(403).json({ errorMessage: "You are not logged in" });
  }
  const { name: cName, credentials: cCred, update: cUpdate } = req.headers;
  const { name, credentials } = req.ciphers.revealToken(cName, cCred);
  const users = await User.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(credentials, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return res.status(403).json({ errorMessage: "invalid token" });
  const update = req.ciphers.revealKey(cUpdate, name);
  const { _id, data } = await UserData.findById(user.data).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!data) return res.status(500).json(ERRORMSG.CTD);
  const thisUser = { 
    _id: user._id, 
    credentials: user.credentials,
    token: { cName, cCred }, 
    name:name, 
    updateKey: user.updateKey, 
    updateArg: update,
    data, 
    dataKey: _id
  };
  req.user = thisUser;
  req.user.push = (activities, update) => mergeUpdate(activities, update);
  next();
};