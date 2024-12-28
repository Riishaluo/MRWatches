
const Order = require('../model/orderModel');
const Address = require('../model/addressModel');
const Cart = require('../model/cartModel');
const Product = require("../model/productModel")
const Razorpay = require("razorpay")
const crypto  = require("crypto")
const ITEMS_PER_PAGE = 5;
const Coupon = require("../model/couponModel")
const Wallet = require("../model/walletModel")
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


exports.placeOrder = async (req, res) => {
    const userId = req.session.userId;

    const cart = await Cart.findOne({ user: userId }).populate("products.product");
    if (!cart) {
        return res.status(404).json({ message: "Cart is not found" });
    }

    const { selectedAddressId, paymentMethod, name, street, city, state, zip, phone, paymentStatus, orderId } = req.body;
    const finalOrderId = orderId ||`order-${Date.now()}`
    const address = selectedAddressId !== 'custom' ? await Address.findById(selectedAddressId) : null;

    if (!selectedAddressId || (selectedAddressId !== 'custom' && !address)) {
        return res.status(400).json({ message: 'Address is required to place the order' });
    }

    let totalPrice = cart.products.reduce((total, item) => {
        return total + ((item.price * item.quantity)); 
    }, 0);

    if (paymentMethod === "cash_on_delivery" && totalPrice < 1000) {
        return res.status(400).json({ message: 'Cash On Delivery is not applicable under ₹1000' });
    }

    let customAddress = {};
    if (selectedAddressId === 'custom') {
        customAddress = { name, street, city, state, zip, phone };
    }

    if (!address && selectedAddressId !== 'custom') {
        return res.status(400).send("No address is found");
    }

    const finalAddress = selectedAddressId === 'custom' ? customAddress : address;

    for (const item of cart.products) {
        const product = item.product;
        const orderQuantity = item.quantity;

        if (product.stock < orderQuantity) {
            return res.status(404).json({ message: "Insufficient Stock for this product" });
        }
    }

    for (const item of cart.products) {
        const product = item.product;
        product.stock -= item.quantity;
        await product.save();
    }

    let coupon = null;
    let couponApplied = false;
    const couponCode = req.session.couponCode || null;

    if (couponCode) {
        coupon = await Coupon.findOne({ code: couponCode });

        if (coupon && !coupon.used) {
            couponApplied = true;

            if (coupon.discountType === "percentage") {
                const discountAmount = (coupon.discountValue / 100) * totalPrice;
                totalPrice = Math.max(0, totalPrice - discountAmount);
            } else if (coupon.discountType === "fixed") {
                const discountAmount = coupon.discountValue;
                totalPrice = Math.max(0, totalPrice - discountAmount);
            }

            coupon.used = true;
            await coupon.save();
        }
    }
    
    const finalPaymentStatus = paymentStatus || 'pending'; 

    const order = new Order({
        userId,
        address: finalAddress,
        cartItems: cart.products.map(item => ({
            product: item.product._id,
            quantity: item.quantity
        })),
        paymentMethod,
        paymentStatus: finalPaymentStatus, 
        status: 'pending',
        orderId: finalOrderId,
        totalPrice,
        coupon: coupon ? coupon._id : null,
        couponApplied, 
        createdAt: new Date()
    });

    await order.save();

    await Cart.deleteMany({ user: userId });

    res.status(201).json({
        message: 'Order placed successfully',
        order,
    });
};



exports.getUserOrders = async (req, res) => {

    const currentPage = parseInt(req.query.page) || 1
    const totalOrders = await Order.countDocuments()
    const totalPages = Math.ceil(totalOrders/ITEMS_PER_PAGE)

    const userId = req.session.userId
    
    const orders = await Order.find({ userId }).populate("address").populate("cartItems.product").sort({ createdAt: -1 }).skip((currentPage -1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE)

    if (orders) {
        return res.render("user/orderList", { order: orders , currentPage,totalPages });
    }
}



exports.cancelOrder = async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).send("Order not found.");
        }

        if (order.status === "completed") {
            return res.status(400).json({ success: false, message: "The order is already delivered." });
        }

        if (order.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Order is already cancelled." });
        }

        if (order.status === "returned") {
            return res.status(400).json({ success: false, message: "Order can't be cancelled." });
        }

        order.cancelReason = reason;

        for (const item of order.cartItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.stock += item.quantity;
                await product.save();
            }
        }

        if (order.paymentMethod === "razorpay") {
            const wallet = await Wallet.findOne({ user: order.userId });

            if (!wallet) {
                const balance = order.totalPrice;
                const newWallet = new Wallet({
                    user: req.session.userId,
                    balance,
                    transaction: [{
                        amount: balance,
                        date: new Date(),
                        type: "debit"
                    }]
                });
                await newWallet.save();
            } else {
                const refundAmount = order.totalPrice || 0;
                wallet.balance += refundAmount;
                const transaction = {
                    amount: refundAmount,
                    date: new Date(),
                    type: "credit"
                };
                wallet.transaction.push(transaction);
                await wallet.save();
            }
        }

        order.status = 'cancelled';
        await order.save();

        res.status(200).json({ success: true, message: 'Order has been cancelled successfully.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};


exports.orderDetailed = async (req,res)=>{
    try{
       const  {orderId} = req.params
       const order = await Order.findById(orderId)
        .populate('userId')            
        .populate('cartItems.product') 
        .populate('coupon')
      

       if(!order){
        return res.status(404).json({message:"order not found"})
       }

       let couponDiscount = 0;
       if (order.coupon) {
           if (order.coupon.discountType === 'percentage') {
               couponDiscount = (order.coupon.discountValue / 100) * order.totalPrice;
           } else if (order.coupon.discountType === 'fixed') {
               couponDiscount = order.coupon.discountValue;
           }
       };        

       return res.render("user/orderDetailed",{order,couponDiscount})
    }catch(error){
        console.log(error)
        res.status(500).send('Server error');
    }
}


exports.returnOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Order is not eligible for return' });
        }

        order.returnRequested = true;
        order.cancelReason = reason;

        const updateStockPromises = order.cartItems.map(async (item) => {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.stock += item.quantity; 
                return product.save();
            }
        });
        await Promise.all(updateStockPromises); 
      
        await order.save();

        return res.status(200).json({ success: true, message: 'Order return initiated successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred while processing the return' });
    }
};




