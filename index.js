const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// mongodb part


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z8yqdyj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const instructorsCollection = client.db('summerDb').collection('instructors')
        const reviewsCollection = client.db('summerDb').collection('reviews')
        const enrolledCollection = client.db('summerDb').collection('enrolled')


        // instructors function
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        })


        // enrolled users function

        // get all item
        app.get('/enrolled', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([])
            }

            const query = { email: email };
            const result = await enrolledCollection.find(query).toArray()
            // console.log(result, query);
            res.send(result);

        })
        // create to database
        app.post('/enrolled', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await enrolledCollection.insertOne(item)
            res.send(result);
        });

        // delete from data base
        app.delete('/enrolled/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await enrolledCollection.deleteOne(query);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('summer camp running')
})


app.listen(port, () => {
    console.log(`summer camp running on port ${port}`);
})