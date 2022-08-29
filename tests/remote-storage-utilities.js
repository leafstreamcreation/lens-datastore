const { keyBy } = require("lodash");
const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

class StateModel {

  constructor(pass = "admin123") {
    this.adminHash = pass;
  }

  findOne() {
    return {
      exec: () => {
        return Promise.resolve(this);
      }
    };
  }

  save() {
    return Promise.resolve();
  }
}



class InvitationModel {

  constructor(invitations = []) {
    this.currentId = 1;
    this.invitations = [];
    invitations.forEach(({ ticket = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) => {
        this.invitations.push({ _id: this.currentId, codeHash: ticket, expires: expires });
        this.currentId += 1;
    });
  }

  create({ codeHash = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) {
        const newInvitation = { _id: this.currentId, codeHash: codeHash, expires: expires }
        this.currentId += 1;
        this.invitations.push(newInvitation);
        return Promise.resolve({ ...newInvitation });
  }

  find() {
      return {
        exec: () => {
            return Promise.resolve([...this.invitations]);
        }
      };
  }

  findByIdAndDelete(id) {
    return {
      exec: () => {
        const invObj = keyBy(this.invitations, "_id");
        delete invObj[`${id}`]
        this.invitations = Object.values(invObj);
        return Promise.resolve(Object.values(invObj));
      }
    };
  }
}



class UserModel {

  constructor(users = [], ) {
    this.currentId = 1;
    const userArray = [];
    users.forEach(({ name, password }) => {
        const credentials = name + "/-/" + password;
        userArray.push({ _id: this.currentId, credentials, updateKey: 1, data: this.currentId });
        this.currentId += 1;
    });
    this.users = keyBy(userArray, "_id");
  }

  create({ credentials, data, updateKey = 1 }) {
      for (const { credentials: oldCredentials } of Object.values(this.users)) {
        if ( oldCredentials === credentials) return Promise.resolve(null);
      }
      const newUser = { _id: this.currentId, credentials, updateKey , data };
      this.users[`${this.currentId}`] = newUser;
      this.currentId += 1;
    return Promise.resolve({ ...newUser });
  }

  find() {
    return {
      exec: () => {
        return Promise.resolve(Object.values(this.users));
      }
    };
  }

  findByIdAndUpdate(id, { updateKey }) {
    return {
      exec: () => {
        const user = this.users[`${id}`];
        if (!user) return Promise.resolve(null);
        user.updateKey = updateKey || user.updateKey;
        this.users[`${id}`] = user;
        return Promise.resolve({...user});
      }
    };
  }

}

class UserDataModel {
  constructor(num) {
    this.currentId = 0;
    if (!num) this.entries = {};
    const dataArray = [];
    for (let i = 0; i < num; i++) {
      this.currentId += 1;
      dataArray.push({ _id: this.currentId, data: [] });
    }
    this.entries = num ? keyBy(dataArray, "_id") : {};
  }

  create({ data = [] }) {
    this.currentId += 1;
    this.entries[`${this.currentId}`] = { _id: this.currentId, data };
    return Promise.resolve({ _id: this.currentId, data });
  }

  findById(id) {
    return {
      exec: () => {
        const entry = this.entries[`${id}`];
        if (!entry) return Promise.resolve(null);
        return Promise.resolve({...entry});
      }
    }
  }
  
  findByIdAndUpdate(id, { data }) {
    return {
      exec: () => {
        const entry = this.entries[`${id}`];
        if (!entry) return Promise.resolve(null);
        this.entries[`${id}`].data = data;
        return Promise.resolve({...entry});
      }
    }
  }
}

const MockDB = (seed = {}) => {
  const { state, invitations, users } = seed;
  const stateModel = new StateModel(state);
  const invitationModel = new InvitationModel(invitations);
  const userModel = new UserModel(users);
  const userDataModel = new UserDataModel(users ? users.length : 0);
  return { stateModel, invitationModel, userModel, userDataModel };
};

const MockReq = ({ ticket, name, password, update }, user = {}, updateKey = null, waitlist = {}) => {
  const { _id, userModel, userDataModel } = user;  
  const req = { 
        headers: {},
        ciphers: {
            obscureActivities: jest.fn((w,x,y,z) => w),
            revealActivities: jest.fn((x, { data }) => data),
            tokenGen: jest.fn((x,y) => { return {name: x, credentials: x + "/-/" + y}; }),
            revealToken: jest.fn((x,y) => { return {name: x, credentials: x + "/-/" + y}; }),
            revealInbound: jest.fn(x => x),
            credentials: jest.fn((x,y) => Promise.resolve(x + (y ? "/-/" + y : ""))),
            compare: jest.fn((x,y) => Promise.resolve(x===y)),
            revealKey: jest.fn((x,y) => parseInt(x)),
            updateKeyGen: jest.fn((x,y) => { return { out:`${x}`, local:`${x}` }; }),
            matchUpdateKey: jest.fn((x,y,z) => {
              const yI = parseInt(y);
              return x === yI;
            }),
            exportKey: jest.fn((x,y) => [parseInt(x), x]),
        },
        app: { locals: { waitingUsers: waitlist }}
    };
    if (name || password || ticket || update) req.body = {};
    if (ticket) req.body.ticket = ticket;
    if (name && password) req.body.credentials = name + "/-/" + password;
    else if (password) req.body.password = password;
    if (update) req.body.update = update;
    if (_id && userModel) { 
      req.user = { ...userModel.users[`${_id}`] };
      const c = userModel.users[`${_id}`].credentials;
      const cs = c.split("/-/");
      const t = { name: cs[0], credentials: c };
      req.user.push = jest.fn((x, y) => mergeUpdate(x, y));
      req.headers.name = name;
      req.headers.credentials = req.user.credentials;
      req.user.token = t;
      req.user.dataKey = req.user.data;
      req.user.name = t.name;
      req.user.data = userDataModel.entries[`${_id}`].data;
      req.user.updateArg = updateKey;
    }
    if (updateKey !== null) req.headers.update = `${updateKey}`;
    return req;
};

const MockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = { MockDB, MockReq, MockRes };