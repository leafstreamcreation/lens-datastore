require("dotenv/config");
const User = require("../src/models/User.model");
const UserData = require("../src/models/UserData.model");

const addCryptoFunctions = require("../src/routes/middleware/ciphers");
const { ERRORMSG } = require("../src/errors");


describe("Spec for crypto functions", () => {
    
    test("revealActivities and obscureActivities reverse each other", async () => {
        const x = await require("../src/db");
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const emptyData = req.ciphers.obscureActivities([], "Test1", 1);
        const newEmptyData = await UserData.create({ data: emptyData });
        const newUser = { token: "Test1", credentials: "TestPass1", data: newEmptyData._id, updateKey: 1 };
        const emptyActsUser = await User.create(newUser);
        const later = await User.findById(emptyActsUser._id).exec();
        const emptyId = later.data;
        const { data:laterEmptyData } = await UserData.findById(emptyId).exec();
        const popEmpty = { _id: later._id, credentials: later.credentials, token: later.token, data: laterEmptyData, updateArg: later.updateKey }
        const emptyActsResult = req.ciphers.revealActivities("Test1", popEmpty);
        await User.findByIdAndDelete(emptyActsUser._id).exec();
        await UserData.findByIdAndDelete(emptyId).exec();
        expect(emptyActsResult).toEqual([]);
        
        
        const activities = [
            { id: 1, name: "running", history: [{}], group: 0 },
            { id: 2, name: "biking", history: [{}], group: 0 }
        ];
        const data = req.ciphers.obscureActivities(activities, "Test", 1);
        const newData = await UserData.create({ data });
        const newUser2 = { token: "Test", credentials: "TestPass", data:newData._id, updateKey: 1 };
        const user = await User.create(newUser2);
        const after = await User.findById(user._id).exec();
        const id = after.data;
        const { data:afterData } = await UserData.findById(id).exec();
        const pop = { _id: after._id, credentials: after.credentials, token: after.token, data: afterData, updateArg: after.updateKey }
        const result = req.ciphers.revealActivities("Test", pop);
        await User.findByIdAndDelete(user._id).exec();
        await UserData.findByIdAndDelete(id).exec();
        x.connections[0].close();

        expect(result).toEqual(activities);
    });
    
    test("tokenGen and revealToken reverse each other", () => {
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);
        const mutator = x => x;

        const name = "Derek";
        const { name: cName, credentials: cCred } = req.ciphers.tokenGen(name, null, mutator);
        const tokenOut = req.ciphers.revealToken(cName, cCred);
        expect(tokenOut.name).toBe(name);

    });
    
    test("revealKey reveals outward update key", () => {
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const name = "Derek";
        const literal = 1;
        const { out } = req.ciphers.updateKeyGen(literal, name);
        const value = req.ciphers.revealKey(out, name);
        expect(value).toBe(1);
    });
    
    test("matchUpdateKey compares for equality", () => {
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const name = "Derek";
        const literal = 1;
        const { local } = req.ciphers.updateKeyGen(literal, name);
        const goodRes = req.ciphers.matchUpdateKey(1, local, name);
        expect(goodRes).toBe(true);
        const badRes = req.ciphers.matchUpdateKey(2, local, name);
        expect(badRes).toBe(false);
    });
    
    test("exportKey converts a local key to an outbound key", () => {
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const name = "Derek";
        const literal = 1;
        const key = req.ciphers.updateKeyGen(literal, name);
        const [ value, outKey] = req.ciphers.exportKey(key.local, name);
        const out = req.ciphers.revealKey(outKey, name);
        expect(out).toBe(1);
        expect(value).toBe(1);
    });
});