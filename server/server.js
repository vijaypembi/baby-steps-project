const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const route = require("./routes/routes.js");
const connectDb = require("./lib/connectDb.js");
const dotenv = require("dotenv");
const port = process.env.PORT || 5000;

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true })); // Allow cookies in CORS
app.use(express.json());

app.use(cookieParser());

dotenv.config();
app.use("/api/", route);

connectDb().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
