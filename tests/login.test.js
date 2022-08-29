require("dotenv/config");
const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { loginHandler: login } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");
const SEPARATOR = process.env.CRED_SEPARATOR;

describe("Spec for login route", () => {
  
    test("login with valid credentials returns userId, json data, and nextUpdateKey", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });
        const req = MockReq({ name, password });
        const res = MockRes();
        
        const u2Creds = name + SEPARATOR + password
        const user2 = { _id: 2, credentials: u2Creds, data: 2, updateKey: 1 };
        expect(instance.userModel.users["2"]).toEqual(user2);
        expect(instance.userDataModel.entries["2"].data).toEqual([]);
        expect(Object.values(instance.userModel.users).length).toBe(2);
    
        await login(req, res, null, instance);
        const loginResponse = { token: { name, credentials: user2.credentials }, activities: [], updateKey: 1 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(loginResponse);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(u2Creds);
        expect(req.ciphers.compare).toHaveBeenCalledWith(u2Creds, instance.userModel.users["1"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledWith(u2Creds, instance.userModel.users["2"].credentials);
        expect(req.ciphers.tokenGen).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.exportKey).toHaveBeenCalledWith(instance.userModel.users["2"].updateKey, name);
        expect(req.ciphers.revealActivities).toHaveBeenCalledWith(name, { updateKey: instance.userModel.users["2"].updateKey, data: instance.userDataModel.entries["2"].data });
        expect(req.ciphers.obscureActivities).toHaveBeenCalledWith([], name, 1, true);
    });

    test("login with invalid credentials returns errors", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const noCred = MockReq({ name, password: null });
        const noCredRes = MockRes();
        await login(noCred, noCredRes, null, instance);
        expect(noCredRes.status).toHaveBeenCalledWith(400);
        expect(noCredRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGCREDENTIALS);

        const badPass = MockReq({ name, password: "foobar" });
        const badPassRes = MockRes();
        await login(badPass, badPassRes, null, instance);
        expect(badPassRes.status).toHaveBeenCalledWith(403);
        expect(badPassRes.json).toHaveBeenCalledWith(ERRORMSG.INVALIDCREDENTIALS);
    });

    test("login waits for updates to complete", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const u2Creds = name + SEPARATOR + password
        const req = MockReq({ name, password }, {}, null, { "2": {} });
        const res = MockRes();

        expect("login" in req.app.locals.waitingUsers["2"]).toBe(false);

        await login(req, res, null, instance);

        expect("login" in req.app.locals.waitingUsers["2"]).toBe(true);
        expect(req.app.locals.waitingUsers["2"].login.res).toEqual(res);
        expect(req.app.locals.waitingUsers["2"].login.payload).toEqual({ token:{ name, credentials: u2Creds }, activities: [], updateKey: 1 });
        expect("expireId" in req.app.locals.waitingUsers["2"].login).toBe(true);

        clearInterval(req.app.locals.waitingUsers["2"].login.expireId);
        
        expect(res.json).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});