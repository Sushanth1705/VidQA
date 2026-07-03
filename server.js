import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

const users = [
    {
        email: "sushanth@gmail.com",
        password: "1234"
    },
    {
        email: "rahul@gmail.com",
        password: "4321"
    }
];

// Login page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// VidQA page
app.get("/vidqa", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Login API
app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if (user) {
        return res.status(200).json({
            message: "Login Successful"
        });
    }

    return res.status(401).json({
        message: "Invalid Email or Password"
    });
});

// Serve CSS and JS files
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/styles.css", (req, res) => {
    res.sendFile(path.join(__dirname, "styles.css"));
});

app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});