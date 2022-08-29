const bcrypt = require("bcryptjs");
const saltRounds = 13;

const CryptoJS = require("crypto-js");


module.exports = (req, res, next) => {

  const credentials = async (name, password) => {
    const salt = await bcrypt.genSalt(saltRounds);
    const creds = name + (password ? process.env.CRED_SEPARATOR + password : "");
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };

  const join = (name, password) => {
    return name + (password ? process.env.CRED_SEPARATOR + password : "");
  };

  const tokenGen = (name, password, mutator = join) => {
    const encName = CryptoJS.AES.encrypt(name, `${process.env.APP_SIGNATURE + process.env.OUTBOUND_NAME}`);
    const nameToken = encName.toString();
    const literal = mutator(name, password);
    const encCred = CryptoJS.AES.encrypt(literal, name + `${process.env.APP_SIGNATURE + process.env.OUTBOUND_CRED}`);
    const credToken = encCred.toString();
    return { name:nameToken, credentials:credToken };
  }

  const revealToken = (cName, cCred) => {
    const name = CryptoJS.AES.decrypt(cName, `${process.env.APP_SIGNATURE + process.env.OUTBOUND_NAME}`).toString(CryptoJS.enc.Utf8);
    const credentials = CryptoJS.AES.decrypt(cCred, name + `${process.env.APP_SIGNATURE + process.env.OUTBOUND_CRED}`).toString(CryptoJS.enc.Utf8);
    return { name, credentials };
  };
  
  const revealInbound = (cString, update = false) => {
    if (!update) return CryptoJS.AES.decrypt(cString, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    const decData = CryptoJS.enc.Base64.parse(cString).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  }
  
  const obscureUserData = (activities, name, updateKey, outbound = false) => {
    const key = `${name}${outbound ? process.env.OUTBOUND_ACTIVITIES : process.env.APP_SIGNATURE}${updateKey}`;
    if (!activities) return "";
    const jsonString = JSON.stringify(activities);
    const encJson = CryptoJS.AES.encrypt(jsonString, key);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return encData;
  };
  
  const revealKey = (cKeyIn, name, local = false) => {
    const literal = CryptoJS.AES.decrypt(cKeyIn, name + `${process.env.APP_SIGNATURE}${local ? process.env.LOCAL_KEY : process.env.OUTBOUND_KEY}`).toString(CryptoJS.enc.Utf8);
    return parseInt(literal);
  };
  
  const updateKeyGen = (literal, name) => {
    const litStr = `${literal}`;
    const out = CryptoJS.AES.encrypt(litStr, name + `${process.env.APP_SIGNATURE + process.env.OUTBOUND_KEY}`).toString();
    const local = CryptoJS.AES.encrypt(litStr, name + `${process.env.APP_SIGNATURE + process.env.LOCAL_KEY}`).toString();
    return { out, local };
  };
  
  const matchUpdateKey = (keyIn, cuKey, name) => {
    const localLiteral =  CryptoJS.AES.decrypt(cuKey, name + `${process.env.APP_SIGNATURE + process.env.LOCAL_KEY}`).toString(CryptoJS.enc.Utf8);
    const literal = parseInt(localLiteral);
    return keyIn === literal;
  };
  
  const exportKey = (cuKey, name) => {
    const localLiteral =  CryptoJS.AES.decrypt(cuKey, name + `${process.env.APP_SIGNATURE + process.env.LOCAL_KEY}`).toString(CryptoJS.enc.Utf8);
    const exported = CryptoJS.AES.encrypt(localLiteral, name + `${process.env.APP_SIGNATURE + process.env.OUTBOUND_KEY}`).toString();
    return [ parseInt(localLiteral), exported];
  }
  
  const revealUserData = (name, user) => {
    const key = `${name}${process.env.APP_SIGNATURE}${user.updateArg}`;
    const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  req.ciphers = { 
    obscureUserData, 
    revealUserData, 
    tokenGen, 
    revealToken, 
    revealInbound, 
    credentials, 
    compare,
    revealKey,
    updateKeyGen,
    matchUpdateKey,
    exportKey,
   };
  next();
};