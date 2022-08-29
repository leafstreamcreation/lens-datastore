module.exports = {
  ERRORMSG: {
    CTD: { msg: "Unexpected error; investigation required" },
    MISSINGCREDENTIALS: { msg: "missing credentials" },
    MISSINGTICKET: { msg: "missing ticket" },
    MISSINGPASSWORD: { msg: "missing password" },
    INVALIDCREDENTIALS: { msg: "invalid credentials" },
    INVALIDTICKET: { msg: "invalid ticket" },
    TICKETEXISTS: { msg: "ticket already exists" },
    EXPIREDLOGIN: { msg: "login request expired" },
  },
  handleErrors: (app) => {
    app.use((req, res, next) => {
      // this middleware runs whenever requested page is not available
      res.status(404).json({errorMessage: "Endpoint not found"});
    });
  
    app.use((err, req, res, next) => {
      // whenever you call next(err), this middleware will handle the error
      // always logs the error
      console.error("ERROR: ", req.method, req.path, err);
  
      // only render if the error ocurred before sending the response
      if (!res.headersSent) {
        res.status(500).res.json({ errorMessage: err.message });
      }
    });
  }
};