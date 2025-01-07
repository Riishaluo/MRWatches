const User = require('../model/userModel');
const Category = require("../model/categoryModel");
const Product = require("../model/productModel")
const OTP = require('../model/otpSchema');
const Offer = require("../model/offerModel")
const passport = require('passport');


const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();
const saltRounds = 10; 
const STATIC_PASSWORD = "google123";

// Render login page
exports.renderLoginPage = (req, res) => {
    res.render('user/login', { message: '' });
};

// Login user function
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('user/login', { message: 'Invalid email or password.' });
        }

        
        if (user.isBlocked) {
            return res.render('user/blocked', { message: 'Your account has been blocked. Please contact support for assistance.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('user/login', { message: 'Invalid email or password.' });
        }

        req.session.userId = user._id; 
        res.redirect('/'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};

// Render user home page
exports.userHome = async (req, res) => {
    const isLoggedIn = req.session.userId ? true : false; 
    console.log('User logged in:', isLoggedIn);
    const userId = req.session.userId;

    try {
        const categories = await Category.find({ isListed: true }); 
        const products = await Product.find({ isListed: true }); 

        const productWithOffers = await Promise.all(
            products.map(async (product) => {
                let discountPrice = product.price;
                let offer = null;
        
            
                let productOffer = await Offer.findOne({
                    productId: product._id,
                    isActive: true,
                });
        
                let categoryOffer = null;
                if (!productOffer) {
                    categoryOffer = await Offer.findOne({
                        categoryId: product.category,
                        isActive: true,
                    });
                }
        
        
                let productDiscountPrice = product.price;
                if (productOffer) {
                    if (productOffer.discount.type === "fixed") {
                        productDiscountPrice = product.price - productOffer.discount.value;
                    } else if (productOffer.discount.type === "percentage") {
                        productDiscountPrice = product.price - (product.price * productOffer.discount.value) / 100;
                    }
                }
        
                let categoryDiscountPrice = product.price;
                if (categoryOffer) {
                    if (categoryOffer.discount.type === "fixed") {
                        categoryDiscountPrice = product.price - categoryOffer.discount.value;
                    } else if (categoryOffer.discount.type === "percentage") {
                        categoryDiscountPrice = product.price - (product.price * categoryOffer.discount.value) / 100;
                    }
                }
        
                discountPrice = Math.min(productDiscountPrice, categoryDiscountPrice);
        
                offer = discountPrice === productDiscountPrice ? productOffer : categoryOffer;
        
                return {
                    ...product.toObject(),
                    offer,
                    discountPrice,
                };
            })
        );
        
        res.render('user/userhome', {
            isLoggedIn,
            displayCategories: categories,
            products: productWithOffers,
            userId
        })
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};


exports.myAccount = async (req, res) => {
    try {
        const isLoggedIn = req.session.userId ? true : false;
        
        const user = isLoggedIn ? await User.findById(req.session.userId) : null;

        if (!user) {
            return res.render('user/login', { message: 'Please log in to access your account.' });
        }

        const message = req.flash('message') || '';

        res.render('user/myAccount', { isLoggedIn, user, message });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error.');
    }
};

exports.renderOtp = (req, res) => {
    const message = req.query.message;
    res.render('user/otp', { message });
};

async function sendOtp(email) {
    let digits = '0123456789';
    let otp = 0;
    for (let i = 0; i < 5; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }

    
    console.log(process.env.EMAIL)
    console.log( process.env.APP_PASS_KEY)

    console.log(`Generated OTP: ${otp}`);

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.APP_PASS_KEY,
         },
    });


    let mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error(`Error sending email: ${error}`);
        return; 
    }

    try {
        const exprTime = Date.now() + 30 * 1000; 
        const otpEntry = new OTP({
            email: email,
            otp: otp,
            exprTime: exprTime,
        });
      
        
        await otpEntry.save();
    } catch (error) {
        console.error(`Error saving OTP to database: ${error}`);
    }
}

