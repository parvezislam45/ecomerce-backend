const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const port = process.env.PORT || 7000;


// --------MiddleWire------------
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://aurthohinparvez2:Lp31ngSaPwngIi2g@cluster0.oap4niv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {

    try{
        await client.connect();
        const productCollection = client.db("ecomerce").collection("product");
        const userCollection = client.db("user").collection("allUser")

        app.get("/product", async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
          });
          app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const result = await productCollection.findOne({ _id:new ObjectId(id) });
            res.send(result);
          });


          // ---------------------- User --------------------------------
          app.post("/register", async (req, res) => {
            const { username, password, email, role } = req.body;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newUser = { email, username, password: hashedPassword, role };
            const result = await userCollection.insertOne(newUser);
            res.send(result);
        });

        app.get("/register", async (req, res) => {
          const query = {};
          const cursor = userCollection.find(query);
          const users = await cursor.toArray();
          res.send(users);
        });
        
        app.post("/login", async (req, res) => {
            const { username, password } = req.body;
            const user = await userCollection.findOne({ username });
            if (user) {
                const match = await bcrypt.compare(password, user.password);
                if (match) {
                    res.send({ success: true, message: "Login successful", role: user.role });
                } else {
                    res.send({ success: false, message: "Invalid password" });
                }
            } else {
                res.send({ success: false, message: "User not found" });
            }
        });
        
        // Example usage of role-based authentication
        app.get("/admin/dashboard", async (req, res) => {
            const { role } = req.body;
            if (role === 'admin') {
                // Access granted for admin
                res.send("Welcome to admin dashboard!");
            } else {
                res.status(403).send("Access Forbidden");
            }
        });
        
        app.get("/vendor/dashboard", async (req, res) => {
            const { role } = req.body;
            if (role === 'vendor') {
                // Access granted for vendor
                res.send("Welcome to vendor dashboard!");
            } else {
                res.status(403).send("Access Forbidden");
            }
        });
        
        // Regular user dashboard
        app.get("/user/dashboard", async (req, res) => {
            res.send("Welcome to user dashboard!");
        });
    }
    
    finally { }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Alhamdulliah Your server is Running");
});
app.listen(port, () => {
  console.log("Alhamdullilah Your server is Start");
});