const Doctor = require("../models/doctorModel");
const Appointment = require("../models/appointmentModel");
const { startOfDay, endOfDay, isBefore, isAfter } = require("date-fns");

// Function to validate time format (HH:mm)
const isValidTimeFormat = (time) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

// Controller to create a new doctor
const createDoctor = async (req, res) => {
    try {
        const { name, workingHours, specialization } = req.body;

        // Check if name is provided
        if (!name) {
            return res.status(400).json({ error: "Doctor name is required" });
        }

        // Validate working hours format
        if (workingHours) {
            if (
                !isValidTimeFormat(workingHours.start) ||
                !isValidTimeFormat(workingHours.end)
            ) {
                return res
                    .status(400)
                    .json({ error: "Invalid working hours format. Use HH:mm" });
            }
        }

        // Create doctor record
        const newDoctor = new Doctor({
            name,
            workingHours: workingHours || { start: "09:00", end: "17:00" },
            specialization,
        });

        await newDoctor.save();
        res.status(201).json({
            message: "Doctor added successfully",
            doctor: newDoctor,
        });
    } catch (error) {
        console.error("Error adding doctor:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.cookie("Jwt_test", "jwt_testValue");
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

function generateSlots(doctor, givenDate, appointments) {
    const slots = [];
    const interval = 30; // minutes
    const [startH, startM] = doctor.workingHours.start.split(":").map(Number);
    const [endH, endM] = doctor.workingHours.end.split(":").map(Number);

    const workingHourStart = new Date(givenDate); //  it means  doctor available at this time
    workingHourStart.setHours(startH, startM, 0, 0);

    const workingHourEnd = new Date(workingHourStart); //   it means  doctor not available at this time
    workingHourEnd.setHours(endH, endM, 0, 0);

    let slotStartTime = new Date(workingHourStart);

    while (workingHourStart < workingHourEnd) {
        // let slotStart it is the new slot starting time

        const slotEndTime = new Date(
            slotStartTime.getTime() + interval * 60000
        ); // new slot end time
        if (slotEndTime > workingHourEnd) break;

        // compare the new slot with every existing slots appointments Array , this array from get the all available appointments for a doctor
        // if all are true  that means no overlapping at start time and end time
        const isAvailable = appointments.every((app) => {
            const appStart = app.date;
            const appEnd = new Date(app.date.getTime() + app.duration * 60000);
            return slotStartTime >= appEnd || slotEndTime <= appStart;
            // check Start after a booked appointment ends, OR
            // check End before a booked appointment starts.
        });

        if (isAvailable) slots.push(slotStartTime.toISOString());
        slotStartTime = new Date(slotStartTime.getTime() + interval * 60000);
    }

    return slots;
}

const getAvailableSlotsForADoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ error: "Doctor not found" });

        const givenDate = new Date(req.query.date + "T00:00Z"); // UTC date
        if (isNaN(givenDate))
            return res.status(400).json({ error: "Invalid date" });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (givenDate < today) {
            return res
                .status(400)
                .json({ error: "Cannot book appointments for past dates" });
        }

        const tillDate = new Date(today);
        tillDate.setDate(today.getDate() + 7); // Add 7 days
        tillDate.setHours(0, 0, 0, 0);

        if (givenDate > tillDate) {
            return res.status(400).json({
                error: `Cannot book appointments beyond ${
                    tillDate.toISOString().split("T")[0]
                }`,
            });
        }

        const startOfDay = new Date(givenDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(givenDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingAppointments = await Appointment.find({
            doctorId: doctor._id,
            date: { $gte: startOfDay, $lte: endOfDay },
        });
        // greter then start date and lessthen end Date
        // console.log(existingAppointments);
        const slots = generateSlots(doctor, givenDate, existingAppointments);
        res.json({ doctor, slots });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllAppointments = async (req, res) => {
    try {
        const allAppointments = await Appointment.find().populate("doctorId");

        if (!allAppointments || allAppointments.length === 0) {
            return res.status(404).json({ error: "No appointments found" });
        }

        res.status(200).json(allAppointments);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
};

const getSpecificAppointments = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const appointment = await Appointment.findById(appointmentId).populate(
            "doctorId"
        );

        if (!appointment) {
            return res.status(404).json({ error: "No appointments found" });
        }

        res.status(200).json({ appointment });
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log(error.message);
    }
};

const postAppointment = async (req, res) => {
    try {
        const {
            doctorId,
            date,
            duration,
            patientName,
            appointmentType,
            notes,
        } = req.body;

        // Validate required fields
        const requiredFields = [
            "doctorId",
            "date",
            "duration",
            "patientName",
            "appointmentType",
        ];
        if (requiredFields.some((field) => !req.body[field])) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate date format
        const appointmentStart = new Date(date);
        if (isNaN(appointmentStart)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        // Validate duration
        if (typeof duration !== "number" || duration < 15 || duration > 240) {
            return res.status(400).json({
                error: "Invalid duration (15-240 minutes allowed)",
            });
        }

        // Calculate appointment end time (UTC)
        const appointmentEnd = new Date(
            appointmentStart.getTime() + duration * 60000
        );

        // Fetch doctor with working hours
        const doctor = await Doctor.findById(doctorId)
            .select("workingHours name")
            .lean();

        if (!doctor) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        if (
            !doctor.workingHours ||
            !doctor.workingHours.start ||
            !doctor.workingHours.end
        ) {
            return res
                .status(400)
                .json({ error: "Doctor's working hours not available" });
        }

        // Parse working hours (UTC)
        const [startH, startM] = doctor.workingHours.start
            .split(":")
            .map(Number);
        const [endH, endM] = doctor.workingHours.end.split(":").map(Number);

        // Create working hour boundaries
        const workStart = new Date(appointmentStart);
        workStart.setUTCHours(startH, startM, 0, 0);

        const workEnd = new Date(appointmentStart);
        workEnd.setUTCHours(endH, endM, 0, 0);

        // Handle overnight shifts
        if (isBefore(workEnd, workStart)) {
            workEnd.setUTCDate(workEnd.getUTCDate() + 1);
        }

        // Validate against working hours
        if (
            isBefore(appointmentStart, workStart) ||
            isAfter(appointmentEnd, workEnd)
        ) {
            return res.status(400).json({
                error: "Outside working hours",
                workingHours: {
                    start: doctor.workingHours.start,
                    end: doctor.workingHours.end,
                },
            });
        }

        // Find existing appointments for the same day (UTC)
        const existingAppointments = await Appointment.find({
            doctorId,
            date: {
                $gte: startOfDay(appointmentStart),
                $lte: endOfDay(appointmentStart),
            },
        }).select("date duration");

        // Check for overlapping appointments
        const hasConflict = existingAppointments.some((existing) => {
            const existingStart = existing.date;
            const existingEnd = new Date(
                existingStart.getTime() + existing.duration * 60000
            );

            return (
                isBefore(existingStart, appointmentEnd) &&
                isAfter(existingEnd, appointmentStart)
            );
        });

        if (hasConflict) {
            return res.status(409).json({
                error: "Time slot unavailable",
                suggestion: "Please choose a different time",
            });
        }

        // Create and save appointment
        const newAppointment = await Appointment.create({
            doctorId,
            date: appointmentStart,
            duration,
            patientName,
            appointmentType,
            notes,
        });

        // Populate doctor details
        await newAppointment.populate("doctorId");

        res.status(201).json({ newAppointment });
    } catch (error) {
        console.error(`[Appointment Error] ${error.message}`);
        res.status(500).json({ error: `Booking failed ${error}` });
    }
};

const updateAppointment = async (req, res) => {
    try {
        const { date, duration } = req.body;
        const appointmentId = req.params.id;

        // Find the appointment by ID
        const appointment = await Appointment.findById(appointmentId).populate(
            "doctorId"
        );
        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        //  Validate & convert date
        const newStart = new Date(date);
        if (isNaN(newStart)) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        //  Calculate new appointment end time
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        //  Validate against doctor's working hours
        const [startH, startM] = appointment.doctorId.workingHours.start
            .split(":")
            .map(Number);
        const [endH, endM] = appointment.doctorId.workingHours.end
            .split(":")
            .map(Number);

        const workingStart = new Date(newStart);
        workingStart.setHours(startH, startM, 0, 0);

        const workingEnd = new Date(newStart);
        workingEnd.setHours(endH, endM, 0, 0);

        if (newStart < workingStart || newEnd > workingEnd) {
            return res.status(400).json({
                error: "Appointment time is outside doctor's working hours",
                workingHours: appointment.doctorId.workingHours,
            });
        }

        //  Check for overlapping appointments (excluding current appointment)
        const existingAppointments = await Appointment.find({
            doctorId: appointment.doctorId,
            _id: { $ne: appointmentId }, // Exclude current appointment
            date: {
                $gte: new Date(newStart.setHours(0, 0, 0, 0)),
                $lte: new Date(newStart.setHours(23, 59, 59, 999)),
            },
        });

        const hasConflict = existingAppointments.some((existing) => {
            const existingStart = existing.date;
            const existingEnd = new Date(
                existingStart.getTime() + existing.duration * 60000
            );

            return newStart < existingEnd && newEnd > existingStart;
        });

        if (hasConflict) {
            return res
                .status(400)
                .json({ error: "New time slot is already booked" });
        }

        //  Update appointment details
        appointment.date = newStart;
        appointment.duration = duration;
        await appointment.save();

        res.status(200).json({
            appointment,
        });
    } catch (error) {
        res.status(500).json({
            error: `Update failed ${error.message}`,
        });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        // Find the appointment by ID and delete it
        const deletedAppointment = await Appointment.findByIdAndDelete(
            appointmentId
        );

        // If appointment does not exist, return 404 error
        if (!deletedAppointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        res.status(200).json({
            message: "Appointment canceled successfully",
            appointment: deletedAppointment,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
module.exports = {
    createDoctor,
    getAllDoctors,
    getAllAppointments,
    getAvailableSlotsForADoctor,
    getSpecificAppointments,
    postAppointment,
    updateAppointment,
    deleteAppointment,
};
