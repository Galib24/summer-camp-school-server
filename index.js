require('dotenv').config()
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


// mongodb part

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z8yqdyj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const dbConnect = async () => {
    try {
        client.connect();
        console.log("Database Connected Successfully✅");

    } catch (error) {
        console.log(error.name, error.message);
    }
}
dbConnect()



const usersCollection = client.db('summerDb').collection('users')
const instructorsCollection = client.db('summerDb').collection('instructors')
const classItemsCollection = client.db('summerDb').collection('classItems')
const reviewsCollection = client.db('summerDb').collection('reviews')
const enrolledCollection = client.db('summerDb').collection('enrolled')
const paymentsCollection = client.db('summerDb').collection('payments')



app.get('/', (req, res) => {
    res.send('summer camp running')
})


app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
    res.send({ token })
})


const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' })
    }
    next();

}








// users related apis

// deleted user
app.delete('/users/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
})


// get user from data base
app.get('/users', async (req, res) => {
    const result = await usersCollection.find().toArray()
    res.send(result);
})


// create user
app.post('/users', async (req, res) => {
    const user = req.body;
    console.log(user);

    // query for find one user which already exist for google login
    const query = { email: user.email }
    const existingUser = await usersCollection.findOne(query);
    // console.log('existing user', existingUser);
    if (existingUser) {
        return res.send({ message: 'user already exist' })
    }
    const result = await usersCollection.insertOne(user)
    res.send(result);

})
// get admin who are
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if (req.decoded.email !== email) {
        res.send({ admin: false })
        return
    }

    const query = { email: email }
    const user = await usersCollection.findOne(query);
    const result = { admin: user?.role === 'admin' }
    // console.log(result);
    res.send(result);

})
// modify users role admin
app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            role: 'admin'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
})



// get instructor from users
app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if (req.decoded.email !== email) {
        res.send({ instructor: false })
    }

    const query = { email: email }
    const user = await usersCollection.findOne(query);
    const result = { instructor: user?.role === 'instructor' }
    res.send(result);
})
// modify users role instructor
app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            role: 'instructor'
        },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
})


// instructors function
app.get('/instructors', async (req, res) => {
    const result = await instructorsCollection.find().toArray();
    res.send(result);
})
// instructor item added
app.post('/classItems', async (req, res) => {
    const newItem = req.body;
    console.log(newItem);
    const result = await classItemsCollection.insertOne(newItem);
    res.send(result);

})


// instructor item get
app.get('/classItems', async (req, res) => {
    const result = await classItemsCollection.find().toArray();
    res.send(result);
})


app.get('/reviews', async (req, res) => {
    const result = await reviewsCollection.find().toArray();
    res.send(result);
})


// enrolled users function

// get all item
app.get('/enrolled', verifyJWT, async (req, res) => {
    const email = req.query.email;

    if (!email) {
        res.send([])
        return
    }

    const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
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

// create payment intent and all function here
app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = price * 100;
    const paymentIntent = await stripe.paymentIntents.create({

        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });
    res.send({
        clientSecret: paymentIntent.client_secret
    });
})

// payment api
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    res.send(result);
})

app.get('/payments', async (req, res) => {
    const result = await paymentsCollection.find().toArray();
    res.send(result);
})








app.listen(port, () => {
    console.log(`summer camp running on port ${port}`);
})