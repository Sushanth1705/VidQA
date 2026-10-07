import express from "express";

const app = express();
const PORT = 3000;

app.use(express.static("."));
app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

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

app.get("/", (req, res) => {
    res.sendFile("login.html", {
        root: process.cwd()
    });
});

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const user = users.find(
        u => u.email === email && u.password === password
    );
    if (user) {
        res.status(200).json({
            message: "Login successful"
        });
    } else {
        res.status(401).json({
            message: "Invalid Credentials"
        });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});