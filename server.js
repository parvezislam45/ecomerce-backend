const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 7000;

// --------MiddleWire------------

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads') // specify the upload directory
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const uri =
  "mongodb+srv://aurthohinparvez2:Lp31ngSaPwngIi2g@cluster0.oap4niv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const productCollection = client.db("ecomerce").collection("product");
    const userCollection = client.db("user").collection("allUser");
    const roleProductCollection = client
      .db("roleProduct")
      .collection("allRoleProduct");
    const orderCollection = client.db("order").collection("allOrder");
  
    app.get("/product", async (req, res) => {
      let query = {}; // Initialize an empty query object
      
      // Check if discountPercentage query parameter exists and is a valid number
      if (req.query.discountPercentage && !isNaN(parseInt(req.query.discountPercentage))) {
          const discountPercentage = parseInt(req.query.discountPercentage);
          query = {
              "discount.percentage": discountPercentage
          };
      }
  
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
  });
  
    
  app.get("/product/:id", async (req, res) => {
      
    const id = req.params.id;
    const result = await productCollection.findOne({ _id:new ObjectId(id) });
    res.send(result);
  });
    
    app.get("/product/user/:email", async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const users = await productCollection.find(query).toArray();
      res.send(users);
    });
    
    app.post("/product", upload.single('image'), async (req, res) => {
      try {
        const status = req.body.status || 'pending';
        const newProduct = {
          userName: req.body.userName,
          name: req.body.name,
          email: req.body.email,
          description: req.body.description,
          category: req.body.category,
          price: req.body.price,
          image: req.file.filename,
          status: status
        };
      
        const result = await productCollection.insertOne(newProduct);
        res.send(result);
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
      }
    });

    app.put("/product/:id", upload.single('image'), async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: {} };
    
        // Update product details
        if (data.name) updateDoc.$set.name = data.name;
        if (data.description) updateDoc.$set.description = data.description;
        if (data.price) updateDoc.$set.price = data.price;
        if (data.category) updateDoc.$set.category = data.category;
        if (req.file) updateDoc.$set.image = req.file.filename; 
        const existingProduct = await productCollection.findOne(filter);
        if (req.file && existingProduct.image) {
          fs.unlinkSync(path.join(__dirname, 'uploads', existingProduct.image)); 
        }
        // Handle discount
        if (data.discount) {
          const discountPercentage = parseInt(data.discount);
          if (!isNaN(discountPercentage) && discountPercentage > 0 && discountPercentage <= 100) {
            const discountedPrice = data.price - (data.price * discountPercentage) / 100;
            updateDoc.$set.discount = { discountPercentage };
            updateDoc.$set.price = discountedPrice;
          }
        }
        updateDoc.$set.status = "pending";
        const result = await productCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount === 0) {
          return res.status(500).send("Failed to update product");
        }
    
        res.send("Product updated successfully");
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Error updating product");
      }
    });
    
    
    app.get("/discount", async (req, res) => {
      try {
        const discountPercentage = parseInt(req.query.discountPercentage);
        const products = await productCollection.find({ "discount.discountPercentage": discountPercentage }).toArray();
        res.json(products);
      } catch (error) {
        console.error('Error fetching discounted products:', error);
        res.status(500).send("Error fetching discounted products");
      }
    });
    app.put('/product/:id/approve', async (req, res) => {
      const productId = req.params.id;
      try {
        const result = await productCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { status: 'approved' } }
        );
        if (result.modifiedCount === 0) {
          res.status(200).json({ message: 'Product approved successfully.' });
        } else {
          res.status(404).json({ message: 'Product not found.' });
        }
      } catch (error) {
        console.error('Error approving product:', error);
        res.status(500).json({ message: 'Error approving product.' });
      }
    });

  app.get('/product/pending', async (req, res) => {
    try {
        const pendingProducts = await productCollection.find({ status: 'pending' }).toArray();
        res.status(200).json(pendingProducts);
    } catch (error) {
        console.error('Error fetching pending products:', error);
        res.status(500).json({ message: 'Error fetching pending products.' });
    }
});

app.put("/product/:id/reject", async (req, res) => {
  const productId = req.params.id;
  const result = await productCollection.updateOne(
    { _id: new ObjectId(productId) },
    { $set: { status: "reject" } }
  );

  res.send(result);
});
    // ---------------------- User --------------------------------

    app.put("/admin/approve/:userId", async (req, res) => {
      const userId = req.params.userId;
      const { role } = req.body;
      try {
        const updatedUser = await userCollection.findOneAndUpdate(
          { _id: new ObjectId(userId) },
          { $set: { role, status: "success" } },
          { returnDocument: "after" }
        );
        res.send(updatedUser);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });



app.post("/user", upload.array('images', 2), async (req, res) => {
  try {
    const status = req.body.status || 'pending';
    const newUser = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      company: req.body.company,
      district: req.body.district,
      address: req.body.address,
      images: req.files.map(file => file.filename),
      status: status
    };
  
    const result = await userCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
});



    app.get("/user", async (req, res) => {
      try {
          const users = await userCollection.find().toArray();
          res.send(users);
      } catch (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
      }
  });

    app.put("/user/:id/approve", async (req, res) => {
      const roleId = req.params.id;
      const newRole = req.body.role;
    
      try {
        const query = { _id: new ObjectId(roleId), status: "pending" };
        const result = await userCollection.updateOne(
          query,
          { $set: { status: "success", role: newRole } }
        );
    
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Role approved successfully." });
        } else {
          res.status(404).send({ success: false, message: "Role not found or already approved." });
        }
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: "Internal server error." });
      }
    });
    
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    app.put("/user/:id/reject", async (req, res) => {
      const roleId = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(roleId) },
        { $set: { status: "reject" } }
      );

      res.send(result);
    });

    app.get("/admin/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
    
        // Check if user exists
        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }
    
        // Check if the user is an admin
        const isAdmin = user.role === "admin";
        res.send({ admin: isAdmin });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });;
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const user = await userCollection.findOne({ email: email });
        res.send(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send({ error: 'Internal server error' });
      }
    });
    
    // Route to determine if the user is a vendor
    app.get("/vendor/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const user = await userCollection.findOne({ email: email });
        const isVendor = user && user.role === "vendor";
        res.send({ vendor: isVendor });
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send({ error: 'Internal server error' });
      }
    });

    // -------------------------Order-------------------------
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order)
      res.send(result)
    })

    app.get("/order", async (req, res) => {
      const users = await orderCollection.find().toArray();
      res.send(users);
    });
    app.get("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id:new ObjectId(id) }
      const orders = await orderCollection.findOne(query);
      res.send(orders)
    })
    app.get("/order/user/:email", async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const users = await orderCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/category", async (req, res) => {
      const categoryName = req.query.name;
      const query = { category: categoryName };
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Alhamdulliah Your server is Running");
});
app.listen(port, () => {
  console.log("Alhamdullilah Your server is Start");
});