// User signup function
exports.signupUser = async (req, res) => {
    try {
        const {email, password } = req.body;
        const user = await User.findOne({ email });
        if (user) {
           
            return res.redirect('/register?message=User already exists. Please use a different email.');
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        req.session.tempUser = {
            email,
            password: hashedPassword,
        };
        await sendOtp(email);
        req.session.tempUserEmail = email; 
        res.redirect('/otp');
    } catch (error) {
        console.error(error);
        
        return res.redirect('/register?message=An error occurred. Please try again.');
    }
};



exports.verifyOtp = async (req, res) => {
    try {
        const otp = req.body.otp;
        console.log(`Entered OTP: ${otp}`);

       
        const checkOTP = await OTP.findOne({ otp: otp, email: req.session.tempUserEmail });
        console.log(checkOTP);
        
        if (!checkOTP) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        const currentTime = Date.now();
        const exprTime = checkOTP.exprTime.getTime();

        if (currentTime > exprTime) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

       
        const tempUser = req.session.tempUser; 
        const newUser = new User({
            userName: tempUser.userName,
            email: tempUser.email,
            password: tempUser.password,
        });

        await newUser.save();

        req.session.userId = newUser._id;
        console.log(req.session.userId);
        
       
        await OTP.deleteOne({ otp: otp, email: req.session.tempUserEmail });
        delete req.session.tempUser;
        delete req.session.tempUserEmail;

       
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(`Error during OTP verification: ${error}`);
        res.status(500).json({ success: false, message: 'Something went wrong' }); // Return JSON error message
    }
};

// Resend OTP function
exports.resendOtp = async (req, res) => {
    try {
        const userEmail = req.session.tempUserEmail;
        if (!userEmail) {
            return res.redirect('/otp');
        }

        let digits = '0123456789';
        let newOtp = '';
        for (let i = 0; i < 6; i++) {
            newOtp += digits[Math.floor(Math.random() * digits.length)];
        }
        console.log(`New OTP: ${newOtp}`);

        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.APP_PASS_KEY,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL,
            to: userEmail,
            subject: 'Your New OTP Code',
            text: `Your new OTP code is ${newOtp}`,
        };

        await transporter.sendMail(mailOptions);
        console.log('New OTP email sent to: ' + userEmail);

        const exprTime = Date.now() + 30 * 1000; 
        await OTP.findOneAndUpdate(
            { email: userEmail },
            { otp: newOtp, exprTime: exprTime },
            { upsert: true } 
        );

        res.redirect('/otp');
    } catch (error) {
        console.error(`Error during OTP resend: ${error}`);
        res.redirect('/otp');
    }
};

// Render registration page
exports.renderRegisterPage = (req, res) => {
    const message = req.query.message;
    res.render('user/register', { message });
};



//forgot pass 
exports.renderForgotPassword = (req,res)=>{
    res.render("user/forgot-password")
}


exports.forgetPage = (req, res) => {
    const message = req.query.message || '';
    res.render('user/forgotOtp', { message });
};



exports.sendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('user/forgot-password', { message: 'Email not found. Please try again.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const expirationTime = new Date(Date.now() + 5 * 60 * 1000); 
        console.log("The OTP is:", otp);

        
        await OTP.create({ email, otp, exprTime: expirationTime });

        
        req.session.email = email;
        console.log('Email stored in session:', req.session.email);

     
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL, 
                pass: process.env.APP_PASS_KEY, 
            },
        });

        
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
        };

       
        await transporter.sendMail(mailOptions);

      
        res.redirect('/verify-forgot-otp'); 
    } catch (error) {
        console.error('Error sending email or saving OTP:', error);
        res.render('user/forgot-password', { message: 'Failed to send OTP. Please try again.' });
    }
};