//razorpay
const razorpay = new Razorpay ({
    key_id : "rzp_test_ULiN3Z9C2M5zyq",
    key_secret : "XS57sRiXC907AyNP9sNdeqTS"
})


exports.createOrder = async (req, res) => {
    
    
    try {
        const { amount } = req.body;

        console.log(amount);
        
        const options = {
            amount:  amount * 100,
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`,  
        };

        const order = await razorpay.orders.create(options);
        console.log(order);
        
        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            order
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create Razorpay order' });
    }
};


exports.retryPayment = async (req, res) => {
    const { orderId } = req.body;
    console.log(orderId);
    try {
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.paymentStatus = 'success';
        await order.save();

        return res.json({ success: true, message: 'Payment status updated successfully.' });
    } catch (error) {
        console.error('Error updating payment status:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}



exports.downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate('cartItems.product');

        const genOrder = uuidv4();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (!order.cartItems || !Array.isArray(order.cartItems)) {
            return res.status(400).json({ success: false, message: 'No items found in the order' });
        }

        const doc = new PDFDocument();
        const fileName = `invoice_${orderId}.pdf`;
        const filePath = path.join(__dirname, `../invoices/${fileName}`);
        fs.mkdirSync(path.join(__dirname, '../invoices'), { recursive: true });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream)

        doc.fontSize(18).text('Invoice', { align: 'center' });
        doc.moveDown()

        
        doc.fontSize(12).text(`Order ID: ${genOrder}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
        doc.moveDown();

    
        doc.text(`Customer ID: ${order.userId}`);

        doc.moveDown();

              const tableTop = doc.y;
        const columnWidths = { index: 50, product: 200, quantity: 100, price: 100 };
        const columnSpacing = 10;

        doc.fontSize(12)
            .text('No.', 50, tableTop, { width: columnWidths.index, align: 'center' })
            .text('Product', 50 + columnWidths.index + columnSpacing, tableTop, { width: columnWidths.product })
            .text('Quantity', 50 + columnWidths.index + columnWidths.product + columnSpacing * 2, tableTop, { width: columnWidths.quantity, align: 'center' })
            .text('Price', 50 + columnWidths.index + columnWidths.product + columnWidths.quantity + columnSpacing * 3, tableTop, { width: columnWidths.price, align: 'right' });

      
        const headerBottom = tableTop + 20;
        doc.moveTo(50, tableTop - 5).lineTo(550, tableTop - 5).stroke();
        doc.moveTo(50, headerBottom).lineTo(550, headerBottom).stroke();

     
        let y = headerBottom + 10;
        order.cartItems.forEach((item, index) => {
            if (item.product) {
                doc.text(`${index + 1}`, 50, y, { width: columnWidths.index, align: 'center' })
                    .text(item.product.name, 50 + columnWidths.index + columnSpacing, y, { width: columnWidths.product })
                    .text(item.quantity, 50 + columnWidths.index + columnWidths.product + columnSpacing * 2, y, { width: columnWidths.quantity, align: 'center' })
                    .text(`Rs.${order.totalPrice}`, 50 + columnWidths.index + columnWidths.product + columnWidths.quantity + columnSpacing * 3, y, { width: columnWidths.price, align: 'right' });
                y += 20;
            } else {
                doc.text(`${index + 1}`, 50, y, { width: columnWidths.index, align: 'center' })
                    .text('Product data not available', 50 + columnWidths.index + columnSpacing, y, { width: columnWidths.product });
                y += 20;
            }
        });

  
        doc.moveTo(50, y).lineTo(550, y).stroke();

        y += 10;
        doc.text(`Total Amount: Rs.${order.totalPrice}`, 50, y, { align: 'right' });
        doc.moveDown();

        doc.text('Thank you for shopping with us!', { align: 'center', lineGap: 10 });

        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Error downloading invoice:', err);
                    res.status(500).json({ success: false, message: 'Error downloading invoice' });
                }
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: 'Failed to generate invoice' });
    }
};




