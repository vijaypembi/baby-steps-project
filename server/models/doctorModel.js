const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Doctor name is required"],
            trim: true,
            maxlength: [40, "Name cannot exceed 40 characters"],
        },
        workingHours: {
            start: {
                type: String,
                default: "09:00",
                required: true,
            },
            end: {
                type: String,
                default: "17:00",
                required: true,
            },
        },
        specialization: {
            type: String,
            trim: true,
            maxlength: [300, "Specialization cannot exceed 300 characters"],
        },
    },
    { timestamps: true }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
