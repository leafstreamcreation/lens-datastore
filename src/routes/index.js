const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const User = require("../models/User.model");
const UserData = require("../models/UserData.model");

const ciphers = require("./middleware/ciphers");
router.use(ciphers);

const userPrivileged = require("./middleware/userPrivileged");
const { ERRORMSG } = require("../errors");


router.get("/", (req, res, next) => {
  res.status(200).send("Chonk");
});

const loginOk = (res, payload) => res.status(200).json(payload);

const loginHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const { credentials:cCred } = req.body;
  
  if (!cCred) return res.status(400).json(ERRORMSG.MISSINGCREDENTIALS);
  const inCreds = req.ciphers.revealInbound(cCred); 
  const users = await userModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

  const { data } = await userDataModel.findById(user.data).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!data) return res.status(500).json(ERRORMSG.CTD);
  const [name, password] = inCreds.split(process.env.CRED_SEPARATOR);

  const userToken = req.ciphers.tokenGen(name, password);
  const [update, updateKey] = req.ciphers.exportKey(user.updateKey, name);

  const userUpdating = req.app.locals.waitingUsers?.[user._id];
  if (userUpdating) {
    //handle prior login attempt
    if ("login" in userUpdating) {
      const { res:oldRes, expireId:expire } = userUpdating.login;
      oldRes.status(403).json(ERRORMSG.EXPIREDLOGIN);
      clearTimeout(expire);
    }
    const rActivities = req.ciphers.revealUserData(name, { updateArg: update, data });
    const activities = req.ciphers.obscureUserData(rActivities, name, update, true);
    const expireId = setTimeout((req, res, id) => {
      res.status(403).json(ERRORMSG.EXPIREDLOGIN);
      delete req.app.locals.waitingUsers[id].login;
    }, 1000 * 10, req, res, user._id);
    req.app.locals.waitingUsers[user._id].login = {
      res, 
      payload: {
        token: userToken, 
        activities, 
        updateKey
      },
      expireId
    };
  }
  else {
    const rActivities = req.ciphers.revealUserData(name, { updateArg: update, data });
    const activities = req.ciphers.obscureUserData(rActivities, name, update, true);
    return loginOk(res, { token: userToken, activities, updateKey });
  }
};
router.post("/login", (req, res, next) => {
  loginHandler(req, res, next, { userModel: User, userDataModel: UserData });
});
  

const signupHandler = async (req, res, next, { userModel = User, userDataModel = UserData, invitationModel = Invitation }) => {
  const { ticket:cTicket, credentials:cCred } = req.body;
  if (!cCred) return res.status(400).json(ERRORMSG.MISSINGCREDENTIALS);
  if (!cTicket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
  const ticket = req.ciphers.revealInbound(cTicket);
  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (!invitation) return res.status(403).json(ERRORMSG.INVALIDTICKET);
  const inCreds = req.ciphers.revealInbound(cCred);
  const users = await userModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const u of users) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) return res.status(403).json({ ticketRefund: cTicket });
  }
  const [name, password] = inCreds.split(process.env.CRED_SEPARATOR);
  const token = req.ciphers.tokenGen(name, password);
  const credentials = await req.ciphers.credentials(name, password).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const data = req.ciphers.obscureUserData({ activities: [], tagSets: [] }, name, 1);
  const newUserData = await userDataModel.create({ data }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const key = req.ciphers.updateKeyGen(1, name);
  await userModel.create({ credentials, data: newUserData._id, updateKey: key.local }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  await invitationModel.findByIdAndDelete(invitation._id).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const activities = req.ciphers.obscureUserData({ activities: [], tagSets: [] }, name, 1, true);
  return res.status(200).json({ token, activities, updateKey: key.out });
};
router.post("/signup", (req, res, next) => {
  signupHandler(req, res, next, { userModel: User, userDataModel: UserData, invitationModel: Invitation });
});

const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
  const { password, ticket } = req.body;
  if (!ticket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
  if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);

  const state = await stateModel.findOne().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const match = await req.ciphers.compare(password, state.adminHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!match) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (invitation) return res.status(403).json(ERRORMSG.TICKETEXISTS);
  const codeHash = await req.ciphers.credentials(ticket).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  invitationModel.create({ codeHash, expires: new Date(Date.now() + 1000 * 60 * 30) }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  return res.status(200).json({ ticket });
};
router.post("/invite", (req, res, next) => {
  inviteHandler(req, res, next, { stateModel: State, invitationModel: Invitation });
});

const updateHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const latestKey = req.ciphers.revealKey(req.user.updateKey, req.user.name, true);
  if (req.user.updateArg !== latestKey) return res.status(403).json({ selfDestruct: true });
  const cUpdate = req.body?.update;
  const id = `${req.user._id}`;
  const listeningForUpdates = id in req.app.locals.waitingUsers;
  if (!cUpdate) {
    if (listeningForUpdates) return res.status(200).json({ defer: true });
    req.app.locals.waitingUsers[id] = {};
    req.app.locals.waitingUsers[id].expireId = setTimeout((r, i) => {
      delete r.app.locals.waitingUsers[i];
    }, 1000 * 60 * 60 * 2.5, req, id);
    return res.status(200).json({ listening: true });
  }
  if (!listeningForUpdates) return res.status(200).json({ defer: true });
  const name = req.user.name;
  const rActivities = req.ciphers.revealUserData(name, req.user);
  const update = req.ciphers.revealInbound(cUpdate, true);
  const newActivities = req.user.push(rActivities, update);
  const updateKey = latestKey + 1;
  const data = req.ciphers.obscureUserData(newActivities, name, updateKey);
  const { out:outKey, local:localKey } = req.ciphers.updateKeyGen(updateKey, name);
  //update data and updatekey
  const writeNewKey = userModel.findByIdAndUpdate(req.user._id, { updateKey: localKey }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const writeNewData = userDataModel.findByIdAndUpdate(req.user.dataKey, { data }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const [ updatedKey, updatedData ] = await Promise.all([writeNewKey, writeNewData]);
  if (!updatedKey || !updatedData) return res.status(500).json(ERRORMSG.CTD);
  const userWaiting = req.app.locals.waitingUsers[id].login;
  if (userWaiting) {
    const { res: loginRes } = req.app.locals.waitingUsers[id].login;
    const activities = req.ciphers.obscureUserData(newActivities, name, updateKey, true);
    loginOk(loginRes, { token: req.user.token, activities, updateKey });
    clearTimeout(req.app.locals.waitingUsers[id].login.expireId);
    delete req.app.locals.waitingUsers[id].login;
  }
  clearTimeout(req.app.locals.waitingUsers[id].expireId);
  delete req.app.locals.waitingUsers[id];
  return res.status(200).json({ updateKey: outKey });
};
router.post("/update", userPrivileged, (req, res, next) => {
  updateHandler(req, res, next, { userModel: User, userDataModel: UserData });
});

module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };