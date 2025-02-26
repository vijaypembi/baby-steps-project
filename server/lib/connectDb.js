const mongoose = require("mongoose");

const connectDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_BABY_STEPS_URI);

        console.log(`MongoDB connected: ${conn.connection.host}`);
        // return conn; // Return the connection object (optional)
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1); // Exit the app if DB connection fails
    }
};

module.exports = connectDb;
