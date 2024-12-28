const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const Product = require('../model/productModel');
const Order = require('../model/orderModel');
const moment = require('moment');

exports.adminloginpage = (req, res) => {
    if (req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { message: '' });
};

exports.adminLogin = (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.session.adminId = true;
        return res.redirect('/admin/dashboard');
    }
    return res.render('admin/login', { message: 'Invalid email or password.' });
};

exports.renderDashboard = async (req, res) => {
    try {
        const bestSellingProducts = await Order.aggregate([
            {
                $match: {
                    status: "completed"
                }
            },
            { $unwind: "$cartItems" },
            {
                $group: {
                    _id: "$cartItems.product",
                    totalSold: { $sum: "$cartItems.quantity" },
                    totalSales: { $sum: "$cartItems.totalPrice" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $match: { "productDetails.isListed": true } },
            { $sort: { totalSales: -1 } },
            { $limit: 5 },
            {
                $project: {
                    name: "$productDetails.name",
                    category: "$productDetails.category",
                    totalSold: 1,
                    totalSales: 1,
                    price: "$productDetails.price"
                }
            }
        ]);

        const bestSellingCategories = await Order.aggregate([
            {
                $match: { status: "completed" }
            },
            {
                $unwind: "$cartItems"
            },
            {
                $lookup: {
                    from: "products",
                    localField: "cartItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                },
            },
            {
                $unwind: "$productInfo"
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "productInfo.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                },
            },
            {
                $unwind: "$categoryInfo"
            },
            {
                $group: {
                    _id: "$categoryInfo._id",
                    name: { $first: "$categoryInfo.name" },
                    totalSold: { $sum: "$cartItems.quantity" },
                },
            },
            {
                $sort: { totalSold: -1 }
            },
            {
                $limit: 5
            }
        ]);



        res.render('admin/dashboard', {
            bestSellingProducts,
            bestSellingCategories,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};



exports.fetchSalesData = async (req, res) => {
    try {
        const { filter } = req.body;

        let startDate, endDate;
        const now = moment();

        if (filter === 'weekly') {
            startDate = now.startOf('isoWeek').toDate();
            endDate = now.endOf('isoWeek').toDate();
        } else if (filter === 'monthly') {
            startDate = now.startOf('month').toDate();
            endDate = now.endOf('month').toDate();
        } else if (filter === 'yearly') {
            startDate = now.startOf('year').toDate();
            endDate = now.endOf('year').toDate();
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: "$totalPrice" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const bestSellingProducts = await Order.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: '$cartItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cartItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo._id',
                    name: { $first: '$productInfo.name' },
                    totalSold: { $sum: '$cartItems.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        const bestSellingCategories = await Order.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: '$cartItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cartItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    name: { $first: '$categoryInfo.name' },
                    totalSold: { $sum: '$cartItems.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);


        res.json({
            salesData,
            bestSellingProducts,
            bestSellingCategories
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).send('Server Error');
    }
};