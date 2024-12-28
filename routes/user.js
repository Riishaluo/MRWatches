const express = require('express');
const router = express.Router();
const userController = require('../controller/userController'); 
const userProductController = require("../controller/userProductController");
const myAccountController = require("../controller/myAccountController")
const cartController = require("../controller/cartController")
const checkoutController = require("../controller/checkoutController")
const orderController = require("../controller/orderController")
const userAuth = require('../middleware/userAuth');
const { checkBlockedUser } = require('../middleware/blockedUser');
const wishlistController = require("../controller/wishlistController")
const couponController = require("../controller/userCouponController")
const walletController = require("../controller/walletController")

// Render the login page
router.get('/login',userAuth.isLogin,userController.renderLoginPage);

router.post('/login', userController.loginUser);

// My Account page
router.get('/my-account', userAuth.checkSession, userController.myAccount);

// Render the registration page
router.get('/register',userController.renderRegisterPage); 

// user home page 
router.get('/', userController.userHome); 

// Render OTP verification page
router.get('/otp', userController.renderOtp);

// Handle user signup 
router.post('/signup', userController.signupUser);

// Resend OTP
router.get('/resend-otp', userController.resendOtp);

// Handle OTP verification
router.post('/verify-otp', userController.verifyOtp); 

// UserProduct
router.get('/allWatches',userProductController.renderAllWatches);

// Route to fetch product details
router.get('/product/:id',checkBlockedUser,userProductController.renderProductDetails);
router.get('/category/:categoryName', userProductController.renderCategoryPage);


//forgotpasss

router.get("/forgot-password",userController.renderForgotPassword)
router.post("/send-otp",userController.sendOtp)
router.get("/verify-forgot-otp",userController.forgetPage)
router.post("/verify-forgot-otp",userController.verifyForgotOtp)
router.get("/reset-password",userController.renderResetPassword)
router.post('/reset-password', userController.resetPassword);   
router.get('/resendForgot-otp', userController.resendForgotOtp);


//myAccount page
router.get('/my-account/details',checkBlockedUser, myAccountController.myAccountDetails);


//address
router.get('/my-address',checkBlockedUser,userAuth.checkSession,myAccountController.renderMyAddress);
router.post('/add-address', myAccountController.addAddress);
router.post('/edit-address', myAccountController.updateAddress);
router.post('/delete-address', myAccountController.deleteAddress);

//cart 
router.get("/cart",checkBlockedUser,cartController.renderCart)
router.post('/add-to-cart',cartController.addToCart);
router.post('/remove-item', cartController.removeItem);
router.post('/update-quantity', cartController.updateQuantity);

//renderCheckout
router.get("/checkout",checkBlockedUser,checkoutController.renderCheckout)
router.post("/place-order",checkBlockedUser,orderController.placeOrder)

// order
router.get('/my-orders',checkBlockedUser,orderController.getUserOrders);
router.post("/cancel-order/:orderId",orderController.cancelOrder)
router.get("/orderDetailed/:orderId",orderController.orderDetailed)
router.post('/returnOrder',orderController.returnOrder);
router.post('/create-order', orderController.createOrder);
// router.post('/verify-payment', orderController.verifyPayment);
router.post('/retry-payment', orderController.retryPayment);
router.get('/download-invoice/:orderId', orderController.downloadInvoice);  

//wishlist
router.get("/wishlist",wishlistController.wishlistRender)
router.post("/addToWishlist",wishlistController.addToWishlist)
router.post("/removeWishlist",wishlistController.removeWishlist)


//coupon 

router.post("/apply-coupon",couponController.applyCoupon)
router.post("/remove-coupon",couponController.removeCoupon)


//wallet 
router.get("/my-wallet",walletController.renderWallet)

module.exports = router;



