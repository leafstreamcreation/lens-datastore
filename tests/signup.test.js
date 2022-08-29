require("dotenv/config");
const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { signupHandler: signup } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");
const SEPARATOR = process.env.CRED_SEPARATOR;

describe("Spec for signup route", () => {
  
    test("signup with valid invitation and credentials returns userId, json data, and nextUpdateKey", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const ticket = "ABCD";
        const invitations = [
            { ticket: "WXYZ", expires  },
            { ticket, expires }
        ];
        const instance =  MockDB({ invitations });
        const name = "RacquelettaMoss";
        const password = "secret123";
        const credentials = name + SEPARATOR + password;
        const req = MockReq({ ticket, name, password });
        const res = MockRes();
        
        const invitation2 = { _id: 2, codeHash: ticket, expires };
        expect(instance.invitationModel.invitations[1]).toEqual(invitation2);
        expect(instance.invitationModel.invitations.length).toBe(2);
        expect(Object.values(instance.userModel.users).length).toBe(0);
    
        await signup(req, res, null, instance);
        const signupResponse = { token: { name, credentials }, activities: [], updateKey: "1" };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(signupResponse);

        const newUser = { _id: 1, credentials, data: 1, updateKey: "1" };
        expect(instance.userModel.users["1"]).toEqual(newUser);
        expect(instance.userDataModel.entries["1"].data).toEqual([]);
        expect(instance.invitationModel.invitations[0]).toEqual({ _id: 1, codeHash: "WXYZ", expires });
        expect(instance.invitationModel.invitations.length).toBe(1);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(ticket);
        expect(req.ciphers.compare).toHaveBeenCalledWith(ticket, ticket);
        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(name + SEPARATOR + password);
        expect(req.ciphers.compare).toHaveBeenCalledTimes(2);
        expect(req.ciphers.compare).not.toHaveBeenCalledWith(credentials, credentials);
        expect(req.ciphers.tokenGen).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.credentials).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.obscureActivities).toHaveBeenCalledWith([], name, 1);
        expect(req.ciphers.obscureActivities).toHaveBeenCalledWith([], name, 1, true);
        expect(req.ciphers.updateKeyGen).toHaveBeenCalledWith(1, name);
    });

    test("signup with invalid credentials returns errors", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const ticket = "ABCD";
        const invitations = [
            { ticket: "WXYZ", expires  },
            { ticket, expires }
        ];
        const name = "RacquelettaMoss";
        const password = "secret123";
        const users = [ { name, password } ];
        
        const instance =  MockDB({ invitations, users });
        
        const dbInvitations = [
            { _id:1, codeHash: "WXYZ", expires  },
            { _id:2, codeHash: ticket, expires }
        ];
        expect(instance.invitationModel.invitations).toEqual(dbInvitations);
        
        const noTicket = MockReq({ ticket: null, name, password });
        const noTicketRes = MockRes();
        await signup(noTicket, noTicketRes, null, instance);
        expect(noTicketRes.status).toHaveBeenCalledWith(400);
        expect(noTicketRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGTICKET);


        const noCred = MockReq({ ticket, name: null, password });
        const noCredRes = MockRes();
        await signup(noCred, noCredRes, null, instance);
        expect(noCredRes.status).toHaveBeenCalledWith(400);
        expect(noCredRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGCREDENTIALS);


        const badTicket = MockReq({ ticket: "BEEF", name, password });
        const badTicketRes = MockRes();
        await signup(badTicket, badTicketRes, null, instance);
        expect(badTicketRes.status).toHaveBeenCalledWith(403);
        expect(badTicketRes.json).toHaveBeenCalledWith(ERRORMSG.INVALIDTICKET);


        const badcreds = MockReq({ ticket, name, password });
        const badcredsRes = MockRes();
        await signup(badcreds, badcredsRes, null, instance);
        expect(badcredsRes.status).toHaveBeenCalledWith(403);
        expect(badcredsRes.json).toHaveBeenCalledWith({ ticketRefund: ticket });


        expect(instance.invitationModel.invitations).toEqual(dbInvitations);
        expect(Object.values(instance.userModel.users).length).toBe(1);
    });
});