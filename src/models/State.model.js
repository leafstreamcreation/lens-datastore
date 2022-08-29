const {Schema, model} = require("mongoose");

const stateSchema = new Schema({
    adminHash: {type: String, required: true },
});

const State = model("State", stateSchema);

module.exports = State;