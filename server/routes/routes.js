const express = require("express");
const {
    getAllDoctors,
    getAllAppointments,
    getAvailableSlotsForADoctor,
    getSpecificAppointments,
    postAppointment,
    updateAppointment,
    deleteAppointment,
    createDoctor,
} = require("../controllers/controllers");
const router = express.Router();

router.post("/doctors", createDoctor);
router.get("/doctors", getAllDoctors); // Get all doctors
router.get("/doctors/:id/slots", getAvailableSlotsForADoctor); // Get available slots for a doctor on a specific date

// http://localhost:5000/api/appointments/67bb5655ea17e91add704491
router.get("/appointments", getAllAppointments); // post doctors appointments
router.get("/appointments/:id", getSpecificAppointments);
router.post("/appointments", postAppointment);
router.put("/appointments/:id", updateAppointment);
router.delete("/appointments/:id", deleteAppointment);
module.exports = router;
