// We reuse this import in order to have access to the `body` property in requests
const express = require("express");

// ℹ️ Responsible for the messages you see in the terminal as requests are coming in
// https://www.npmjs.com/package/morgan
const logger = require("morgan");

// ℹ️ Needed to accept requests from 'the outside'. CORS stands for cross origin resource sharing
// unless the request if from the same domain, by default express wont accept POST requests
const cors = require("cors");

const helmet = require("helmet");


// Middleware configuration
module.exports = (app) => {
  // In development environment the app logs
  app.use(logger("dev"));

  const safeList = [ process.env.ORIGIN, process.env.PHONE_ORIGIN ];

  // controls a very specific header to pass headers from the frontend
  app.use(
    cors({
      credentials: true,
      origin: function (origin, callback) {
        if (safeList.indexOf(origin) !== -1 || (process.env.DEV && !origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    })
  );

  app.use(helmet());

  // To have access to `body` property in the request
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
};
