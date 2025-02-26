const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor ID is required"],
        },
        date: {
            type: Date,
            required: [true, "Appointment date is required"],
        },
        duration: {
            type: Number,
            required: [true, "Duration is required"],
            min: [30, "Minimum appointment duration is 30 minutes"],
        },
        patientName: {
            type: String,
            required: [true, "Patient name is required"],
            trim: true,
        },
        appointmentType: {
            type: String,
            required: [true, "Appointment type is required"],
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [500, "Notes cannot exceed 500 characters"],
        },
    },
    {
        timestamps: true,
    }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
