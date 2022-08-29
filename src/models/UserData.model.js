const {Schema, model} = require("mongoose");

const userDataSchema = new Schema({
    data: { type: String, required: true }
});

const UserData = model("UserData", userDataSchema);

module.exports = UserData;