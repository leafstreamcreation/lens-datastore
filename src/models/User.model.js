const {Schema, model} = require("mongoose");
const ObjectId = Schema.Types.ObjectId;


const userSchema = new Schema({
    credentials: { type: String, required: true, unique: true },
    updateKey: { type: String, required: true },
    data: { type: ObjectId, required: true, ref: "UserData" },
});

const User = model("User", userSchema);

module.exports = User;