exports.verifyForgotOtp = async (req, res) => {
    try {
        const { otp} = req.body;
        const enteredOtp = Number(otp)
        console.log( enteredOtp);
        
        const email = req.session.email; 

        console.log('Email from session during OTP verification:', email); 

        if (!email) {
            return  res.status(404).json({success:false})
        }

        const otpEntry = await OTP.findOne({ email, otp: enteredOtp });

        if (!otpEntry) {
        return  res.status(404).json({success:false})
        }

        res.status(200).json({success:true}) 
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.render('user/forgotOtp', { message: 'An error occurred while verifying the OTP. Please try again.' });
    }
};


//reset 

// Render the reset password page
exports.renderResetPassword = (req, res) => {
    res.render("user/resetPassword");
};

// Handle the password reset logic
exports.resetPassword = async (req, res) => {
    console.log('Current session:', req.session); // Log entire session object

    const { newPassword, confirmPassword } = req.body;

    // Validate that the new passwords match
    if (newPassword !== confirmPassword) {
        return res.render('user/resetPassword', { message: 'Passwords do not match. Please try again.' });
    }

    try {
        const email = req.session.email && req.session.email.trim(); // Get and trim email from session

        // Log the email for debugging
        console.log('Email from session:', email);

        if (!email) {
            return res.render('user/resetPassword', { message: 'Session expired. Please request a new OTP.' });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('user/resetPassword', { message: 'User not found. Please try again.' });
        }

       
        const hashedPassword = await bcrypt.hash(newPassword, 10);

       
        await User.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        
        delete req.session.email;

        
        res.render('user/login', { message: 'Your password has been reset successfully. Please log in with your new password.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.render('user/resetPassword', { message: 'An error occurred while resetting your password. Please try again.' });
    }
};

// Resend OTP function
exports.resendForgotOtp = async (req, res) => {
    try {
        
        const userEmail = req.session.email;
        console.log("User email for resending OTP:", userEmail);

        if (!userEmail) {
            console.log("No user email found in session.");
            return res.redirect('/verify-forgot-otp');
        }

        
        let digits = '0123456789';
        let newOtp = '';
        for (let i = 0; i < 6; i++) {
            newOtp += digits[Math.floor(Math.random() * digits.length)];
        }
        console.log(`Generated new OTP: ${newOtp}`);

       
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.APP_PASS_KEY,
            },
        });

        
        let mailOptions = {
            from: process.env.EMAIL,
            to: userEmail,
            subject: 'Your New OTP Code',
            text: `Your new OTP code is ${newOtp}. It is valid for 5 minutes.`,
        };

        
        await transporter.sendMail(mailOptions);
        console.log('New OTP email sent to:', userEmail);

       
        const exprTime = new Date(Date.now() + 5 * 60 * 1000); 

   
        await OTP.findOneAndUpdate(
            { email: userEmail },
            { otp: newOtp, exprTime: exprTime },
            { upsert: true, new: true } 
        );
        console.log("OTP updated in the database successfully.");

        
        res.redirect('/verify-forgot-otp');
    } catch (error) {
        console.error(`Error during OTP resend: ${error}`);
        res.redirect('/verify-forgot-otp');
    }
};


exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
        if (err) return next(err);

        try {
            let existingUser = await User.findOne({ googleId: user.googleId });
            if (!existingUser) {
                const email = user.email;
                existingUser = await User.findOne({ email });

                if (existingUser) {
                    if (!existingUser.googleId) {
                        existingUser.googleId = user.googleId;
                        await existingUser.save();
                    } else {
                        return res.status(400).send('This email is already associated with another Google account.');
                    }
                } else {
                    const hashedPassword = await bcrypt.hash(STATIC_PASSWORD, 10);
                    existingUser = new User({
                        googleId: user.googleId,
                        email,
                        password: hashedPassword,
                    });
                    await existingUser.save();
                }
            }

            req.session.userId = existingUser._id;
            req.session.isLoggedIn = true;

            res.redirect('/');
        } catch (err) {
            console.error("Error in Google OAuth callback:", err);
            res.status(500).send("Internal Server Error");
        }
    })(req, res, next);
};



exports.logout = async (req,res)=>{
    req.session.destroy(err =>{
        if(err){
            console.error('Error destroying session:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    })
}



