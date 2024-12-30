const express = require('express');
require('dotenv').config();
const path = require('path');
const userRoutes = require('./routes/user'); 
const bodyParser = require('body-parser');
const session = require('express-session');
const nocache = require('nocache');
const mongoose = require('mongoose');
const adminRoutes = require("./routes/admin")
const Razorpay = require('razorpay');
const flash = require('connect-flash');
const app = express();

const dbURI = process.env.DB_URI;
// Connect to MongoDB
mongoose.connect(dbURI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB:', err));

// Set view engine
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 

const razorpay = new Razorpay({
    key_id : "rzp_test_ULiN3Z9C2M5zyq",
    key_secret : "XS57sRiXC907AyNP9sNdeqTS"  
})


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static('public')); 
app.use('/uploads', express.static('uploads'));


app.use(nocache());
 
app.use(session({
    secret: 'my-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        maxAge: 3600000,
    }
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session && req.session.userId ? true : false;
    next();
});

// Use user routes
app.use('/', userRoutes); 
app.use("/admin",adminRoutes)

app.use((req,res,next)=>{
    res.render("error")
})


const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
 